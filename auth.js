/*
 * Toran DNS Auth Module
 * Handles user authentication via Firebase Auth
 * and user profile data via Firestore
 */

import store from './datastore.js';
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import setupGuide from './setup-guide.js';

if (typeof window !== 'undefined') window.setupGuide = setupGuide;

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = new Set();
    this._readyResolve = null;
    this.ready = new Promise(resolve => { this._readyResolve = resolve; });
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      await signOut(auth);
      const error = new Error('Please verify your email before logging in. Check your inbox for the verification link.');
      error.code = 'auth/email-not-verified';
      throw error;
    }
    return user;
  }

  async signup(userData) {
    const { name, email, password } = userData;
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });
    await sendEmailVerification(user);

    const profileData = {
      id: user.uid,
      name: name,
      email: email,
      avatar: name.split(' ').map(n => n[0]).join(''),
      plan: 'free',
      preferences: { theme: 'light' },
      activity: { lastLogin: Date.now() },
      setupCompleted: false,
    };

    await setDoc(doc(db, 'users', user.uid, 'kv', 'user'), { value: profileData });

    return profileData;
  }

  async logout() {
    await signOut(auth);
    this.currentUser = null;
    store.destroy();
    this._notifyAuthListeners('logged_out');
  }

  async deleteAccount(password) {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Re-authenticate if needed (required by Firebase for sensitive operations)
    if (password) {
      const { EmailAuthProvider, reauthenticateWithCredential } = await import('https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js');
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth, user, credential);
    }

    // Delete all Firestore data for this user
    const kvRef = collection(db, 'users', user.uid, 'kv');
    const kvSnapshot = await getDocs(kvRef);
    const deletePromises = kvSnapshot.docs.map(d => deleteDoc(d.ref));

    const queriesRef = collection(db, 'users', user.uid, 'queries');
    const queriesSnapshot = await getDocs(queriesRef);
    queriesSnapshot.docs.forEach(d => deletePromises.push(deleteDoc(d.ref)));

    await Promise.all(deletePromises);

    // Delete the user document itself
    await deleteDoc(doc(db, 'users', user.uid));

    // Delete Firebase Auth user
    await user.delete();

    this.currentUser = null;
    store.destroy();
    this._notifyAuthListeners('account_deleted');
  }

  async resendVerification(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    await signOut(auth);
  }

  async loginWithProvider(ProviderClass, providerName) {
    const provider = new ProviderClass();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid, 'kv', 'user'));
    if (!userDoc.exists()) {
      const fallbackName = user.displayName || user.email?.split('@')[0] || 'User';
      const profileData = {
        id: user.uid,
        name: fallbackName,
        email: user.email,
        avatar: fallbackName.split(' ').map(n => n[0]).join('').toUpperCase(),
        plan: 'free',
        preferences: { theme: 'light' },
        activity: { lastLogin: Date.now() },
        setupCompleted: false,
        provider: providerName,
      };
      await setDoc(doc(db, 'users', user.uid, 'kv', 'user'), { value: profileData });
    } else {
      const existing = userDoc.data().value || {};
      existing.activity = existing.activity || {};
      existing.activity.lastLogin = Date.now();
      await setDoc(doc(db, 'users', user.uid, 'kv', 'user'), { value: existing });
    }
    
    return user;
  }

  async loginWithGoogle() {
    return this.loginWithProvider(GoogleAuthProvider, 'google');
  }

  async loginWithGitHub() {
    return this.loginWithProvider(GithubAuthProvider, 'github');
  }

  isAuthenticated() {
    return !!(auth.currentUser);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  subscribe(callback) {
    this.authListeners.add(callback);
    if (this.isAuthenticated() && this.currentUser) {
      callback(this.currentUser);
    }
    return () => {
      this.authListeners.delete(callback);
    };
  }

  isSetupCompleted() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.setupCompleted === true;
  }

  async markSetupCompleted() {
    const user = this.getCurrentUser();
    if (!user) return;
    user.setupCompleted = true;
    user.setupCompletedAt = new Date().toISOString();
    store.set('user', user);
  }

  getUserStats() {
    const user = this.getCurrentUser();
    if (!user) return null;
    const queries = store.get('queries') || [];
    const devices = store.get('devices') || [];
    const activeQueries = queries.filter(q => {
      const queryTime = new Date(q.time);
      return queryTime > new Date(Date.now() - 24 * 60 * 60 * 1000);
    });
    const blockedQueries = activeQueries.filter(q => q.status === 'blocked');
    return {
      totalQueries: queries.length,
      dailyQueries: activeQueries.length,
      blockedQueries: blockedQueries.length,
      allowedQueries: activeQueries.length - blockedQueries.length,
      deviceCount: devices.length,
      activeDevices: devices.filter(d => d.online).length,
      storageUsed: Math.round(
        (JSON.stringify(queries).length + JSON.stringify(devices).length) / 1024
      ),
      lastLogin: user.activity?.lastLogin
        ? new Date(user.activity.lastLogin).toLocaleString()
        : 'Now',
    };
  }

  _notifyAuthListeners(event) {
    this.authListeners.forEach(callback => {
      try {
        callback(this.currentUser, event);
      } catch (error) {
        console.error('AuthService listener error:', error);
      }
    });
  }
}

const authService = new AuthService();

// Firebase Auth state listener — fires on login/logout/session refresh
auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    const uid = firebaseUser.uid;
    store.setUid(uid);

    await store.loadFromFirestore(uid);
    store.subscribeToFirestore(uid);

    let userData = store.get('user');
    if (!userData) {
      // Create new user profile from Firebase Auth data
      userData = {
        id: uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email,
        avatar: (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'U').split(' ').map(n => n[0]).join('').toUpperCase(),
        plan: 'free',
        preferences: { theme: 'light' },
        activity: { lastLogin: Date.now() },
        provider: firebaseUser.providerData?.[0]?.providerId?.includes('google') ? 'google' 
                : firebaseUser.providerData?.[0]?.providerId?.includes('github') ? 'github' 
                : 'email',
      };
      store.set('user', userData);
      
      // Save to Firestore
      try {
        await setDoc(doc(db, 'users', uid, 'kv', 'user'), { value: userData });
      } catch (err) {
        console.error('[Auth] Failed to save user profile:', err.message);
      }
    } else {
      // Update existing user's name from provider if available
      if (firebaseUser.displayName && userData.name !== firebaseUser.displayName) {
        userData.name = firebaseUser.displayName;
        userData.avatar = firebaseUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
        store.set('user', userData);
      }
    }

    userData.activity = userData.activity || {};
    userData.activity.lastLogin = Date.now();
    store.set('user', userData);

    authService.currentUser = userData;
    authService._notifyAuthListeners('authenticated');

    // Update sidebar user info
    updateSidebarUser(userData);

    if (authService._readyResolve) {
      authService._readyResolve();
      authService._readyResolve = null;
    }
  } else {
    authService.currentUser = null;
    store.clear();
    store.setUid(null);
    authService._notifyAuthListeners('logged_out');

    if (authService._readyResolve) {
      authService._readyResolve();
      authService._readyResolve = null;
    }
  }
});

function updateSidebarUser(userData) {
  const nameEl = document.querySelector('.user-name');
  const avatarEl = document.querySelector('.user-avatar');
  const planEl = document.querySelector('.user-plan');
  
  if (nameEl) nameEl.textContent = userData.name || 'User';
  if (avatarEl) avatarEl.textContent = userData.avatar || '?';
  if (planEl) planEl.textContent = (userData.plan || 'free') + ' plan';
}

export default authService;
