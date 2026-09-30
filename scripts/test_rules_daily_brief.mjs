import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
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

const app = initializeApp(firebaseConfig, 'rules-test-app');
const auth = getAuth(app);
const db = getFirestore(app);

async function runRulesTest() {
  console.log('========================================================');
  console.log('PHASE 16F.5: FIRESTORE SECURITY RULES VERIFICATION');
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
  console.log(`✓ Authenticated as ${userEmail} (UID: ${uid})\n`);

  const briefId = '2026-09-30-morning';
  let passed = 0;
  let failed = 0;

  // TEST 1: Client WRITE to users/{uid}/briefs/{briefId} MUST BE DENIED
  console.log('TEST 1: Client write to users/{uid}/briefs/{briefId}...');
  try {
    const clientBriefRef = doc(db, 'users', uid, 'briefs', briefId);
    await setDoc(clientBriefRef, {
      briefId,
      userId: uid,
      tamperedByClient: true,
      updatedAt: new Date().toISOString(),
    });
    console.error('❌ FAILED: Client write to users/{uid}/briefs/{briefId} SUCCEEDED (Security Violation!)');
    failed++;
  } catch (err) {
    if (err.code === 'permission-denied' || String(err).includes('permission-denied') || String(err).includes('Missing or insufficient permissions')) {
      console.log('✓ PASSED: Client write to briefs/{briefId} correctly DENIED with permission-denied error.');
      passed++;
    } else {
      console.error(`❌ Unexpected error: ${err.message}`);
      failed++;
    }
  }

  // TEST 2: Owner READ from users/{uid}/briefs/{briefId} MUST BE ALLOWED
  console.log('\nTEST 2: Owner read from users/{uid}/briefs/{briefId}...');
  try {
    const clientBriefRef = doc(db, 'users', uid, 'briefs', briefId);
    const snap = await getDoc(clientBriefRef);
    console.log(`✓ PASSED: Owner read allowed (Doc exists: ${snap.exists()})`);
    passed++;
  } catch (err) {
    console.error(`❌ FAILED: Owner read failed: ${err.message}`);
    failed++;
  }

  // TEST 3: Owner WRITE to users/{uid}/briefProgress/{briefId} MUST BE ALLOWED
  console.log('\nTEST 3: Owner write to users/{uid}/briefProgress/{briefId}...');
  try {
    const progressRef = doc(db, 'users', uid, 'briefProgress', briefId);
    await setDoc(progressRef, {
      briefId,
      userId: uid,
      activeIndex: 0,
      completedItemIds: [],
      skippedItemIds: [],
      isCaughtUp: false,
      lastUpdatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('✓ PASSED: Owner write to briefProgress allowed.');
    passed++;
  } catch (err) {
    console.error(`❌ FAILED: Owner write to briefProgress failed: ${err.message}`);
    failed++;
  }

  // TEST 4: Cross-user WRITE to users/{otherUid}/briefProgress/{briefId} MUST BE DENIED
  console.log('\nTEST 4: Cross-user write to users/{otherUid}/briefProgress/{briefId}...');
  const fakeOtherUid = 'other_user_99999';
  try {
    const crossProgressRef = doc(db, 'users', fakeOtherUid, 'briefProgress', briefId);
    await setDoc(crossProgressRef, {
      briefId,
      userId: fakeOtherUid,
      tampered: true,
    });
    console.error('❌ FAILED: Cross-user write SUCCEEDED (Security Violation!)');
    failed++;
  } catch (err) {
    if (err.code === 'permission-denied' || String(err).includes('permission-denied') || String(err).includes('Missing or insufficient permissions')) {
      console.log('✓ PASSED: Cross-user write correctly DENIED with permission-denied error.');
      passed++;
    } else {
      console.error(`❌ Unexpected error: ${err.message}`);
      failed++;
    }
  }

  // TEST 5: Cross-user READ from users/{otherUid}/briefs/{briefId} MUST BE DENIED
  console.log('\nTEST 5: Cross-user read from users/{otherUid}/briefs/{briefId}...');
  try {
    const crossBriefRef = doc(db, 'users', fakeOtherUid, 'briefs', briefId);
    await getDoc(crossBriefRef);
    console.error('❌ FAILED: Cross-user read SUCCEEDED (Security Violation!)');
    failed++;
  } catch (err) {
    if (err.code === 'permission-denied' || String(err).includes('permission-denied') || String(err).includes('Missing or insufficient permissions')) {
      console.log('✓ PASSED: Cross-user read correctly DENIED with permission-denied error.');
      passed++;
    } else {
      console.error(`❌ Unexpected error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n--------------------------------------------------------');
  console.log(`Rules Test Results: ${passed} passed, ${failed} failed`);
  console.log('--------------------------------------------------------\n');

  await terminate(db);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('>>> ALL FIRESTORE SECURITY RULES PASSED <<<');
    process.exit(0);
  }
}

runRulesTest().catch((err) => {
  console.error('Fatal error running rules test:', err);
  process.exit(1);
});
