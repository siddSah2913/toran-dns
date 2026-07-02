const { FieldValue } = require('@google-cloud/firestore');
const { UDPClient } = require('dns2');

// ── Built-in blocklist categories ──
// Each category has a list of domains. The category id matches the profile
// settings keys (e.g. "ads", "trackers", "malware").
const BUILTIN_BLOCKLISTS = {
  ads: [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adnxs.com', 'adsrvr.org', 'advertising.com', 'tribalfusion.com',
    'media.net', 'amazon-adsystem.com', 'criteo.com', 'criteo.net',
    'taboola.com', 'outbrain.com', 'moatads.com', 'quantserve.com',
    'scorecardresearch.com', 'bluekai.com', 'brightroll.com',
    'casalemedia.com', 'demdex.net', 'dotomi.com', 'doubleverify.com',
    'eyeota.net', 'indexww.com', 'liadm.com', 'lijit.com',
    'mathtag.com', 'media6degrees.com', 'moat.com',
    'ns1p.net', 'permutive.com', 'pubmatic.com', 'rubiconproject.com',
    'sharethrough.com', 'simpli.fi', 'smartadserver.com', 'spotxchange.com',
    'stackadapt.com', 'tidaltv.com', 'turn.com',
    'undertone.com', 'vidible.tv', 'yieldmo.com', 'zergnet.com',
  ],
  trackers: [
    'facebook.com/tr', 'facebook.net/tr', 'analytics.google.com',
    'googletagmanager.com', 'hotjar.com', 'segment.io',
    'amplitude.com', 'heap.io', 'pendo.io', 'fullstory.com',
    'mouseflow.com', 'crazyegg.com', 'luckyorange.com',
    'optimizely.com', 'vwo.com', 'abtasty.com', 'convert.com',
    'kissmetrics.com', 'intercom.io', 'drift.com', 'hubspot.com',
    'salesloft.com', 'outreach.io', 'apollo.io', 'clearbit.com',
    'bombora.com', 'demandbase.com', '6sense.com', 'terminus.io',
  ],
  malware: [
    'malware.com', 'ransomware.com', 'botnet.com',
    'cryptominer.com', 'keylogger.com', 'spyware.com', 'adware.com',
    'trojan.com', 'virus.com', 'worm.com', 'rootkit.com',
  ],
  phishing: [
    'phishing.com', 'paypal-secure.com', 'apple-id-verify.com',
    'amazon-security.com', 'netflix-billing.com', 'bankofamerica-secure.com',
    'wellsfargo-secure.com', 'chase-bank-secure.com', 'dropbox-secure.com',
    'microsoft-secure.com', 'google-verify.com', 'facebook-secure.com',
    'instagram-verify.com', 'twitter-secure.com', 'linkedin-secure.com',
    'dhl-tracking.com', 'fedex-secure.com', 'ups-package.com',
    'usps-delivery.com', 'dhl-parcel.com',
  ],
  scam: [
    'free-gift-cards.com', 'you-won.com', 'congratulations-prize.com',
    'claim-reward.com', 'lottery-winner.com', 'nigerian-prince.com',
    'wire-transfer.com', 'bitcoin-giveaway.com', 'crypto-giveaway.com',
    'tech-support-scam.com', 'microsoft-support.com', 'apple-support-scam.com',
    'virus-alert.com', 'computer-infected.com', 'system-error.com',
    'weight-loss-miracle.com', 'miracle-cure.com', 'buy-cheap-pills.com',
    'pharmacy-discount.com', 'viagra-cheap.com',
  ],
  spam: [
    'spam.com', 'bulk-mailer.com', 'mass-email.com', 'spam-email.com',
    'junk-mail.com', 'unsolicited.com', 'bulk-sms.com', 'spam-sms.com',
    'telemarketing.com', 'cold-call.com', 'robocall.com', 'spam-call.com',
    'email-harvest.com', 'mail-blast.com', 'newsletter-spam.com',
    'affiliate-spam.com', 'click-farm.com', 'fake-review.com',
    'review-spam.com', 'comment-spam.com',
  ],
  adult: [
    'pornhub.com', 'xvideos.com', 'xhamster.com', 'redtube.com',
    'youporn.com', 'tube8.com', 'spankbang.com', 'beeg.com',
    'brazzers.com', 'bangbros.com', 'realitykings.com', 'mofos.com',
    'digitalplayground.com', 'twistys.com', 'babenet.com', 'fleshlight.com',
    'livejasmin.com', 'chaturbate.com', 'stripchat.com', 'bongacams.com',
  ],
  gambling: [
    'draftkings.com', 'fanduel.com', 'betmgm.com', 'caesars.com',
    'wynnbet.com', 'barstool.com', 'pointsbet.com', 'betrivers.com',
    'unibet.com', 'paddypower.com', 'bet365.com', 'williamhill.com',
    'ladbrokes.com', 'coral.com', 'betfair.com', 'pokerstars.com',
    'partypoker.com', '888poker.com', 'fulltilt.com', 'ggpoker.com',
  ],
  social: [
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
    'tiktok.com', 'snapchat.com', 'linkedin.com', 'pinterest.com',
    'reddit.com', 'tumblr.com', 'quora.com', 'medium.com',
    'discord.com', 'telegram.org', 'whatsapp.com', 'signal.org',
    'youtube.com', 'twitch.tv', 'vimeo.com', 'dailymotion.com',
  ],
  ai: [
    'openai.com', 'chat.openai.com', 'api.openai.com',
    'anthropic.com', 'claude.ai', 'api.anthropic.com',
    'bard.google.com', 'gemini.google.com', 'aistudio.google.com',
    'copilot.microsoft.com', 'bing.com/chat', 'copilot.cloud.microsoft',
    'midjourney.com', 'stability.ai', 'dreamstudio.ai',
    'huggingface.co', 'replicate.com', 'cohere.ai',
    'perplexity.ai', 'you.com',
  ],
  crypto: [
    'cryptominer.com', 'coinhive.com', 'coin-hive.com',
    'cryptojacking.com', 'minero.cc', 'coinlab.com',
    'jsecoin.com', 'authedmine.com', 'ppoi.org',
    'browsermine.com', 'webminepool.com', 'coinimp.com',
    '2giga.link', 'minr.pw', 'jqcdn.com',
    'nero.sol', 'nero.fi', 'crypto-pool.fr',
  ],
  telemetry: [
    'telemetry.microsoft.com', 'vortex.data.microsoft.com',
    'settings-win.data.microsoft.com', 'watson.telemetry.microsoft.com',
    'reports.crashlytics.com', 'firebase-settings.analytics.google.com',
    'app-measurement.com', 'firebaselogging-pa.googleapis.com',
    'clients4.google.com', 'play.google.com/log',
    'dp.clva.gms-privacysandbox.com', 'stats.g.doubleclick.net',
    'sb.scorecardresearch.com', 'ad.doubleclick.net',
    'pagead2.googlesyndication.com', 'fundingchoicesmessages.google.com',
  ],
  newdomains: [
    'temp-mail.org', 'throwaway.email', 'guerrillamail.com',
    'mailinator.com', 'tempail.com', 'dispostable.com',
    '10minutemail.com', 'trashmail.com', 'yopmail.com',
    'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'disposable.email', 'temporaryemail.net', 'temp-mail.io',
    'fakeinbox.com', 'tempinbox.com', 'mohmal.com',
  ],
};

