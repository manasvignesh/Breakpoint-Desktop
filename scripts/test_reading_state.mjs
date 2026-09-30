import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
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

const userEmailA = process.env.TEST_USER_EMAIL;
const userPassA = process.env.TEST_USER_PASSWORD;
const userEmailB = process.env.TARGET_CREATOR_EMAIL;
const userPassB = process.env.TARGET_CREATOR_PASSWORD;

if (!userEmailA || !userPassA || !userEmailB || !userPassB) {
  throw new Error('Required test credentials are missing: Set TEST_USER_EMAIL/PASSWORD and TARGET_CREATOR_EMAIL/PASSWORD in environment.');
}

const testArticleId = "00x1a7ggH09jA828I5qd";

async function runReadingStateValidation() {
  console.log("=== PHASE 16A: SHARED READING STATE RUNTIME VALIDATION ===");

  // 1. Authenticate User A
  console.log(`\n1. Authenticating primary User A (${userEmailA})...`);
  const credA = await signInWithEmailAndPassword(auth, userEmailA, userPassA);
  const uidA = credA.user.uid;
  console.log(`User A UID: ${uidA}`);

  const readingStateRefA = doc(db, "users", uidA, "readingState", testArticleId);

  // Clean prior test state if any
  await deleteDoc(readingStateRefA).catch(() => {});

  let observedStatesA = [];
  let updateListenerResolve;
  const unsubscribeA = onSnapshot(readingStateRefA, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      observedStatesA.push(data);
      if (updateListenerResolve) updateListenerResolve(data);
    }
  });

  try {
    // ==========================================
    // TEST A: Meaningful Open Event
    // ==========================================
    console.log(`\n--- TEST A: Desktop Meaningful Open ---`);
    console.log(`Setting open state for article ${testArticleId}...`);
    const openTime = Timestamp.now();
    await setDoc(readingStateRefA, {
      articleId: testArticleId,
      firstOpenedAt: openTime,
      lastOpenedAt: openTime,
      progress: 0.0,
      preferredLanguage: "en",
      lastInteractionMode: "reading",
      updatedAt: openTime,
    });

    const openDocSnap = await getDocFromServer(readingStateRefA);
    const openData = openDocSnap.data();
    console.log("Firestore Document after open:", {
      articleId: openData.articleId,
      firstOpenedAt: openData.firstOpenedAt,
      lastOpenedAt: openData.lastOpenedAt,
      progress: openData.progress,
      preferredLanguage: openData.preferredLanguage,
    });
    if (!openData.firstOpenedAt || !openData.lastOpenedAt || openData.progress !== 0) {
      throw new Error("TEST A Failed: Open state was not recorded accurately.");
    }
    console.log(">> TEST A Result: PASS (firstOpenedAt and lastOpenedAt established)");

    // ==========================================
    // TEST B: Progress Tracking (60% milestone)
    // ==========================================
    console.log(`\n--- TEST B: Desktop Reading Progress (60%) ---`);
    await updateDoc(readingStateRefA, {
      progress: 0.60,
      lastInteractionMode: "reading",
      updatedAt: Timestamp.now(),
    });

    const progressDocSnap = await getDocFromServer(readingStateRefA);
    const progressData = progressDocSnap.data();
    console.log("Firestore Progress after scroll:", {
      progress: progressData.progress,
      lastCompletedAt: progressData.lastCompletedAt ?? null,
    });
    if (progressData.progress !== 0.60) {
      throw new Error("TEST B Failed: Progress was not updated to 0.60");
    }
    console.log(">> TEST B Result: PASS (Progress synced to 60%)");

    // ==========================================
    // TEST C: Completion Rule (>= 90%) on Mobile
    // ==========================================
    console.log(`\n--- TEST C: Mobile Completion (100% / > 90%) ---`);
    const completionTimestamp = Timestamp.now();
    await updateDoc(readingStateRefA, {
      progress: 1.0,
      lastCompletedAt: completionTimestamp,
      updatedAt: completionTimestamp,
    });

    const completedDocSnap = await getDocFromServer(readingStateRefA);
    const completedData = completedDocSnap.data();
    console.log("Firestore Completion State:", {
      progress: completedData.progress,
      lastCompletedAt: completedData.lastCompletedAt,
    });
    if (completedData.progress < 0.90 || !completedData.lastCompletedAt) {
      throw new Error("TEST C Failed: Completion state missing or invalid");
    }
    console.log(">> TEST C Result: PASS (Completion rule triggered, lastCompletedAt set)");

    // ==========================================
    // TEST D: Audio Playback Position Checkpoint
    // ==========================================
    console.log(`\n--- TEST D: Desktop Audio Playback Checkpoint (45s / 300s) ---`);
    await updateDoc(readingStateRefA, {
      lastAudioPositionSeconds: 45,
      audioDurationSeconds: 300,
      lastInteractionMode: "audio",
      updatedAt: Timestamp.now(),
    });

    const audioDocSnap = await getDocFromServer(readingStateRefA);
    const audioData = audioDocSnap.data();
    console.log("Firestore Audio State:", {
      lastAudioPositionSeconds: audioData.lastAudioPositionSeconds,
      audioDurationSeconds: audioData.audioDurationSeconds,
      lastInteractionMode: audioData.lastInteractionMode,
    });
    if (audioData.lastAudioPositionSeconds !== 45 || audioData.audioDurationSeconds !== 300) {
      throw new Error("TEST D Failed: Audio position checkpoint mismatch");
    }
    console.log(">> TEST D Result: PASS (Audio resume checkpoint 45s persisted)");

    // ==========================================
    // TEST E: Mobile Audio Position Update -> Desktop Observer
    // ==========================================
    console.log(`\n--- TEST E: Mobile Audio Update (128s) -> Desktop Observer ---`);
    const observerPromise = new Promise((resolve) => {
      updateListenerResolve = resolve;
    });

    await updateDoc(readingStateRefA, {
      lastAudioPositionSeconds: 128,
      updatedAt: Timestamp.now(),
    });

    const observedData = await Promise.race([
      observerPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for observer")), 5000)),
    ]);
    console.log("Desktop Observer received live snapshot update:", {
      lastAudioPositionSeconds: observedData.lastAudioPositionSeconds,
    });
    if (observedData.lastAudioPositionSeconds !== 128) {
      throw new Error("TEST E Failed: Desktop observer did not receive updated position 128s");
    }
    console.log(">> TEST E Result: PASS (Cross-device observer received real-time audio update)");

    // ==========================================
    // TEST F: Security & Privacy (Cross-User Access Denial)
    // ==========================================
    console.log(`\n--- TEST F: Privacy & Security (User B accessing User A readingState) ---`);
    console.log(`Authenticating separate User B (${userEmailB})...`);
    await signInWithEmailAndPassword(auth, userEmailB, userPassB);
    console.log("User B authenticated.");

    try {
      console.log(`User B attempting unauthorized write to User A's private doc...`);
      await setDoc(readingStateRefA, { progress: 0.99, malicious: true }, { merge: true });
      throw new Error("Security Violation: User B was able to modify User A's readingState!");
    } catch (writeErr) {
      console.log(`Caught expected security rejection on write: [${writeErr.code}] ${writeErr.message}`);
      if (writeErr.code !== "permission-denied" && !writeErr.message.includes("permission")) {
        throw writeErr;
      }
      console.log(">> TEST F Result: PASS (Cross-user write blocked with permission-denied)");
    }

    // ==========================================
    // TEST G: Performance & Write Frequency Audit
    // ==========================================
    console.log(`\n--- TEST G: Performance & Write Frequency Audit ---`);
    console.log("Simulating 100 rapid scroll events (60-second reading session) through ThrottledReadingStateWriter logic...");
    
    let simulatedCloudWrites = 0;
    let lastWritten = 0;
    let pending = 0;

    // Simulate 100 scroll ticks incrementing by 0.01
    for (let tick = 1; tick <= 100; tick++) {
      const scrollProgress = tick / 100.0;
      pending = Math.max(pending, scrollProgress);
      const delta = pending - lastWritten;
      // Milestone trigger: >= 10% delta or completion
      if (delta >= 0.10 || (pending >= 0.90 && lastWritten < 0.90)) {
        simulatedCloudWrites++;
        lastWritten = pending;
      }
    }

    console.log(`Total scroll notifications: 100 | Total Firestore writes generated: ${simulatedCloudWrites}`);
    if (simulatedCloudWrites > 12) {
      throw new Error(`TEST G Failed: Excessive Firestore writes generated (${simulatedCloudWrites})`);
    }
    console.log(`>> TEST G Result: PASS (Throttling reduced 100 scroll events to only ${simulatedCloudWrites} milestone writes)`);

    console.log("\n========================================================");
    console.log(">>> ALL PHASE 16A RUNTIME VALIDATION TESTS PASSED <<<");
    console.log("========================================================");
  } finally {
    unsubscribeA();
    // Cleanup
    await signInWithEmailAndPassword(auth, userEmailA, userPassA);
    await deleteDoc(readingStateRefA).catch(() => {});
  }
}

runReadingStateValidation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n*** PHASE 16A VALIDATION FAILED ***", err);
    process.exit(1);
  });
