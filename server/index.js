const { UDPServer } = require('dns2');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const admin = require('firebase-admin');
const DNSFilter = require('./filter');

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
    admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
    console.log('[Firestore] Connected via service account');
  } else {
    admin.initializeApp();
    console.log('[Firestore] Connected via default credentials (Cloud Run)');
  }
  db = admin.firestore();
} catch (err) {
  console.log('[Firestore] Initialization skipped:', err.message);
}

// ── DNS filter (single instance) ──
const dnsFilter = new DNSFilter(db, { upstreamDns: UPSTREAM_DNS, upstreamDns2: UPSTREAM_DNS_2 });

// ── UDP DNS Server (only on non-Cloud Run / non-Render environments) ──
if (!process.env.RENDER) {
  try {
    const dnsServer = new UDPServer({
      handle: async (request, send) => {
        const question = request.questions[0];
        if (!question) return send({ rcode: 1 });

        const domain = question.name;
        const type = question.type;
        const clientIp = request.address?.address || 'unknown';

        // Extract uid from a subdomain: <uid>.dns.toran
        let uid = null;
        const parts = domain.split('.');
        if (parts.length > 3 && parts[parts.length - 3] === 'dns' && parts[parts.length - 2] === 'toran') {
          const candidate = parts[0];
          // Validate Firebase UID format: 28 alphanumeric chars, hyphens, underscores
          if (/^[a-zA-Z0-9_-]{20,}$/.test(candidate)) {
            uid = candidate;
          }
        }

        const { blocked, response } = await dnsFilter.getFilteredResponse(uid, domain, type, clientIp);

        if (blocked) {
          return send({
            id: request.id,
            questions: request.questions,
            answers: [],
            rcode: 3,
          });
        }

        send({
          id: request.id,
          questions: response.questions || request.questions,
          answers: response.answers || [],
          rcode: response.rcode ?? 0,
        });
      },
      port: PORT,
    });

    dnsServer.listen(PORT, () => {
      console.log(`[DNS] UDP server listening on port ${PORT}`);
    });
  } catch (err) {
    console.log('[DNS] UDP server skipped:', err.message);
  }
}

// ── DoH (DNS over HTTPS) Server ──
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure) {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Simple rate limiting (in-memory, per-IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return next();
  }

  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
});

// CORS — restrict to known origins
const ALLOWED_ORIGINS = [
  'https://torandns.firebaseapp.com',
  'https://toran-dns.web.app',
  'http://localhost:3000',
  'http://localhost:5000',
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
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
    const { blocked, response, cacheHit } = await dnsFilter.getFilteredResponse(uid, domain, type, clientIp);

    if (blocked) {
      return res.json({
        Status: 3,
        TC: false, RD: true, RA: true, AD: false, CD: false,
        Question: [{ name: domain, type: parseInt(type) || 1 }],
        Answer: [],
      });
    }

    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');

    res.json({
      Status: response.rcode ?? 0,
      TC: false, RD: true, RA: true, AD: false, CD: false,
      Question: response.questions || [{ name: domain, type: parseInt(type) || 1 }],
      Answer: (response.answers || []).map(a => ({
        name: a.name, type: a.type, TTL: a.ttl || 300, data: a.address || a.data,
      })),
    });
  } catch (err) {
    console.error('[DoH] Error:', err.message);
    res.json({
      Status: 2, TC: false, RD: true, RA: true, AD: false, CD: false,
      Question: [], Answer: [],
    });
  }
}

// DoH endpoints
// Note: `/dns-query` (without a uid prefix) is the public no-account endpoint.
// All filtering is anonymous and uses default categories.
app.get('/dns-query', (req, res) => {
  handleDoH(req, res, null);
});

app.get('/:uid/dns-query', (req, res) => {
  handleDoH(req, res, req.params.uid);
});

// Query logs API
app.get('/api/queries', (req, res) => {
  const uid = req.query.uid;
  const limit = parseInt(req.query.limit) || 100;
  res.json(dnsFilter.getRecentQueries({ uid, limit }));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', queries: dnsFilter.queryLogs.length });
});

app.get('/server-info', (req, res) => {
  res.json({
    hostname: HOSTNAME,
    dohHostname: HOSTNAME, // Base hostname for DoH
    dohTlsHostname: HOSTNAME, // DoH over TLS — served via the same HTTPS port when USE_TLS is on
    ipv4: 'Not available on Render (Requires VPS)',
    upstream: UPSTREAM_DNS,
    upstream2: UPSTREAM_DNS_2,
    protocol: 'DoH (DNS-over-HTTPS)',
    notes: 'DoT is not supported on Render. Use DoH via apps that support custom DoH URLs (e.g. Intra, dnscrypt-proxy).',
  });
});

// ── Start DoH Server ──
if (USE_TLS) {
  // Generate self-signed cert for DoH-over-TLS on the dedicated port.
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

  const dohTlsServer = https.createServer({
    key: pems.private,
    cert: pems.cert,
  }, app);

  dohTlsServer.listen(DOT_PORT, () => {
    console.log(`[DoH-TLS] HTTPS server listening on port ${DOT_PORT}`);
  });
}

const dohServer = http.createServer(app);
dohServer.listen(DOH_PORT, () => {
  console.log(`[DoH] HTTP server listening on port ${DOH_PORT}`);
  console.log(`[DoH] Endpoint: http://localhost:${DOH_PORT}/dns-query`);
  console.log(`[DoH] User endpoint: http://localhost:${DOH_PORT}/:uid/dns-query`);
  console.log(`[API] Query logs: http://localhost:${DOH_PORT}/api/queries`);
  console.log(`[Upstream] Primary: ${UPSTREAM_DNS}, Secondary: ${UPSTREAM_DNS_2}`);
});

console.log('[Toran DNS] Server started successfully');