// Default enabled categories (when no profile is configured).
const DEFAULT_ENABLED_CATEGORIES = ['ads', 'trackers', 'malware', 'phishing', 'scam', 'crypto', 'telemetry'];

class DNSFilter {
  constructor(db, options = {}) {
    this.db = db;
    this.upstreamDns = options.upstreamDns || process.env.UPSTREAM_DNS || '1.1.1.1';
    this.upstreamDns2 = options.upstreamDns2 || process.env.UPSTREAM_DNS_2 || '8.8.8.8';

    // Per-user state
    this.blocklists = new Map();  // uid -> Set of domains
    this.allowlists = new Map();  // uid -> Set of domains
    this.profiles = new Map();    // uid -> active profile
    this.profileCategories = new Map(); // uid -> Set of enabled category ids

    // In-memory DNS response cache
    // key: `${domain}:${type}` (lowercased)
    // value: { response, expiresAt }
    this.cache = new Map();
    this.cacheMaxEntries = 10000;
    this.cacheDefaultTtl = 300; // seconds

    // Recent query log (ring buffer)
    this.queryLogs = [];
    this.maxLogSize = 10000;

    this._loadBuiltInLists();
  }

  _loadBuiltInLists() {
    this.builtinBlocklists = BUILTIN_BLOCKLISTS;
  }

