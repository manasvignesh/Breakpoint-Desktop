import { initializeApp, deleteApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  Timestamp,
  terminate,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { storyTimelineService } from '../src/services/storyTimelineService.ts';

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

const userEmail = process.env.TEST_USER_EMAIL || process.env.TARGET_CREATOR_EMAIL;
const userPass = process.env.TEST_USER_PASSWORD || process.env.TARGET_CREATOR_PASSWORD;

if (!userEmail || !userPass) {
  throw new Error('Required test credentials are missing: Set TEST_USER_EMAIL and TEST_USER_PASSWORD in environment.');
}

async function runLiveSinceYouLastReadTest() {
  console.log('============================================================');
  console.log('PHASE 16C.6: REAL "SINCE YOU LAST READ" RUNTIME CONTINUITY TEST');
  console.log('============================================================');

  // 1. Authenticate test user
  console.log(`\n1. Authenticating test user (${userEmail})...`);
  const cred = await signInWithEmailAndPassword(auth, userEmail, userPass);
  const uid = cred.user.uid;
  console.log(`   Authenticated as UID: ${uid}`);

  // ========================================================================
  // SCENARIO 1: ISRO STORY — NEGATIVE FILTERING (ALL-SUPPRESSED CHANGES)
  // ========================================================================
  console.log('\n--- SCENARIO 1: ISRO Story Negative Filtering (All-Suppressed Changes) ---');
  const ISRO_STORY_ID = 'st_isro_semicryo';
  const ISRO_ART_1 = 'jQ2IssXNX9zSqzVcGy6E'; // Sep 5, 2026
  const ISRO_ART_2 = 'KX0pvxG8rlBFOpB5cvi9'; // Sep 17, 2026

  const isroReadingRef1 = doc(db, 'users', uid, 'readingState', ISRO_ART_1);
  const isroReadingRef2 = doc(db, 'users', uid, 'readingState', ISRO_ART_2);

  // Clean prior reading states
  await deleteDoc(isroReadingRef1).catch(() => {});
  await deleteDoc(isroReadingRef2).catch(() => {});

  // User read Article 1 on Sep 10, 2026 (between Article 1 and Article 2)
  const isroT1 = Timestamp.fromDate(new Date('2026-09-10T12:00:00.000Z'));
  await setDoc(isroReadingRef1, {
    articleId: ISRO_ART_1,
    userId: uid,
    openedAt: isroT1,
    lastOpenedAt: isroT1,
    lastEngagedAt: isroT1,
    completedAt: isroT1,
    progressPercentage: 100,
    audioPositionSeconds: 0,
    isCompleted: true,
  });
  console.log('   ✓ User marked as having read ISRO Article 1 at T1 (2026-09-10).');

  // Derive changes since last read
  const isroResult = await storyTimelineService.getChangesSinceLastRead(uid, ISRO_STORY_ID);
  console.log('   Derived Since-Last-Read Result for ISRO:');
  console.log(`     - meaningfulUpdateCount: ${isroResult.meaningfulUpdateCount}`);
  console.log(`     - meaningfulChangeCount: ${isroResult.meaningfulChangeCount}`);
  console.log(`     - changes: ${JSON.stringify(isroResult.changes)}`);

  // Assertions for ISRO: Although 1 update doc exists after T1 with 6 facts, ALL 6 are additional_detail (userFacing: false)
  if (isroResult.meaningfulUpdateCount !== 0 || isroResult.meaningfulChangeCount !== 0 || isroResult.changes.length !== 0) {
    throw new Error(`ISRO Negative Filter Failed! Expected 0 meaningful changes, got ${isroResult.meaningfulChangeCount}`);
  }
  console.log('   >> PASS: ISRO 6 suppressed deltas correctly yielded 0 meaningful changes. UI banner will NOT display.');

  // ========================================================================
  // SCENARIO 2: CONTROLLED TRUE-POSITIVE STORY (GENUINE VALUE CHANGE & MIXED)
  // ========================================================================
  console.log('\n--- SCENARIO 2: Controlled True-Positive Story (Genuine Value Change & Mixed) ---');
  const TP_STORY_ID = 'st_fuel_cycle_gcc';
  const TP_ART_1 = 'art_fc_gcc_01';
  const TP_ART_2 = 'art_fc_gcc_02';

  const tpReadingRef1 = doc(db, 'users', uid, 'readingState', TP_ART_1);
  const tpReadingRef2 = doc(db, 'users', uid, 'readingState', TP_ART_2);

  await deleteDoc(tpReadingRef1).catch(() => {});
  await deleteDoc(tpReadingRef2).catch(() => {});

  // Create & Persist True Positive Story & Updates to Firestore
  const tpT1 = Timestamp.fromDate(new Date('2026-09-24T08:00:00.000Z'));
  const tpT2 = Timestamp.fromDate(new Date('2026-09-26T10:00:00.000Z'));

  const tpStoryDoc = {
    id: TP_STORY_ID,
    slug: 'fuel-cycle-navi-mumbai-gcc-expansion',
    title: 'Fuel Cycle Navi Mumbai GCC Scaling & Expansion',
    summary: 'Fuel Cycle expands operations at its Navi Mumbai Global Capability Centre.',
    category: 'AI & ML',
    entities: ['ent_fuel_cycle', 'ent_loc_mumbai', 'ent_loc_hyderabad'],
    status: 'active',
    primaryArticleId: TP_ART_1,
    latestArticleId: TP_ART_2,
    articleCount: 2,
    articleIds: [TP_ART_1, TP_ART_2],
    createdAt: tpT1,
    updatedAt: tpT2,
  };
  await setDoc(doc(db, 'stories', TP_STORY_ID), tpStoryDoc);

  // Update with 1 Genuine Value Change (50 -> 120 employees) and 2 Suppressed Details
  const tpUpdateId = 'upd_fc_02';
  const tpUpdateDoc = {
    id: tpUpdateId,
    storyId: TP_STORY_ID,
    articleId: TP_ART_2,
    headline: 'Fuel Cycle increases workforce target to 120 employees and adds Hyderabad center',
    summary: 'Fuel Cycle scales its GCC workforce from 50 to 120 employees.',
    importance: 4,
    changes: [
      {
        id: 'chg_fc_workforce',
        type: 'value_changed',
        subject: 'Planned Workforce',
        previousValue: '50 employees',
        newValue: '120 employees',
        description: 'Planned Workforce increased from 50 employees to 120 employees.',
        importance: 4,
        userFacing: true,
        reason: 'Workforce target increased from 50 to 120.',
      },
      {
        id: 'chg_fc_detail_1',
        type: 'additional_detail',
        subject: 'GCC Facility',
        previousValue: null,
        newValue: 'Navi Mumbai',
        description: 'Supplementary detail: GCC Facility is Navi Mumbai.',
        importance: 2,
        userFacing: false,
        reason: 'Pre-established in initial reporting.',
      },
      {
        id: 'chg_fc_detail_2',
        type: 'additional_detail',
        subject: 'Engineering Focus',
        previousValue: null,
        newValue: 'AI & Product Engineering',
        description: 'Supplementary detail: AI & Product Engineering.',
        importance: 2,
        userFacing: false,
        reason: 'Pre-established in initial reporting.',
      },
    ],
    publishedAt: tpT2,
    createdAt: tpT2,
  };
  await setDoc(doc(db, 'stories', TP_STORY_ID, 'updates', tpUpdateId), tpUpdateDoc);
  console.log('   ✓ Persisted True-Positive story and mixed update (1 value_changed + 2 suppressed details).');

  // Step 2A: User reads Article 1 on Sep 24 (T1)
  const userReadT1 = Timestamp.fromDate(new Date('2026-09-24T20:00:00.000Z'));
  await setDoc(tpReadingRef1, {
    articleId: TP_ART_1,
    userId: uid,
    openedAt: userReadT1,
    lastOpenedAt: userReadT1,
    lastEngagedAt: userReadT1,
    completedAt: userReadT1,
    progressPercentage: 100,
    audioPositionSeconds: 0,
    isCompleted: true,
  });
  console.log('   ✓ User read Article 1 at T1 (2026-09-24).');

  // Step 2B: Query getChangesSinceLastRead for Fuel Cycle story
  const tpResult = await storyTimelineService.getChangesSinceLastRead(uid, TP_STORY_ID);
  console.log('   Derived Since-Last-Read Result for Fuel Cycle:');
  console.log(`     - meaningfulUpdateCount: ${tpResult.meaningfulUpdateCount}`);
  console.log(`     - meaningfulChangeCount: ${tpResult.meaningfulChangeCount}`);
  for (const chg of tpResult.changes) {
    console.log(`       * [${chg.type}] ${chg.subject}: ${chg.previousValue} -> ${chg.newValue} (userFacing=${chg.userFacing})`);
  }

  // Assertions for True Positive
  if (tpResult.meaningfulUpdateCount !== 1) {
    throw new Error(`Expected meaningfulUpdateCount == 1, got ${tpResult.meaningfulUpdateCount}`);
  }
  if (tpResult.meaningfulChangeCount !== 1) {
    throw new Error(`Expected meaningfulChangeCount == 1, got ${tpResult.meaningfulChangeCount}`);
  }
  if (tpResult.changes[0].subject !== 'Planned Workforce' || tpResult.changes[0].newValue !== '120 employees') {
    throw new Error(`Expected Planned Workforce 50 -> 120, got ${JSON.stringify(tpResult.changes[0])}`);
  }
  console.log('   >> PASS: True-positive value change (50 -> 120 employees) correctly surfaced while 2 suppressed details were ignored.');

  // Step 2C: User advances reading to Article 2 on Sep 27 (T3 > T2)
  console.log('\n--- Step 2C: User advances reading to Article 2 on Sep 27 ---');
  const userReadT3 = Timestamp.fromDate(new Date('2026-09-27T12:00:00.000Z'));
  await setDoc(tpReadingRef2, {
    articleId: TP_ART_2,
    userId: uid,
    openedAt: userReadT3,
    lastOpenedAt: userReadT3,
    lastEngagedAt: userReadT3,
    completedAt: userReadT3,
    progressPercentage: 100,
    audioPositionSeconds: 0,
    isCompleted: true,
  });
  console.log('   ✓ User read Article 2 at T3 (2026-09-27).');

  const tpResultAfterT3 = await storyTimelineService.getChangesSinceLastRead(uid, TP_STORY_ID);
  console.log(`   Updates since T3: meaningfulChangeCount = ${tpResultAfterT3.meaningfulChangeCount}`);
  if (tpResultAfterT3.meaningfulChangeCount !== 0) {
    throw new Error(`Expected 0 unread changes after reading Article 2, got ${tpResultAfterT3.meaningfulChangeCount}`);
  }
  console.log('   >> PASS: Story state is All Caught Up (0 unread meaningful changes).');

  console.log('\n============================================================');
  console.log('✅ ALL LIVE CONTINUITY & "SINCE YOU LAST READ" TESTS PASSED');
  console.log('============================================================');

  await terminate(db);
  await deleteApp(app);
}

runLiveSinceYouLastReadTest().catch((err) => {
  console.error('Runtime test failed:', err);
  process.exit(1);
});
