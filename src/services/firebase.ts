import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = (typeof import.meta !== 'undefined' && import.meta?.env) || (typeof process !== 'undefined' && process?.env) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDucWzTVZomZYsXyWZ83ygCSJOCArOBzIs",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "cie-connect.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "cie-connect",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "cie-connect.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "226102698550",
  appId: env.VITE_FIREBASE_APP_ID || "1:226102698550:web:453d7032cec3231a6dee97",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
