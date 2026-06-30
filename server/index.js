const { DNSServer, DNSRequest } = require('dns2');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');
const { FieldValue } = require('firebase-admin').firestore;

const admin = require('firebase-admin');

// ── Config ──
const PORT = parseInt(process.env.PORT || '3000');
const DOH_PORT = PORT;
const DOT_PORT = parseInt(process.env.DOT_PORT || '853');
const UPSTREAM_DNS = process.env.UPSTREAM_DNS || '1.1.1.1';
const UPSTREAM_DNS_2 = process.env.UPSTREAM_DNS_2 || '8.8.8.8';
const HOSTNAME = process.env.HOSTNAME || 'dns.toran.app';
const USE_TLS = process.env.USE_TLS === 'true';

// ── Firestore ──
let db = null;
try {
  const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    admin.initializeApp({ credential: admin.cert(require(keyPath)) });
    console.log('[Firestore] Connected via service account');
  } else {
    admin.initializeApp();
    console.log('[Firestore] Connected via default credentials (Cloud Run)');
  }
  db = admin.firestore();
} catch (err) {
  console.log('[Firestore] Initialization skipped:', err.message);
}

// ── In-memory caches ──
const blocklists = new Map();  // uid -> Set of domains
const allowlists = new Map();  // uid -> Set of domains
const profiles = new Map();    // uid -> profile data
const queryLogs = [];          // recent queries (ring buffer)
const MAX_LOG_SIZE = 10000;

// ── Load built-in blocklists ──
const BUILTIN_BLOCKLISTS = {
  ads: [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adnxs.com', 'adsrvr.org', 'advertising.com', 'tribalfusion.com',
    'media.net', 'amazon-adsystem.com', 'criteo.com', 'criteo.net',
    'taboola.com', 'outbrain.com', 'moatads.com', 'quantserve.com',
    'scorecardresearch.com', 'bluekai.com', 'brightroll.com',
    'casalemedia.com', 'demdex.net', 'dotomi.com', 'doubleverify.com',
    'eyeota.net', 'indexww.com', 'liadm.com', 'lijit.com',
    'mathtag.com', 'media6degrees.com', 'mixpanel.com', 'moat.com',
    'ns1p.net', 'permutive.com', 'pubmatic.com', 'rubiconproject.com',
    'sharethrough.com', 'simpli.fi', 'smartadserver.com', 'spotxchange.com',
    'stackadapt.com', 'tidaltv.com', 'tripadvisor.com', 'turn.com',
    'undertone.com', 'vidible.tv', 'yieldmo.com', 'zergnet.com',
  ],
  trackers: [
    'facebook.com/tr', 'facebook.net/tr', 'analytics.google.com',
    'googletagmanager.com', 'hotjar.com', 'mixpanel.com', 'segment.io',
    'amplitude.com', 'heap.io', 'pendo.io', 'fullstory.com',
    'hotjar.com', 'mouseflow.com', 'crazyegg.com', 'luckyorange.com',
    'optimizely.com', 'vwo.com', 'abtasty.com', 'convert.com',
    'kissmetrics.com', 'intercom.io', 'drift.com', 'hubspot.com',
    'salesloft.com', 'outreach.io', 'apollo.io', 'clearbit.com',
    'bombora.com', 'demandbase.com', '6sense.com', 'terminus.io',
  ],
  malware: [
    'malware.com', 'phishing.com', 'ransomware.com', 'botnet.com',
    'cryptominer.com', 'keylogger.com', 'spyware.com', 'adware.com',
    'trojan.com', 'virus.com', 'worm.com', 'rootkit.com',
  ],
};

// Build initial blocklist from built-in lists
const defaultBlocked = new Set();
Object.values(BUILTIN_BLOCKLISTS).forEach(list => {
  list.forEach(domain => defaultBlocked.add(domain));
});

