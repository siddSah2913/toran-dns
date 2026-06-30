/*
 * Toran DNS - Firebase Configuration
 * Initializes Firebase app and exports Auth + Firestore services
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAJsekDQt9sWHRlfKTkntfOLN-MvT12vQo",
  authDomain: "torandns.firebaseapp.com",
  projectId: "torandns",
  storageBucket: "torandns.firebasestorage.app",
  messagingSenderId: "316837705751",
  appId: "1:316837705751:web:7215ea3603318ce176c452",
  measurementId: "G-9NFLRVTRP5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
