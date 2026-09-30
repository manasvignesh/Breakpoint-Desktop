import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  getIdToken
} from "firebase/auth";

import './envHelper.mjs';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('Required test credentials are missing: Set TEST_USER_EMAIL and TEST_USER_PASSWORD in environment.');
}

async function testAuth() {
  console.log("=== 1. RUNTIME AUTH VALIDATION ===");
  let userCredential;

  try {
    console.log(`Authenticating test user [${testEmail}]...`);
    userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log("Sign-in succeeded!");
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      console.log("User not found or invalid credentials, initializing test account...");
      userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      console.log("Test user initialized successfully!");
    } else {
      throw err;
    }
  }

  const user = userCredential.user;
  console.log("1.1 Returned UID:", user.uid);
  console.log("1.1 Email:", user.email);
  if (!user.uid) throw new Error("UID missing");

  // 1.2 Token refresh test
  console.log("\n1.2 Testing force token refresh...");
  const token = await getIdToken(user, true);
  console.log(`Token received (valid length: ${token.length})`);
  if (!token || token.length < 50) throw new Error("Token refresh failed");

  // 1.3 Sign out test
  console.log("\n1.3 Testing sign out...");
  await signOut(auth);
  console.log("Current user after sign out:", auth.currentUser);
  if (auth.currentUser !== null) throw new Error("Sign out failed: currentUser not null");

  // 1.4 Re-authenticate test
  console.log("\n1.4 Testing re-authentication (relaunch simulation)...");
  const reAuthCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  console.log("Re-authenticated UID:", reAuthCred.user.uid);
  if (reAuthCred.user.uid !== user.uid) throw new Error("UID mismatch upon re-authentication");

  console.log("\n>>> AUTH VALIDATION: ALL CHECKS PASSED <<<");
}

testAuth()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("AUTH VALIDATION FAILED:", e);
    process.exit(1);
  });
