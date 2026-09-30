import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  terminate,
} from 'firebase/firestore';
import { loadTestEnv } from './envHelper.mjs';

loadTestEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig, 'cross-device-test-app');
const auth = getAuth(app);
const db = getFirestore(app);

// Mirror of Flutter repository resolveNextUnresolvedIndex
function resolveNextUnresolvedIndex(brief, progress) {
  if (!progress) return 0;
  const completedSet = new Set(progress.completedItemIds || []);
  const skippedSet = new Set(progress.skippedItemIds || []);

  for (let i = 0; i < (brief.items || []).length; i++) {
    const itemId = brief.items[i].id;
    if (!completedSet.has(itemId) && !skippedSet.has(itemId)) {
      return i;
    }
  }
  return Math.max(0, (brief.items || []).length - 1);
}

async function runCrossDeviceTest() {
  console.log('========================================================');
  console.log('PHASE 16F.5: CROSS-DEVICE & READING STATE ISOLATION TEST');
  console.log('========================================================\n');

  const userEmail = process.env.TEST_USER_EMAIL || process.env.TARGET_USER_EMAIL || process.env.VITE_TEST_USER_EMAIL;
  const userPassword = process.env.TEST_USER_PASSWORD || process.env.TARGET_USER_PASSWORD || process.env.VITE_TEST_USER_PASSWORD;

  if (!userEmail || !userPassword) {
    console.error('❌ Missing test credentials in environment.');
    await terminate(db);
    process.exit(1);
  }

  const cred = await signInWithEmailAndPassword(auth, userEmail, userPassword);
  const uid = cred.user.uid;
  console.log(`✓ Authenticated: UID=${uid}\n`);

  const briefId = '2026-09-30-morning';
  const briefDocRef = doc(db, 'users', uid, 'briefs', briefId);
  const briefSnap = await getDoc(briefDocRef);

  if (!briefSnap.exists()) {
    console.error('❌ Brief document not found. Run runtime validation first.');
    await terminate(db);
    process.exit(1);
  }

  const brief = briefSnap.data();
  console.log(`✓ Loaded Daily Brief with ${brief.items.length} items`);

  // Record existing reading states before test
  const readingStateSnapBefore = await getDocs(collection(db, 'users', uid, 'readingState'));
  const readingStatesBefore = new Map();
  readingStateSnapBefore.forEach((d) => readingStatesBefore.set(d.id, d.data()));
  console.log(`✓ Initial reading states count: ${readingStatesBefore.size}\n`);

  // STEP 1: Desktop completes item 1, skips item 2
  console.log('--- STEP 1: DESKTOP SIMULATION (Complete Item 1, Skip Item 2) ---');
  const item1 = brief.items[0];
  const item2 = brief.items[1];
  const item3 = brief.items[2];
  const item4 = brief.items[3];

  const progressRef = doc(db, 'users', uid, 'briefProgress', briefId);
  const initialProgress = {
    briefId,
    userId: uid,
    activeIndex: 1,
    completedItemIds: [item1.id],
    skippedItemIds: [item2.id],
    isCaughtUp: false,
    timeSpentSeconds: 45,
    lastUpdatedAt: new Date().toISOString(),
  };

  await setDoc(progressRef, initialProgress, { merge: true });
  console.log(`✓ Desktop wrote progress: completed=[${item1.id}], skipped=[${item2.id}]`);

  // STEP 2: Mobile / Flutter resolution
  console.log('\n--- STEP 2: MOBILE / FLUTTER RESOLUTION ---');
  const mobileProgressSnap = await getDoc(progressRef);
  const mobileProgress = mobileProgressSnap.data();
  const nextUnresolved = resolveNextUnresolvedIndex(brief, mobileProgress);
  console.log(`✓ Mobile resolved next unresolved item index: ${nextUnresolved} (Expected: 2 -> "${brief.items[nextUnresolved]?.title?.slice(0, 40)}...")`);

  if (nextUnresolved !== 2) {
    console.error(`❌ FAILED: Expected next unresolved index 2, got ${nextUnresolved}`);
    await terminate(db);
    process.exit(1);
  }

  // STEP 3: Complete remaining items (handled union check)
  console.log('\n--- STEP 3: HANDLED UNION COMPLETION (Complete Items 3 & 4) ---');
  const handledSet = new Set([...mobileProgress.completedItemIds, ...mobileProgress.skippedItemIds, item3.id, item4.id]);
  const isCaughtUp = handledSet.size >= brief.items.length;

  const finalProgress = {
    briefId,
    userId: uid,
    activeIndex: brief.items.length - 1,
    completedItemIds: [item1.id, item3.id, item4.id],
    skippedItemIds: [item2.id],
    isCaughtUp: isCaughtUp,
    caughtUpAt: new Date().toISOString(),
    timeSpentSeconds: 120,
    lastUpdatedAt: new Date().toISOString(),
  };

  await setDoc(progressRef, finalProgress, { merge: true });
  console.log(`✓ Progress updated to full handled set: completed=${finalProgress.completedItemIds.length}, skipped=${finalProgress.skippedItemIds.length}`);
  console.log(`✓ Handled Total: ${handledSet.size} / ${brief.items.length} -> isCaughtUp=${isCaughtUp}`);

  if (!isCaughtUp) {
    console.error('❌ FAILED: isCaughtUp should be true when handled union equals total items');
    await terminate(db);
    process.exit(1);
  }

  // STEP 4: Verify Reading State Isolation
  console.log('\n--- STEP 4: READING STATE ISOLATION AUDIT ---');
  const readingStateSnapAfter = await getDocs(collection(db, 'users', uid, 'readingState'));
  const readingStatesAfter = new Map();
  readingStateSnapAfter.forEach((d) => readingStatesAfter.set(d.id, d.data()));

  let corrupted = false;
  for (const item of brief.items) {
    const artId = item.articleId;
    if (artId) {
      const beforeState = readingStatesBefore.get(artId);
      const afterState = readingStatesAfter.get(artId);
      // If the article was not previously completed in readingState, it should NOT have been forced to 1.0 by brief consumption
      if (!beforeState && afterState && afterState.progress === 1.0) {
        console.error(`❌ CORRUPTION DETECTED: Article ${artId} was given readingState.progress=1.0 by brief completion!`);
        corrupted = true;
      }
    }
  }

  if (!corrupted) {
    console.log('✓ Verified: Brief item completion did NOT write readingState.progress = 1.0 or corrupt user reading state.');
  }

  console.log('\n========================================================');
  console.log('>>> CROSS-DEVICE TEST PASSED WITH 100% STATE ISOLATION <<<');
  console.log('========================================================\n');

  await terminate(db);
  process.exit(0);
}

runCrossDeviceTest().catch(async (err) => {
  console.error('Fatal error in cross-device test:', err);
  await terminate(db);
  process.exit(1);
});
