import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key && !key.startsWith('#')) env[key] = val;
  }
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
});

const auth = getAuth(app);
const db = getFirestore(app);

function loadJson(relPath) {
  const raw = fs.readFileSync(path.join(__dirname, relPath), 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

// Load candidates from fixtures
const candidateEntities = loadJson('fixtures/knowledge/canonicalEntities.json');
const candidateConcepts = loadJson('fixtures/knowledge/canonicalConcepts.json');
const candidateTrails = loadJson('fixtures/knowledge/canonicalTrails.json');

async function main() {
  console.log('==================================================');
  console.log('PHASE 16F.9: CANONICAL KNOWLEDGE MIGRATION & REVIEW');
  console.log('==================================================\n');

  // 1. REVIEW ENTITIES
  console.log('--- 1. REVIEWING CANONICAL ENTITIES ---');
  const reviewedEntities = [];
  const rejectedEntities = [];
  const seenEntityIds = new Set();

  for (const ent of candidateEntities) {
    if (!ent.id || !ent.id.startsWith('ent_')) {
      rejectedEntities.push({ id: ent.id, reason: 'Invalid ID prefix' });
      continue;
    }
    if (seenEntityIds.has(ent.id)) {
      rejectedEntities.push({ id: ent.id, reason: 'Duplicate ID' });
      continue;
    }
    if (!ent.canonicalName || ent.canonicalName.length < 2) {
      rejectedEntities.push({ id: ent.id, reason: 'Missing/short canonicalName' });
      continue;
    }
    if (!ent.shortDescription || ent.shortDescription.length < 10) {
      rejectedEntities.push({ id: ent.id, reason: 'Missing/insufficient shortDescription' });
      continue;
    }
    seenEntityIds.add(ent.id);
    reviewedEntities.push(ent);
  }

  console.log(`Total Entity Candidates: ${candidateEntities.length}`);
  console.log(`Approved Entities: ${reviewedEntities.length}`);
  console.log(`Rejected Entities: ${rejectedEntities.length}`);

  // 2. REVIEW CONCEPTS
  console.log('\n--- 2. REVIEWING CANONICAL CONCEPTS ---');
  const reviewedConcepts = [];
  const rejectedConcepts = [];
  const seenConceptIds = new Set();

  for (const con of candidateConcepts) {
    if (!con.id || !con.id.startsWith('con_')) {
      rejectedConcepts.push({ id: con.id, reason: 'Invalid ID prefix' });
      continue;
    }
    if (seenConceptIds.has(con.id)) {
      rejectedConcepts.push({ id: con.id, reason: 'Duplicate ID' });
      continue;
    }
    if (!con.name || con.name.length < 2) {
      rejectedConcepts.push({ id: con.id, reason: 'Missing/short name' });
      continue;
    }
    if (!con.shortDefinition || con.shortDefinition.length < 15) {
      rejectedConcepts.push({ id: con.id, reason: 'Missing/insufficient definition' });
      continue;
    }
    const lowerDef = con.shortDefinition.toLowerCase();
    if (lowerDef.startsWith('today') || lowerDef.startsWith('yesterday') || lowerDef.includes('breaking news')) {
      rejectedConcepts.push({ id: con.id, reason: 'Temporal / news headline phrasing' });
      continue;
    }
    seenConceptIds.add(con.id);
    reviewedConcepts.push(con);
  }

  console.log(`Total Concept Candidates: ${candidateConcepts.length}`);
  console.log(`Approved Concepts: ${reviewedConcepts.length}`);
  console.log(`Rejected Concepts: ${rejectedConcepts.length}`);

  // 3. REVIEW TRAILS
  console.log('\n--- 3. REVIEWING KNOWLEDGE TRAILS ---');
  const reviewedTrails = [];
  const rejectedTrails = [];
  const seenTrailIds = new Set();

  for (const trail of candidateTrails) {
    if (!trail.id || !trail.id.startsWith('trail_')) {
      rejectedTrails.push({ id: trail.id, reason: 'Invalid ID prefix' });
      continue;
    }
    if (seenTrailIds.has(trail.id)) {
      rejectedTrails.push({ id: trail.id, reason: 'Duplicate ID' });
      continue;
    }
    if (!trail.steps || trail.steps.length < 2 || trail.steps.length > 6) {
      rejectedTrails.push({ id: trail.id, reason: `Invalid step count (${trail.steps?.length}) - required 2-6` });
      continue;
    }

    const stepConcepts = new Set();
    let hasInvalidRef = false;
    let invalidRefReason = '';

    for (const step of trail.steps) {
      if (!seenConceptIds.has(step.conceptId)) {
        hasInvalidRef = true;
        invalidRefReason = `Step references non-existent concept: ${step.conceptId}`;
        break;
      }
      if (stepConcepts.has(step.conceptId)) {
        hasInvalidRef = true;
        invalidRefReason = `Duplicate concept in trail steps: ${step.conceptId}`;
        break;
      }
      stepConcepts.add(step.conceptId);
    }

    if (hasInvalidRef) {
      rejectedTrails.push({ id: trail.id, reason: invalidRefReason });
      continue;
    }

    seenTrailIds.add(trail.id);
    reviewedTrails.push(trail);
  }

  console.log(`Total Trail Candidates: ${candidateTrails.length}`);
  console.log(`Approved Trails: ${reviewedTrails.length}`);
  console.log(`Rejected Trails: ${rejectedTrails.length}`);

  // 4. WRITE REVIEWED RECORDS
  console.log('\n--- 4. AUTHENTICATING AND APPLYING TO FIRESTORE ---');
  const cred = await signInWithEmailAndPassword(auth, env.TARGET_CREATOR_EMAIL, env.TARGET_CREATOR_PASSWORD);
  console.log('Authenticated user:', cred.user.uid, `(${env.TARGET_CREATOR_EMAIL})`);

  let entityCount = 0;
  for (const ent of reviewedEntities) {
    await setDoc(doc(db, 'entities', ent.id), {
      ...ent,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    entityCount++;
  }
  console.log(`Successfully migrated ${entityCount} entities to /entities`);

  let conceptCount = 0;
  for (const con of reviewedConcepts) {
    await setDoc(doc(db, 'concepts', con.id), {
      ...con,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    conceptCount++;
  }
  console.log(`Successfully migrated ${conceptCount} concepts to /concepts`);

  let trailCount = 0;
  for (const trail of reviewedTrails) {
    await setDoc(doc(db, 'knowledgeTrails', trail.id), {
      ...trail,
      status: 'published',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    trailCount++;
  }
  console.log(`Successfully migrated ${trailCount} knowledge trails to /knowledgeTrails`);

  // 5. VERIFY RUNTIME COUNTS
  console.log('\n--- 5. VERIFYING LIVE FIRESTORE COUNTS ---');
  const entSnap = await getDocs(collection(db, 'entities'));
  console.log(`Live /entities: ${entSnap.docs.length} documents`);

  const conSnap = await getDocs(collection(db, 'concepts'));
  console.log(`Live /concepts: ${conSnap.docs.length} documents`);

  const trailSnap = await getDocs(collection(db, 'knowledgeTrails'));
  console.log(`Live /knowledgeTrails: ${trailSnap.docs.length} documents`);

  // 6. VERIFY READER SECURITY RULES
  console.log('\n--- 6. VERIFYING SECURITY RULES FOR NON-CREATOR / PUBLIC READER ---');
  await auth.signOut();
  console.log('Signed out auth - testing as unauthenticated / non-creator reader');

  // Normal reader read check
  const readerEntSnap = await getDocs(collection(db, 'entities'));
  console.log(`Reader READ entities: ALLOWED (${readerEntSnap.docs.length} docs retrieved)`);

  // Normal reader write check (must be DENIED)
  try {
    await setDoc(doc(db, 'entities', 'ent_malicious_test'), {
      canonicalName: 'Malicious Entity',
      type: 'company'
    });
    console.error('ERROR: Non-creator reader write was PERMITTED (Security Violation!)');
    process.exit(1);
  } catch (secErr) {
    console.log('Reader WRITE entities: DENIED (Code:', secErr.code || secErr.message, '- Correct security enforcement)');
  }

  console.log('\n=== CANONICAL KNOWLEDGE MIGRATION COMPLETED SUCCESSFULLY ===');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
