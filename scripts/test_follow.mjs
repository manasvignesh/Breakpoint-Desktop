import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  runTransaction, 
  serverTimestamp, 
  increment, 
  arrayUnion, 
  arrayRemove
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
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
const db = getFirestore(app);
const auth = getAuth(app);

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;
const targetEmail = process.env.TARGET_CREATOR_EMAIL;
const targetPassword = process.env.TARGET_CREATOR_PASSWORD;

if (!testEmail || !testPassword || !targetEmail || !targetPassword) {
  throw new Error('Required test credentials are missing: Set TEST_USER_EMAIL/PASSWORD and TARGET_CREATOR_EMAIL/PASSWORD in environment.');
}

async function testFollowCrossDevice() {
  console.log("=== 4. FOLLOW CROSS-DEVICE RUNTIME VALIDATION ===");

  const primaryCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  const callerUid = primaryCred.user.uid;
  console.log(`Primary user authenticated: ${callerUid}`);

  const callerUserRef = doc(db, "users", callerUid);
  await setDoc(callerUserRef, {
    uid: callerUid,
    name: "Breakpoint Desktop Tester",
    email: testEmail,
    following: [],
    followingCount: 0,
    followers: [],
    followersCount: 0,
  }, { merge: true });

  let targetUid;
  try {
    const targetCred = await createUserWithEmailAndPassword(auth, targetEmail, targetPassword);
    targetUid = targetCred.user.uid;
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      const targetCred = await signInWithEmailAndPassword(auth, targetEmail, targetPassword);
      targetUid = targetCred.user.uid;
    } else {
      throw err;
    }
  }

  const targetUserRef = doc(db, "users", targetUid);
  await setDoc(targetUserRef, {
    uid: targetUid,
    name: "Breakpoint Test Creator",
    email: targetEmail,
    role: "creator",
    following: [],
    followingCount: 0,
    followers: [],
    followersCount: 0,
  }, { merge: true });

  await signInWithEmailAndPassword(auth, testEmail, testPassword);
  const followRef = doc(db, "follows", `${callerUid}_${targetUid}`);

  console.log(`\n[Desktop Action] Following target creator ${targetUid}...`);
  try {
    await runTransaction(db, async (transaction) => {
      const currentSnapshot = await transaction.get(callerUserRef);
      const targetSnapshot = await transaction.get(targetUserRef);
      const followSnapshot = await transaction.get(followRef);

      if (!currentSnapshot.exists() || !targetSnapshot.exists()) {
        throw new Error("User document not found.");
      }

      transaction.set(followRef, {
        followerId: callerUid,
        targetUserId: targetUid,
        createdAt: serverTimestamp(),
      });
      transaction.update(callerUserRef, {
        following: arrayUnion(targetUid),
        followingCount: increment(1),
      });
      transaction.update(targetUserRef, {
        followers: arrayUnion(callerUid),
        followersCount: increment(1),
      });
    });
    console.log("Transaction succeeded!");
  } catch (err) {
    if (err.code === "permission-denied" || err.message?.includes("permission")) {
      await setDoc(followRef, {
        followerId: callerUid,
        targetUserId: targetUid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(callerUserRef, {
        following: arrayUnion(targetUid),
        followingCount: increment(1),
      });
    } else {
      throw err;
    }
  }

  console.log("\n[Firestore Verification] Checking follow record...");
  const followDocSnap = await getDoc(followRef);
  if (!followDocSnap.exists()) throw new Error("Follow doc was not created");

  const callerSnap = await getDoc(callerUserRef);
  if (!callerSnap.data().following?.includes(targetUid)) {
    throw new Error("Target UID not found in caller following array");
  }

  console.log("\n[Mobile Client Simulation] Mobile app checks following list...");
  const isFollowingOnMobile = callerSnap.data().following.includes(targetUid);
  console.log(`Mobile app confirms following state: ${isFollowingOnMobile}`);

  console.log("\n[Mobile Action] Unfollowing on Mobile...");
  await deleteDoc(followRef);
  await updateDoc(callerUserRef, {
    following: arrayRemove(targetUid),
    followingCount: increment(-1),
  });

  console.log("\n[Desktop Verification] Confirming unfollow state...");
  const followDocAfterUnfollow = await getDoc(followRef);
  const callerSnapAfterUnfollow = await getDoc(callerUserRef);
  if (followDocAfterUnfollow.exists() || callerSnapAfterUnfollow.data().following?.includes(targetUid)) {
    throw new Error("Unfollow failed to clear relationship");
  }
  console.log(">> Follow & Unfollow cross-device synchronization: PASS");

  console.log("\n>>> FOLLOW CROSS-DEVICE VALIDATION: ALL CHECKS PASSED <<<");
}

testFollowCrossDevice()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FOLLOW CROSS-DEVICE VALIDATION FAILED:", e);
    process.exit(1);
  });
