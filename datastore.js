/*
 * Toran DNS Dashboard - Firestore DataStore
 * Core data layer with Firestore persistence + in-memory cache
 * Provides the same synchronous get/set API as the old localStorage version
 * while writing to Firestore in the background
 */

import { db } from './firebase.js';
import {
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

class DataStoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataStoreError';
  }
}

class DataStore {
  constructor() {
    this.subscribers = new Map();
    this._cache = {};
    this._uid = null;
    this._loaded = false;
    this._listeners = [];
    this._unsubFirestore = null;
  }

  setUid(uid) {
    this._uid = uid;
  }

  getUid() {
    return this._uid;
  }

  isLoaded() {
    return this._loaded;
  }

  // Load all user data from Firestore into memory cache
  async loadFromFirestore(uid) {
    if (!uid) throw new DataStoreError('Cannot load data without a user ID');
    this._uid = uid;
    this._cache = {};

    try {
      const kvRef = collection(db, 'users', uid, 'kv');
      const snapshot = await getDocs(kvRef);
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        this._cache[docSnap.id] = data.value !== undefined ? data.value : data;
      });
      this._loaded = true;
      this._notifySubscribers('__loaded', true);
    } catch (error) {
      console.error('DataStore.loadFromFirestore error:', error);
      this._loaded = true;
      this._notifySubscribers('__loaded', true);
    }
  }

  // Subscribe to real-time Firestore updates for user data
  subscribeToFirestore(uid, onChange) {
    if (!uid) return;
    const kvRef = collection(db, 'users', uid, 'kv');

    const unsubscribe = onSnapshot(kvRef, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const value = data.value !== undefined ? data.value : data;
          this._cache[change.doc.id] = value;
          this._notifySubscribers(change.doc.id, value);
        } else if (change.type === 'removed') {
          delete this._cache[change.doc.id];
          this._notifySubscribers(change.doc.id, null);
        }
      });
      if (onChange) onChange();
    }, error => {
      console.error('DataStore Firestore subscription error:', error);
    });

    this._unsubFirestore = unsubscribe;
    this._listeners.push(unsubscribe);
  }

  // Load recent queries from the queries subcollection into memory cache
  async loadQueries(uid) {
    if (!uid) return;
    try {
      const q = query(
        collection(db, 'users', uid, 'queries'),
        orderBy('time', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const queries = [];
      snapshot.forEach(docSnap => {
        queries.push({ id: docSnap.id, ...docSnap.data() });
      });
      this._cache['queries'] = queries;
      this._notifySubscribers('queries', queries);
      this._computeStats(queries);
    } catch (error) {
      console.error('DataStore.loadQueries error:', error);
    }
  }

  // Subscribe to real-time query updates
  subscribeQueries(uid) {
    if (!uid) return;
    try {
      const queriesRef = collection(db, 'users', uid, 'queries');
      const q = query(queriesRef, orderBy('time', 'desc'), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const queries = [];
        snapshot.forEach(docSnap => {
          queries.push({ id: docSnap.id, ...docSnap.data() });
        });
        this._cache['queries'] = queries;
        this._notifySubscribers('queries', queries);
        this._computeStats(queries);
      }, error => {
        console.error('DataStore query subscription error:', error);
      });
      this._listeners.push(unsubscribe);
    } catch (error) {
      console.error('DataStore.subscribeQueries error:', error);
    }
  }

  _computeStats(queries) {
    if (!queries || !queries.length) {
      const empty = {
        totalQueries: 0,
        blockedQueries: 0,
        allowedQueries: 0,
        blockRate: 0,
        dailyData: [],
        topCategories: [],
      };
      this._cache['stats'] = empty;
      this._cache['topDomainData'] = [];
      this._notifySubscribers('stats', empty);
      this._notifySubscribers('topDomainData', []);
      return;
    }

    const totalQueries = queries.length;
    const blockedQ = queries.filter(q => q.blocked || q.status === 'blocked');
    const blockedQueries = blockedQ.length;
    const allowedQueries = totalQueries - blockedQueries;
    const blockRate = totalQueries > 0 ? blockedQueries / totalQueries : 0;

    // Daily data (last 7 days)
    const dayMap = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { date: key, allowed: 0, blocked: 0, day: d.toLocaleDateString('en', { weekday: 'short' }) };
    }
    queries.forEach(q => {
      const date = (q.time || '').slice(0, 10);
      if (dayMap[date]) {
        if (q.blocked || q.status === 'blocked') dayMap[date].blocked++;
        else dayMap[date].allowed++;
      }
    });
    const dailyData = Object.values(dayMap);

    // Top categories (from blocked queries)
    const catMap = {};
    blockedQ.forEach(q => {
      const cat = q.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const totalBlocked = blockedQ.length;
    const topCategories = Object.entries(catMap)
      .map(([category, count]) => ({ category, count, percentage: totalBlocked > 0 ? (count / totalBlocked) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top domains
    const domainCount = {};
    queries.forEach(q => {
      const d = q.domain || 'unknown';
      domainCount[d] = (domainCount[d] || 0) + 1;
    });
    const topDomainData = Object.entries(domainCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const stats = { totalQueries, blockedQueries, allowedQueries, blockRate, dailyData, topCategories };
    this._cache['stats'] = stats;
    this._cache['topDomainData'] = topDomainData;
    this._notifySubscribers('stats', stats);
    this._notifySubscribers('topDomainData', topDomainData);
  }

  // Core API — synchronous reads from cache
  get(key) {
    if (!key) return null;
    return this._cache[key] !== undefined ? this._cache[key] : null;
  }

  // Core API — write to cache + Firestore in background
  set(key, value) {
    if (!key) throw new DataStoreError('Key cannot be empty');

    this._cache[key] = value;
    this._notifySubscribers(key, value);

    if (this._uid) {
      const docRef = doc(db, 'users', this._uid, 'kv', key);
      setDoc(docRef, { value }).catch(error => {
        console.error(`DataStore.set error for key '${key}':`, error);
      });
    }
  }

  subscribe(key, callback) {
    if (!key || typeof callback !== 'function') return;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    const currentValue = this.get(key);
    if (currentValue !== null) {
      callback(currentValue);
    }
    return () => this.unsubscribe(key, callback);
  }

  unsubscribe(key, callback) {
    if (!key || !callback || !this.subscribers.has(key)) return;
    const callbacks = this.subscribers.get(key);
    if (callbacks.has(callback)) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(key);
      }
    }
  }

  batchSet(items) {
    if (!Array.isArray(items)) throw new DataStoreError('Items must be an array');
    const results = {};
    items.forEach(({ key, value }) => {
      try {
        this.set(key, value);
        results[key] = value;
      } catch (error) {
        console.error(`DataStore.batchSet error for key '${key}':`, error);
      }
    });
    return results;
  }

  clear() {
    this._cache = {};
    this.subscribers.clear();
    this._loaded = false;
  }

  clearKey(key) {
    if (!key) return;
    delete this._cache[key];
    this._notifySubscribers(key, null);

    if (this._uid) {
      const docRef = doc(db, 'users', this._uid, 'kv', key);
      deleteDoc(docRef).catch(error => {
        console.error(`DataStore.clearKey error for key '${key}':`, error);
      });
    }
  }

  has(key) {
    return this._cache[key] !== undefined;
  }

  getAllKeys() {
    return Object.keys(this._cache);
  }

  // Cleanup Firestore subscriptions
  destroy() {
    this._listeners.forEach(unsub => unsub());
    this._listeners = [];
    this._unsubFirestore = null;
    this.clear();
    this._uid = null;
    this._loaded = false;
  }

  _notifySubscribers(key, value) {
    if (!this.subscribers.has(key)) return;
    const callbacks = this.subscribers.get(key);
    callbacks.forEach(callback => {
      try {
        callback(value);
      } catch (error) {
        console.error(`DataStore subscriber error for key '${key}':`, error);
      }
    });
  }
}

const store = new DataStore();

export default store;