  // ── Per-user data loading ──────────────────────────────────────────────

  async loadUserLists(uid) {
    if (!this.db || !uid) return;

    try {
      const profileDoc = await this.db
        .collection('users').doc(uid)
        .collection('kv').doc('profiles').get();
      if (profileDoc.exists) {
        const profiles = profileDoc.data().value || [];
        const active = profiles.find(p => p.isActive) || profiles[0];
        if (active) {
          this.profiles.set(uid, active);
          // Profile filtering rules can be stored as `active.rules` object
          // where each key is a category id and value is true (enabled).
          // Fall back to defaults if not set.
          if (active.rules && typeof active.rules === 'object') {
            this.profileCategories.set(
              uid,
              new Set(Object.entries(active.rules).filter(([, v]) => v).map(([k]) => k))
            );
          } else {
            this.profileCategories.set(uid, new Set(DEFAULT_ENABLED_CATEGORIES));
          }
        }
      } else {
        this.profileCategories.set(uid, new Set(DEFAULT_ENABLED_CATEGORIES));
      }
    } catch (err) {
      console.error('[Filter] Failed to load profiles for', uid, err.message);
    }

    try {
      const blocklistDoc = await this.db
        .collection('users').doc(uid)
        .collection('kv').doc('blocklist').get();
      if (blocklistDoc.exists) {
        const domains = blocklistDoc.data().value || [];
        this.blocklists.set(uid, new Set(domains.map(d => d.toLowerCase())));
      }
    } catch (err) {
      console.error('[Filter] Failed to load blocklist for', uid, err.message);
    }

    try {
      const allowlistDoc = await this.db
        .collection('users').doc(uid)
        .collection('kv').doc('allowlist').get();
      if (allowlistDoc.exists) {
        const domains = allowlistDoc.data().value || [];
        this.allowlists.set(uid, new Set(domains.map(d => d.toLowerCase())));
      }
    } catch (err) {
      console.error('[Filter] Failed to load allowlist for', uid, err.message);
    }
  }

  async ensureUserLoaded(uid) {
    if (!uid) return;
    if (!this.blocklists.has(uid) || !this.allowlists.has(uid)) {
      await this.loadUserLists(uid);
    }
  }

  // ── Filtering logic ───────────────────────────────────────────────────

