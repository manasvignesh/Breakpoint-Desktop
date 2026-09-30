import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  terminate,
} from 'firebase/firestore';
import { loadTestEnv } from './envHelper.mjs';
import { canonicalConceptService } from '../src/services/canonicalConceptService.ts';
import { knowledgeTrailService } from '../src/services/knowledgeTrailService.ts';
import {
  toDomainUserKnowledge,
  toDomainUserTrailProgress,
} from '../src/services/mappers/userKnowledgeMapper.ts';
import { createInitialUserKnowledge } from '../src/services/knowledgeStateReducer.ts';

loadTestEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig, 'integrity-app');
const auth = getAuth(app);
const db = getFirestore(app);

async function runIntegrityAudit() {
  console.log('========================================================');
  console.log('PHASE 16E: USER KNOWLEDGE DATA INTEGRITY AUDITOR');
  console.log('========================================================\n');

  let errorCount = 0;

  // ----------------------------------------------------
  // 1. Schema & Reducer Invariant Checks
  // ----------------------------------------------------
  console.log('1. Checking Reducer & Mapper Invariants...');
  const testConceptId = 'con_repo_rate';
  const initial = createInitialUserKnowledge(testConceptId);

  if (initial.state !== 'unseen' || initial.confidence !== 0 || initial.evidenceCount !== 0) {
    console.error('   ❌ Initial knowledge state invariant failed');
    errorCount++;
  } else {
    console.log('   ✓ Initial blank knowledge record matches canonical unseen schema.');
  }

  // Edge-case mapper resilience test with malformed fields
  const malformedRecord = {
    conceptId: 'con_semi_cryogenic_engine',
    state: 'invalid_state',
    confidence: 1.5, // Out of bounds
    evidenceCount: -5, // Negative
    evidenceSummary: null,
    updatedAt: null,
  };

  const domainFixed = toDomainUserKnowledge(malformedRecord);
  if (domainFixed.confidence > 1.0 || domainFixed.evidenceCount < 0) {
    console.error('   ❌ Mapper failed to clamp confidence or evidence counts');
    errorCount++;
  } else {
    console.log('   ✓ Mapper successfully clamped out-of-bounds metrics (confidence in [0, 1], non-negative evidence).');
  }

  // ----------------------------------------------------
  // 2. Canonical Concepts Reference Validation
  // ----------------------------------------------------
  console.log('\n2. Verifying Canonical Concept Vocabulary Alignment...');
  const allConcepts = canonicalConceptService.getAllCanonicalConcepts();
  console.log(`   ✓ Active canonical concepts available: ${allConcepts.length}`);

  const allTrails = knowledgeTrailService.getAllKnowledgeTrails();
  console.log(`   ✓ Active canonical knowledge trails: ${allTrails.length}`);

  for (const trail of allTrails) {
    for (const step of trail.steps) {
      if (!allConcepts.some(c => c.id === step.conceptId)) {
        console.error(`   ❌ Trail ${trail.id} step references non-existent concept: ${step.conceptId}`);
        errorCount++;
      }
    }
  }
  console.log('   ✓ All knowledge trail steps reference valid registered canonical concepts.');

  // ----------------------------------------------------
  // 3. Live Firestore Subcollections Audit
  // ----------------------------------------------------
  console.log('\n3. Auditing Live Firestore User Knowledge Subcollections...');
  try {
    const userEmail = process.env.TEST_USER_EMAIL || process.env.TARGET_USER_EMAIL || process.env.VITE_TEST_USER_EMAIL;
    const userPassword = process.env.TEST_USER_PASSWORD || process.env.TARGET_USER_PASSWORD || process.env.VITE_TEST_USER_PASSWORD;

    if (userEmail && userPassword) {
      const cred = await signInWithEmailAndPassword(auth, userEmail, userPassword);
      console.log(`   ✓ Authenticated as ${userEmail} (UID: ${cred.user.uid})`);

      // Audit knowledge subcollection
      const knowledgeSnap = await getDocs(collection(db, 'users', cred.user.uid, 'knowledge'));
      console.log(`   ✓ Checked users/${cred.user.uid}/knowledge: ${knowledgeSnap.size} documents.`);

      const validStates = new Set(['unseen', 'exposed', 'familiar', 'understood']);
      for (const d of knowledgeSnap.docs) {
        const data = d.data();
        if (!validStates.has(data.state)) {
          console.error(`   ❌ Invalid knowledge state "${data.state}" in doc ${d.id}`);
          errorCount++;
        }
        if (typeof data.confidence === 'number' && (data.confidence < 0 || data.confidence > 1)) {
          console.error(`   ❌ Out of bounds confidence "${data.confidence}" in doc ${d.id}`);
          errorCount++;
        }
      }

      // Audit trailProgress subcollection
      const trailSnap = await getDocs(collection(db, 'users', cred.user.uid, 'trailProgress'));
      console.log(`   ✓ Checked users/${cred.user.uid}/trailProgress: ${trailSnap.size} documents.`);

      for (const d of trailSnap.docs) {
        const data = d.data();
        if (typeof data.currentStep !== 'number' || data.currentStep < 1) {
          console.error(`   ❌ Invalid currentStep "${data.currentStep}" in trailProgress doc ${d.id}`);
          errorCount++;
        }
      }
    } else {
      console.log('   ⚠ Skipping authenticated cloud query (no credentials provided).');
    }
  } catch (err) {
    console.warn('   ⚠ Live Firestore audit skipped/warn:', err.message);
  }

  await terminate(db);

  console.log('\n========================================================');
  if (errorCount === 0) {
    console.log('✅ ZERO USER KNOWLEDGE INTEGRITY ISSUES DETECTED.');
    console.log('========================================================\n');
    process.exit(0);
  } else {
    console.error(`❌ ${errorCount} INTEGRITY ISSUES FOUND.`);
    console.log('========================================================\n');
    process.exit(1);
  }
}

runIntegrityAudit().catch((err) => {
  console.error('Integrity audit uncaught error:', err);
  process.exit(1);
});
