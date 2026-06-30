const { FieldValue } = require('@google-cloud/firestore');

class DNSFilter {
  constructor(db) {
    this.db = db;
    this.blocklists = new Map();  // uid -> Set of domains
    this.allowlists = new Map();  // uid -> Set of domains
    this.profiles = new Map();    // uid -> profile config
    this.defaultBlocked = new Set();
    this.loadBuiltInLists();
  }

  loadBuiltInLists() {
    const ads = [
      'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
      'adnxs.com', 'adsrvr.org', 'advertising.com', 'tribalfusion.com',
      'media.net', 'amazon-adsystem.com', 'criteo.com', 'criteo.net',
      'taboola.com', 'outbrain.com', 'moatads.com', 'quantserve.com',
      'scorecardresearch.com', 'bluekai.com', 'brightroll.com',
      'casalemedia.com', 'demdex.net', 'dotomi.com', 'doubleverify.com',
      'eyeota.net', 'indexww.com', 'liadm.com', 'lijit.com',
      'mathtag.com', 'media6degrees.com', 'moat.com', 'ns1p.net',
      'permutive.com', 'pubmatic.com', 'rubiconproject.com', 'sharethrough.com',
      'simpli.fi', 'smartadserver.com', 'spotxchange.com', 'stackadapt.com',
      'tidaltv.com', 'turn.com', 'undertone.com', 'vidible.tv', 'yieldmo.com',
    ];

    const trackers = [
      'facebook.com/tr', 'facebook.net/tr', 'analytics.google.com',
      'googletagmanager.com', 'hotjar.com', 'segment.io', 'amplitude.com',
      'heap.io', 'pendo.io', 'fullstory.com', 'mouseflow.com', 'crazyegg.com',
      'optimizely.com', 'vwo.com', 'kissmetrics.com', 'intercom.io',
      'drift.com', 'hubspot.com', 'clearbit.com', 'bombora.com',
    ];

    const malware = [
      'malware.com', 'phishing.com', 'ransomware.com', 'botnet.com',
      'cryptominer.com', 'keylogger.com', 'spyware.com', 'adware.com',
    ];

    [...ads, ...trackers, ...malware].forEach(d => this.defaultBlocked.add(d));
  }

  async loadUserLists(uid) {
    if (!this.db || !uid) return;

    try {
      const profileDoc = await this.db.collection('users').doc(uid).collection('kv').doc('profiles').get();
      if (profileDoc.exists) {
        const profiles = profileDoc.data().value || [];
        const active = profiles.find(p => p.isActive) || profiles[0];
        if (active) {
          this.profiles.set(uid, active);
        }
      }
    } catch (err) {
      console.error('[Filter] Failed to load profiles for', uid, err.message);
    }

    try {
      const blocklistDoc = await this.db.collection('users').doc(uid).collection('kv').doc('blocklist').get();
      if (blocklistDoc.exists) {
        const domains = blocklistDoc.data().value || [];
        this.blocklists.set(uid, new Set(domains.map(d => d.toLowerCase())));
      }
    } catch (err) {
      console.error('[Filter] Failed to load blocklist for', uid, err.message);
    }

    try {
      const allowlistDoc = await this.db.collection('users').doc(uid).collection('kv').doc('allowlist').get();
      if (allowlistDoc.exists) {
        const domains = allowlistDoc.data().value || [];
        this.allowlists.set(uid, new Set(domains.map(d => d.toLowerCase())));
      }
    } catch (err) {
      console.error('[Filter] Failed to load allowlist for', uid, err.message);
    }
  }

  shouldBlock(uid, domain) {
    const normalized = domain.toLowerCase().replace(/\.$/, '');
    
    // Check allowlist first (highest priority)
    if (this.allowlists.has(uid) && this.allowlists.get(uid).has(normalized)) {
      return false;
    }
    
    // Check user's custom blocklist
    if (this.blocklists.has(uid) && this.blocklists.get(uid).has(normalized)) {
      return true;
    }
    
    // Check built-in blocklist
    if (this.defaultBlocked.has(normalized)) {
      return true;
    }
    
    // Check subdomain matches
    const parts = normalized.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(i).join('.');
      if (this.defaultBlocked.has(parent)) return true;
      if (this.blocklists.has(uid) && this.blocklists.get(uid).has(parent)) return true;
    }
    
    return false;
  }

  categorize(domain) {
    const normalized = domain.toLowerCase();
    if (this.defaultBlocked.has(normalized)) {
      if (normalized.includes('ad') || normalized.includes('ads') || 
          normalized.includes('doubleclick') || normalized.includes('adservice')) {
        return 'Ads';
      }
      if (normalized.includes('analytic') || normalized.includes('track') || 
          normalized.includes('metric') || normalized.includes('pixel')) {
        return 'Tracker';
      }
      if (normalized.includes('malware') || normalized.includes('phishing') || 
          normalized.includes('virus') || normalized.includes('botnet')) {
        return 'Malware';
      }
    }
    return 'Other';
  }

  async logQuery(entry) {
    if (!this.db || !entry.uid) return;
    
    try {
      await this.db.collection('users').doc(entry.uid).collection('queries').add({
        ...entry,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[Filter] Failed to log query:', err.message);
    }
  }
}

module.exports = DNSFilter;