  _isSubdomainMatch(domain, list) {
    if (!list) return false;
    const parts = domain.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(i).join('.');
      if (list.has(parent)) return true;
    }
    return false;
  }

  _categoryEnabled(uid, categoryId) {
    if (!uid) return DEFAULT_ENABLED_CATEGORIES.includes(categoryId);
    const set = this.profileCategories.get(uid);
    if (!set) return DEFAULT_ENABLED_CATEGORIES.includes(categoryId);
    return set.has(categoryId);
  }

  // Determine if a domain should be blocked.
  // Order: allowlist → user custom blocklist → built-in (per-category, profile-aware) → subdomain match.
  shouldBlock(uid, domain) {
    const normalized = domain.toLowerCase().replace(/\.$/, '');

    // 1) Allowlist always wins.
    if (uid && this.allowlists.has(uid) && this.allowlists.get(uid).has(normalized)) {
      return false;
    }
    if (this._isSubdomainMatch(normalized, uid ? this.allowlists.get(uid) : null)) {
      return false;
    }

    // 2) User custom blocklist (always active, profile-independent).
    if (uid && this.blocklists.has(uid) && this.blocklists.get(uid).has(normalized)) {
      return true;
    }
    if (this._isSubdomainMatch(normalized, uid ? this.blocklists.get(uid) : null)) {
      return true;
    }

    // 3) Built-in blocklists, gated by profile category toggles.
    for (const [categoryId, domains] of Object.entries(this.builtinBlocklists)) {
      if (!this._categoryEnabled(uid, categoryId)) continue;
      if (domains.includes(normalized)) return true;
      if (this._isSubdomainMatch(normalized, new Set(domains))) return true;
    }

    return false;
  }

  categorize(domain) {
    const normalized = domain.toLowerCase();
    const categoryLabels = {
      ads: 'Ads',
      trackers: 'Tracker',
      malware: 'Malware',
      phishing: 'Phishing',
      scam: 'Scam',
      spam: 'Spam',
      adult: 'Adult',
      gambling: 'Gambling',
      social: 'Social',
      ai: 'AI',
      crypto: 'Crypto',
      telemetry: 'Telemetry',
      newdomains: 'New Domain',
    };
    for (const [categoryId, domains] of Object.entries(this.builtinBlocklists)) {
      if (domains.includes(normalized)) {
        return categoryLabels[categoryId] || 'Other';
      }
    }
    return 'Other';
  }

  // ── In-memory cache ───────────────────────────────────────────────────

  _cacheKey(domain, type) {
    return `${String(domain).toLowerCase().replace(/\.$/, '')}:${type}`;
  }

  _cacheGet(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  _cacheSet(key, response, ttl) {
    if (this.cache.size >= this.cacheMaxEntries) {
      // Evict the oldest entry (Map preserves insertion order).
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    const safeTtl = Math.max(1, Math.min(ttl || this.cacheDefaultTtl, 86400));
    this.cache.set(key, {
      response,
      expiresAt: Date.now() + safeTtl * 1000,
    });
  }

  // ── Upstream query ────────────────────────────────────────────────────

  async _queryUpstream(domain, type) {
    const upstreams = [this.upstreamDns, this.upstreamDns2].filter(Boolean);
    let lastErr = null;
    for (const upstream of upstreams) {
      const client = UDPClient({ dns: upstream });
      try {
        const response = await client(domain, parseInt(type) || 1);
        return response;
      } catch (err) {
        lastErr = err;
        console.error(`[Filter] Upstream ${upstream} error:`, err.message);
      }
    }
    throw lastErr || new Error('No upstream available');
  }

  _computeTtl(response) {
    if (!response || !Array.isArray(response.answers) || response.answers.length === 0) {
      return this.cacheDefaultTtl;
    }
    const minTtl = response.answers.reduce((min, a) => {
      const t = a.ttl || this.cacheDefaultTtl;
      return Math.min(min, t);
    }, Number.POSITIVE_INFINITY);
    return Number.isFinite(minTtl) ? minTtl : this.cacheDefaultTtl;
  }

  // ── Logging ───────────────────────────────────────────────────────────

  _recordQuery(entry) {
    this.queryLogs.push(entry);
    if (this.queryLogs.length > this.maxLogSize) {
      this.queryLogs.shift();
    }
  }

  getRecentQueries({ uid, limit = 100 } = {}) {
    let logs = this.queryLogs;
    if (uid) logs = logs.filter(q => q.uid === uid);
    return logs.slice(-limit).reverse();
  }

  async _logToFirestore(entry) {
    if (!this.db || !entry.uid) return;
    try {
      await this.db
        .collection('users').doc(entry.uid)
        .collection('queries').add({
          ...entry,
          timestamp: FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.error('[Filter] Failed to log query:', err.message);
    }
  }

  // ── Public entry point ────────────────────────────────────────────────

  /**
   * Process a DNS query end-to-end: filter, cache, upstream, log.
   *
   * @param {string|null} uid   - User ID (null = anonymous, default categories).
   * @param {string} domain     - QNAME.
   * @param {number|string} type - QTYPE (default 1 / A).
   * @param {string} clientIp   - Optional client IP for logging.
   * @returns {{ blocked: boolean, response: object, category: string, cacheHit: boolean }}
   */
  async getFilteredResponse(uid, domain, type, clientIp) {
    await this.ensureUserLoaded(uid);

    const normalizedDomain = String(domain).toLowerCase().replace(/\.$/, '');
    const numericType = parseInt(type) || 1;
    const cacheKey = this._cacheKey(normalizedDomain, numericType);

    // 1) Filter first — always authoritative, never bypassed by cache.
    const blocked = this.shouldBlock(uid, normalizedDomain);
    const category = blocked ? this.categorize(normalizedDomain) : 'Other';

    if (blocked) {
      const entry = {
        domain: normalizedDomain,
        type: numericType,
        status: 'blocked',
        category,
        clientIp: clientIp || 'unknown',
        device: clientIp || 'unknown',
        time: new Date().toISOString(),
        uid: uid || null,
      };
      this._recordQuery(entry);
      this._logToFirestore(entry);
      return {
        blocked: true,
        category,
        cacheHit: false,
        response: {
          id: 0,
          questions: [{ name: normalizedDomain, type: numericType }],
          answers: [],
          rcode: 3, // NXDOMAIN — domain does not exist (blocked).
        },
      };
    }

    // 2) Cache check.
    const cached = this._cacheGet(cacheKey);
    if (cached) {
      const entry = {
        domain: normalizedDomain,
        type: numericType,
        status: 'allowed',
        category: 'Cached',
        clientIp: clientIp || 'unknown',
        device: clientIp || 'unknown',
        time: new Date().toISOString(),
        uid: uid || null,
        cacheHit: true,
      };
      this._recordQuery(entry);
      this._logToFirestore(entry);
      return { blocked: false, category: 'Cached', cacheHit: true, response: cached };
    }

    // 3) Upstream query.
    let upstream;
    try {
      upstream = await this._queryUpstream(normalizedDomain, numericType);
    } catch (err) {
      console.error('[Filter] Upstream failed:', err.message);
      const errorResponse = {
        id: 0,
        questions: [{ name: normalizedDomain, type: numericType }],
        answers: [],
        rcode: 2, // SERVFAIL
      };
      const entry = {
        domain: normalizedDomain,
        type: numericType,
        status: 'error',
        category: 'Other',
        clientIp: clientIp || 'unknown',
        device: clientIp || 'unknown',
        time: new Date().toISOString(),
        uid: uid || null,
      };
      this._recordQuery(entry);
      this._logToFirestore(entry);
      return { blocked: false, category: 'Other', cacheHit: false, response: errorResponse };
    }

    // 4) Cache and log.
    this._cacheSet(cacheKey, upstream, this._computeTtl(upstream));

    const entry = {
      domain: normalizedDomain,
      type: numericType,
      status: 'allowed',
      category: this.categorize(normalizedDomain),
      clientIp: clientIp || 'unknown',
      device: clientIp || 'unknown',
      time: new Date().toISOString(),
      uid: uid || null,
      cacheHit: false,
    };
    this._recordQuery(entry);
    this._logToFirestore(entry);

    return { blocked: false, category: entry.category, cacheHit: false, response: upstream };
  }
}

module.exports = DNSFilter;
module.exports.BUILTIN_BLOCKLISTS = BUILTIN_BLOCKLISTS;
module.exports.DEFAULT_ENABLED_CATEGORIES = DEFAULT_ENABLED_CATEGORIES;
