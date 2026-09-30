import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  terminate,
} from 'firebase/firestore';
import { loadTestEnv } from './envHelper.mjs';
import { reduceKnowledgeState, createInitialUserKnowledge } from '../src/services/knowledgeStateReducer.ts';
import {
  toDomainUserKnowledge,
  toTransportUserKnowledge,
  toDomainUserTrailProgress,
  toTransportUserTrailProgress,
} from '../src/services/mappers/userKnowledgeMapper.ts';

loadTestEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig, 'runtime-user-knowledge-app');
const auth = getAuth(app);
const db = getFirestore(app);

async function runRuntimeValidation() {
  console.log('========================================================');
  console.log('PHASE 16E: REAL RUNTIME USER KNOWLEDGE VALIDATION');
  console.log('========================================================\n');

  const userEmail = process.env.TEST_USER_EMAIL || process.env.TARGET_USER_EMAIL || process.env.VITE_TEST_USER_EMAIL;
  const userPassword = process.env.TEST_USER_PASSWORD || process.env.TARGET_USER_PASSWORD || process.env.VITE_TEST_USER_PASSWORD;

  if (!userEmail || !userPassword) {
    console.warn('⚠ Skipping live runtime tests: TARGET_USER_EMAIL or TARGET_USER_PASSWORD not set.');
    await terminate(db);
    process.exit(0);
  }

  const cred = await signInWithEmailAndPassword(auth, userEmail, userPassword);
  const uid = cred.user.uid;
  console.log(`✓ Authenticated as ${userEmail} (UID: ${uid})\n`);

  let testPassed = true;

  // ----------------------------------------------------
  // 1. POSITIVE RUNTIME SCENARIO
  // ----------------------------------------------------
  console.log('--- 1. POSITIVE RUNTIME SCENARIO ---');
  const posConceptId = 'con_repo_rate';
  const posDocRef = doc(db, 'users', uid, 'knowledge', posConceptId);

  // 1.1 Reset
  await deleteDoc(posDocRef);
  let snap = await getDoc(posDocRef);
  if (!snap.exists()) {
    console.log('  [PASS] 1.1 Concept starts clean/unseen.');
  } else {
    console.error('  [FAIL] 1.1 Delete failed.');
    testPassed = false;
  }

  // 1.2 Article Completed (Primary) -> Exposed
  let state = reduceKnowledgeState(null, {
    type: 'ARTICLE_COMPLETED',
    conceptId: posConceptId,
    conceptCentrality: 'primary',
    occurredAt: new Date().toISOString(),
  });
  await setDoc(posDocRef, toTransportUserKnowledge(state), { merge: true });

  snap = await getDoc(posDocRef);
  let cloudState = toDomainUserKnowledge({ ...snap.data(), conceptId: snap.id });
  if (cloudState.state === 'exposed' && cloudState.confidence >= 0.60) {
    console.log(`  [PASS] 1.2 Primary article completed promoted state to "${cloudState.state}" (confidence: ${cloudState.confidence}).`);
  } else {
    console.error(`  [FAIL] 1.2 Expected exposed, got ${cloudState.state}`);
    testPassed = false;
  }

  // 1.3 Trail Step Completed -> Familiar
  state = reduceKnowledgeState(state, {
    type: 'TRAIL_STEP_COMPLETED',
    conceptId: posConceptId,
    sourceTrailId: 'trail_monetary_policy',
    occurredAt: new Date().toISOString(),
  });
  await setDoc(posDocRef, toTransportUserKnowledge(state), { merge: true });

  snap = await getDoc(posDocRef);
  cloudState = toDomainUserKnowledge({ ...snap.data(), conceptId: snap.id });
  if (cloudState.state === 'familiar' && cloudState.confidence >= 0.75) {
    console.log(`  [PASS] 1.3 Knowledge trail step promoted state to "${cloudState.state}" (confidence: ${cloudState.confidence}).`);
  } else {
    console.error(`  [FAIL] 1.3 Expected familiar, got ${cloudState.state}`);
    testPassed = false;
  }

  // 1.4 User Override "I know this" -> Understood
  state = reduceKnowledgeState(state, {
    type: 'USER_KNOWS_CONCEPT',
    conceptId: posConceptId,
    occurredAt: new Date().toISOString(),
  });
  await setDoc(posDocRef, toTransportUserKnowledge(state), { merge: true });

  snap = await getDoc(posDocRef);
  cloudState = toDomainUserKnowledge({ ...snap.data(), conceptId: snap.id });
  if (cloudState.state === 'understood' && cloudState.explicitUserState === 'know_this') {
    console.log(`  [PASS] 1.4 Explicit "I know this" override promoted state to "${cloudState.state}" (confidence: ${cloudState.confidence}).`);
  } else {
    console.error(`  [FAIL] 1.4 Expected understood with explicit override, got ${cloudState.state}`);
    testPassed = false;
  }

  // ----------------------------------------------------
  // 2. NEGATIVE RUNTIME SCENARIO (Zero Overpromotion)
  // ----------------------------------------------------
  console.log('\n--- 2. NEGATIVE RUNTIME SCENARIO ---');
  const negConceptId = 'con_waterless_cooling';
  const negDocRef = doc(db, 'users', uid, 'knowledge', negConceptId);

  await deleteDoc(negDocRef);

  // 2.1 Incidental Mention -> Stays Unseen
  let negState = reduceKnowledgeState(null, {
    type: 'ARTICLE_COMPLETED',
    conceptId: negConceptId,
    conceptCentrality: 'incidental',
    occurredAt: new Date().toISOString(),
  });

  if (negState.state === 'unseen') {
    console.log('  [PASS] 2.1 Incidental article mention strictly kept state at "unseen".');
  } else {
    console.error(`  [FAIL] 2.1 Expected unseen, got ${negState.state}`);
    testPassed = false;
  }

  // 2.2 Explanation Requests -> Curiosity Only (Never Understood)
  negState = reduceKnowledgeState(negState, {
    type: 'EXPLANATION_REQUESTED',
    conceptId: negConceptId,
    occurredAt: new Date().toISOString(),
  });
  negState = reduceKnowledgeState(negState, {
    type: 'CONCEPT_OPENED',
    conceptId: negConceptId,
    occurredAt: new Date().toISOString(),
  });
  await setDoc(negDocRef, toTransportUserKnowledge(negState), { merge: true });

  snap = await getDoc(negDocRef);
  cloudState = toDomainUserKnowledge({ ...snap.data(), conceptId: snap.id });
  if (cloudState.state === 'exposed' && cloudState.state !== 'understood') {
    console.log(`  [PASS] 2.2 Explanation requests marked state as "${cloudState.state}" (curiosity recorded, never overpromoted to understood).`);
  } else {
    console.error(`  [FAIL] 2.2 Overpromoted to ${cloudState.state}`);
    testPassed = false;
  }

  // ----------------------------------------------------
  // 3. CROSS-DEVICE TRAIL PROGRESS SCENARIO
  // ----------------------------------------------------
  console.log('\n--- 3. CROSS-DEVICE TRAIL PROGRESS SCENARIO ---');
  const trailId = 'trail_space_propulsion';
  const trailDocRef = doc(db, 'users', uid, 'trailProgress', trailId);

  await deleteDoc(trailDocRef);

  // 3.1 Start Trail & Complete Steps 1 and 2
  const now = new Date().toISOString();
  const stepProgress = {
    trailId,
    currentStep: 3,
    completedStepIds: ['con_thrust', 'con_rocket_propulsion'],
    startedAt: now,
    lastInteractedAt: now,
    completedAt: null,
    updatedAt: now,
  };
  await setDoc(trailDocRef, toTransportUserTrailProgress(stepProgress), { merge: true });

  snap = await getDoc(trailDocRef);
  let cloudTrail = toDomainUserTrailProgress({ ...snap.data(), trailId: snap.id });
  if (cloudTrail.currentStep === 3 && cloudTrail.completedStepIds.length === 2 && !cloudTrail.completedAt) {
    console.log(`  [PASS] 3.1 Trail progress synchronized: Active at Step ${cloudTrail.currentStep} with ${cloudTrail.completedStepIds.length} completed steps.`);
  } else {
    console.error('  [FAIL] 3.1 Trail progress mismatch:', cloudTrail);
    testPassed = false;
  }

  // 3.2 Complete Final Step
  const completionTime = new Date().toISOString();
  const completedProgress = {
    ...stepProgress,
    currentStep: 5,
    completedStepIds: ['con_thrust', 'con_rocket_propulsion', 'con_cryogenic_engine', 'con_semi_cryogenic_engine', 'con_payload_capacity'],
    completedAt: completionTime,
    lastInteractedAt: completionTime,
    updatedAt: completionTime,
  };
  await setDoc(trailDocRef, toTransportUserTrailProgress(completedProgress), { merge: true });

  snap = await getDoc(trailDocRef);
  cloudTrail = toDomainUserTrailProgress({ ...snap.data(), trailId: snap.id });
  if (cloudTrail.completedAt && cloudTrail.completedStepIds.length === 5) {
    console.log(`  [PASS] 3.2 Trail marked completed with ${cloudTrail.completedStepIds.length} steps at ${cloudTrail.completedAt}.`);
  } else {
    console.error('  [FAIL] 3.2 Trail completion failed:', cloudTrail);
    testPassed = false;
  }

  // ----------------------------------------------------
  // 4. CLEANUP TEST DATA
  // ----------------------------------------------------
  await deleteDoc(posDocRef);
  await deleteDoc(negDocRef);
  await deleteDoc(trailDocRef);
  console.log('\n✓ Test records cleaned up.');

  await terminate(db);

  console.log('\n========================================================');
  if (testPassed) {
    console.log('✅ ALL REAL RUNTIME USER KNOWLEDGE TESTS PASSED.');
    console.log('========================================================\n');
    process.exit(0);
  } else {
    console.error('❌ RUNTIME VALIDATION FAILED.');
    console.log('========================================================\n');
    process.exit(1);
  }
}

runRuntimeValidation().catch((err) => {
  console.error('Runtime validation uncaught error:', err);
  process.exit(1);
});