// ── Load per-user blocklists/allowlists from Firestore ──
async function loadUserLists(uid) {
  if (!db || !uid) return;
  try {
    const blocklistSnap = await db.collection('users').doc(uid).collection('kv').doc('blocklist').get();
    if (blocklistSnap.exists) {
      const domains = blocklistSnap.data().value || [];
      blocklists.set(uid, new Set(domains.map(d => d.toLowerCase())));
    }
  } catch (err) {
    console.error(`[Server] Failed to load blocklist for ${uid}:`, err.message);
  }
  try {
    const allowlistSnap = await db.collection('users').doc(uid).collection('kv').doc('allowlist').get();
    if (allowlistSnap.exists) {
      const domains = allowlistSnap.data().value || [];
      allowlists.set(uid, new Set(domains.map(d => d.toLowerCase())));
    }
  } catch (err) {
    console.error(`[Server] Failed to load allowlist for ${uid}:`, err.message);
  }
}

// ── DNS Query Handler ──
async function handleDNSQuery(uid, domain, type, clientIp) {
  const normalizedDomain = domain.toLowerCase().replace(/\.$/, '');
  
  // Load user-specific lists on first query for this UID
  if (uid && (!blocklists.has(uid) || !allowlists.has(uid))) {
    await loadUserLists(uid);
  }
  
  const isBlocked = defaultBlocked.has(normalizedDomain) || 
                    (blocklists.has(uid) && blocklists.get(uid).has(normalizedDomain)) ||
                    isSubdomainBlocked(normalizedDomain, defaultBlocked) ||
                    (blocklists.has(uid) && isSubdomainBlocked(normalizedDomain, blocklists.get(uid)));
  const isAllowed = (allowlists.has(uid) && allowlists.get(uid).has(normalizedDomain)) ||
                    isSubdomainAllowed(normalizedDomain, allowlists.get(uid));
  
  const finalBlocked = isBlocked && !isAllowed;
  const status = finalBlocked ? 'blocked' : 'allowed';
  const category = categorizeDomain(normalizedDomain);
  
  // Log query
  const queryLog = {
    domain: normalizedDomain,
    type: type,
    status: status,
    category: category,
    clientIp: clientIp,
    device: identifyDevice(clientIp, uid),
    time: new Date().toISOString(),
    uid: uid,
  };
  
  logQuery(queryLog);
  
  if (db && uid) {
    try {
      await db.collection('users').doc(uid).collection('queries').add({
        ...queryLog,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[Firestore] Failed to log query:', err.message);
    }
  }
  
  return finalBlocked;
}

function isSubdomainBlocked(domain, list) {
  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (list.has(parent)) return true;
  }
  return false;
}

function isSubdomainAllowed(domain, list) {
  if (!list) return false;
  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (list.has(parent)) return true;
  }
  return false;
}

function categorizeDomain(domain) {
  if (BUILTIN_BLOCKLISTS.ads.some(d => domain.includes(d))) return 'Ads';
  if (BUILTIN_BLOCKLISTS.trackers.some(d => domain.includes(d))) return 'Tracker';
  if (BUILTIN_BLOCKLISTS.malware.some(d => domain.includes(d))) return 'Malware';
  return 'Other';
}

function identifyDevice(clientIp, uid) {
  return clientIp || 'Unknown';
}

function logQuery(entry) {
  queryLogs.push(entry);
  if (queryLogs.length > MAX_LOG_SIZE) {
    queryLogs.shift();
  }
}

// ── UDP DNS Server ──
const dnsServer = new DNSServer({
  handle: async (request, send) => {
    const question = request.questions[0];
    if (!question) return send({ rcode: 1 });
    
    const domain = question.name;
    const type = question.type;
    const clientIp = request.address?.address || 'unknown';
    
    // Extract uid from subdomain if present (e.g., ss29kx4a.dns.toran.app)
    let uid = null;
    const parts = domain.split('.');
    if (parts.length > 3 && parts[parts.length - 3] === 'dns' && parts[parts.length - 2] === 'toran') {
      uid = parts[0];
    }
    
    const blocked = await handleDNSQuery(uid, domain, type, clientIp);
    
    if (blocked) {
      // Return NXDOMAIN for blocked queries
      return send({
        id: request.id,
        questions: request.questions,
        answers: [],
        rcode: 3, // NXDOMAIN
      });
    }
    
    // Forward to upstream
    const upstream = new DNSRequest({
      name: domain,
      type: type,
    });
    
    try {
      const response = await upstream.send();
      send(response);
    } catch (err) {
      console.error('[DNS] Upstream error:', err.message);
      send({ rcode: 2 }); // SERVFAIL
    }
  },
  port: PORT,
});

