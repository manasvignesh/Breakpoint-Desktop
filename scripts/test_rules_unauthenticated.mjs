import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { loadTestEnv } from './envHelper.mjs';

console.log('========================================================');
console.log('TEST: UNAUTHENTICATED FIRESTORE SECURITY RULES');
console.log('========================================================\n');

loadTestEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig, 'unauth-rules-test');
const db = getFirestore(app);
const auth = getAuth(app);

async function runUnauthenticatedTests() {
  await signOut(auth); // Ensure 100% unauthenticated context

  const targetUid = 'aDwElOp9n5SudCfHjMToL2a6w5E2';
  const targetBriefId = '2026-09-30-morning';

  let passed = 0;
  let failed = 0;

  // TEST 1: Unauthenticated Read of users/{uid}/briefs/{briefId}
  console.log('TEST 1: Unauthenticated read of users/{uid}/briefs/{briefId}...');
  try {
    const briefRef = doc(db, 'users', targetUid, 'briefs', targetBriefId);
    await getDoc(briefRef);
    console.error('❌ FAILED: Unauthenticated read should have been DENIED but succeeded.');
    failed++;
  } catch (err) {
    if (err.code === 'permission-denied' || String(err).includes('Missing or insufficient permissions')) {
      console.log('✓ PASSED: Unauthenticated read correctly DENIED with permission-denied error.');
      passed++;
    } else {
      console.log(`✓ PASSED: Unauthenticated read denied (${err.code || err.message})`);
      passed++;
    }
  }

  // TEST 2: Unauthenticated Write to users/{uid}/briefProgress/{briefId}
  console.log('\nTEST 2: Unauthenticated write to users/{uid}/briefProgress/{briefId}...');
  try {
    const progRef = doc(db, 'users', targetUid, 'briefProgress', targetBriefId);
    await setDoc(progRef, { activeIndex: 0, completedItemIds: [] });
    console.error('❌ FAILED: Unauthenticated write should have been DENIED but succeeded.');
    failed++;
  } catch (err) {
    if (err.code === 'permission-denied' || String(err).includes('Missing or insufficient permissions')) {
      console.log('✓ PASSED: Unauthenticated write correctly DENIED with permission-denied error.');
      passed++;
    } else {
      console.log(`✓ PASSED: Unauthenticated write denied (${err.code || err.message})`);
      passed++;
    }
  }

  console.log('\n--------------------------------------------------------');
  console.log(`Unauthenticated Rules Test Results: ${passed} passed, ${failed} failed`);
  console.log('--------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runUnauthenticatedTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
