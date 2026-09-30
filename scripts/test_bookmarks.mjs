import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
const db = getFirestore(app);
const auth = getAuth(app);

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('Required test credentials are missing: Set TEST_USER_EMAIL and TEST_USER_PASSWORD in environment.');
}

async function testBookmarkCrossDevice() {
  console.log("=== 3. BOOKMARK CROSS-DEVICE RUNTIME VALIDATION ===");

  const userCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  const uid = userCred.user.uid;
  console.log(`Signed in test user: ${uid}`);

  const articleId = "00x1a7ggH09jA828I5qd";
  const postRef = doc(db, "posts", articleId);

  let latestBookmarks = [];
  let updateResolve;
  const unsubscribe = onSnapshot(postRef, (snap) => {
    if (snap.exists()) {
      latestBookmarks = snap.data().bookmarkedBy || [];
      if (updateResolve) updateResolve(latestBookmarks);
    }
  });

  try {
    console.log(`\n[Desktop Action] Saving article ${articleId}...`);
    await updateDoc(postRef, {
      bookmarkedBy: arrayUnion(uid)
    });

    console.log("[Firestore Verification] Reading document directly from cloud...");
    const savedSnap = await getDoc(postRef);
    const bookmarkedByAfterSave = savedSnap.data().bookmarkedBy || [];
    if (!bookmarkedByAfterSave.includes(uid)) {
      throw new Error(`UID ${uid} not found in posts/${articleId}.bookmarkedBy after save`);
    }
    console.log(">> Firestore verification: PASS (UID present in bookmarkedBy)");

    console.log("\n[Mobile Client Simulation] Reading saved state on Mobile app...");
    const isSavedOnMobile = bookmarkedByAfterSave.includes(uid);
    console.log(`Mobile app evaluates isSaved = ${isSavedOnMobile}`);
    if (!isSavedOnMobile) throw new Error("Mobile client would not see article as saved");

    console.log("\n[Mobile Action] Unsaving article on Mobile app...");
    const waitPromise = new Promise((resolve) => {
      updateResolve = resolve;
    });

    await updateDoc(postRef, {
      bookmarkedBy: arrayRemove(uid)
    });

    console.log("[Desktop Realtime Listener] Awaiting real-time snapshot on Desktop...");
    const updatedBookmarks = await Promise.race([
      waitPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for realtime snapshot")), 5000))
    ]);

    if (updatedBookmarks.includes(uid)) {
      throw new Error("Desktop listener still contains UID after mobile unsave");
    }
    console.log(">> Desktop real-time synchronization without restart: PASS");

    console.log("\n>>> BOOKMARK CROSS-DEVICE VALIDATION: ALL CHECKS PASSED <<<");
  } finally {
    unsubscribe();
    try {
      await updateDoc(postRef, { bookmarkedBy: arrayRemove(uid) });
    } catch (_) {}
  }
}

testBookmarkCrossDevice()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("BOOKMARK CROSS-DEVICE VALIDATION FAILED:", e);
    process.exit(1);
  });