dnsServer.listen(PORT, () => {
  console.log(`[DNS] UDP server listening on port ${PORT}`);
});

// ── DoH (DNS over HTTPS) Server ──
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Shared DoH handler
async function handleDoH(req, res, uid) {
  try {
    const domain = req.query.name || req.query.dn;
    const type = req.query.type || 'A';
    
    if (!domain) {
      return res.status(400).json({ error: 'Missing domain parameter' });
    }
    
    const clientIp = req.ip || req.connection.remoteAddress;
    const blocked = await handleDNSQuery(uid, domain, type, clientIp);
    
    if (blocked) {
      return res.json({
        Status: 3,
        TC: false, RD: true, RA: true, AD: false, CD: false,
        Question: [{ name: domain, type: parseInt(type) || 1 }],
        Answer: [],
      });
    }
    
    const request = new DNSRequest({ name: domain, type: parseInt(type) || 1 });
    const response = await request.send();
    
    res.json({
      Status: 0,
      TC: false, RD: true, RA: true, AD: response.ad || false, CD: false,
      Question: response.questions || [{ name: domain, type: parseInt(type) || 1 }],
      Answer: (response.answers || []).map(a => ({
        name: a.name, type: a.type, TTL: a.ttl || 300, data: a.address || a.data,
      })),
    });
  } catch (err) {
    console.error('[DoH] Error:', err.message);
    res.json({ Status: 2, TC: false, RD: true, RA: true, AD: false, CD: false, Question: [], Answer: [] });
  }
}

// DoH endpoints
app.get('/dns-query', (req, res) => {
  const pathParts = req.path.split('/');
  const uid = pathParts.length > 2 ? pathParts[1] : null;
  handleDoH(req, res, uid);
});

app.get('/:uid/dns-query', (req, res) => {
  handleDoH(req, res, req.params.uid);
});

// Query logs API
app.get('/api/queries', (req, res) => {
  const uid = req.query.uid;
  const limit = parseInt(req.query.limit) || 100;
  
  let logs = queryLogs;
  if (uid) {
    logs = logs.filter(q => q.uid === uid);
  }
  
  res.json(logs.slice(-limit).reverse());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', queries: queryLogs.length });
});

// ── Start DoH Server ──
if (USE_TLS) {
  // Generate self-signed cert for DoT
  const pems = selfsigned.generate([{ name: 'commonName', value: HOSTNAME }], {
    days: 365,
    algorithm: 'sha256',
    extensions: [
      { name: 'subjectAltName', altNames: [
        { type: 2, value: HOSTNAME },
        { type: 2, value: `*.${HOSTNAME}` },
      ]},
    ],
  });
  
  const dotServer = https.createServer({
    key: pems.private,
    cert: pems.cert,
  }, app);
  
  dotServer.listen(DOT_PORT, () => {
    console.log(`[DoT] TLS server listening on port ${DOT_PORT}`);
  });
}

const dohServer = http.createServer(app);
dohServer.listen(DOH_PORT, () => {
  console.log(`[DoH] HTTP server listening on port ${DOH_PORT}`);
  console.log(`[DoH] Endpoint: http://localhost:${DOH_PORT}/dns-query`);
  console.log(`[DoH] User endpoint: http://localhost:${DOH_PORT}/:uid/dns-query`);
  console.log(`[API] Query logs: http://localhost:${DOH_PORT}/api/queries`);
});

console.log('[Toran DNS] Server started successfully');
