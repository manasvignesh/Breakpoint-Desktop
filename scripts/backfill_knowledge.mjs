import { performance } from 'perf_hooks';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  terminate,
} from 'firebase/firestore';
import { canonicalEntityService } from '../src/services/canonicalEntityService.ts';
import { canonicalConceptService } from '../src/services/canonicalConceptService.ts';
import { knowledgeTrailService } from '../src/services/knowledgeTrailService.ts';
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

const app = initializeApp(firebaseConfig, 'backfill-knowledge-app');
const auth = getAuth(app);
const db = getFirestore(app);

const isDryRun = !process.argv.includes('--apply-reviewed');

async function runBackfill() {
  console.log('========================================================');
  console.log('PHASE 16D: KNOWLEDGE GRAPH & TRAILS ENRICHMENT BACKFILL');
  console.log(`MODE: ${isDryRun ? 'SHADOW DRY-RUN (0 WRITES)' : 'APPLY REVIEWED'}`);
  console.log('========================================================\n');

  const overallStart = performance.now();

  // 1. Authenticate
  const testEmail = process.env.TEST_USER_EMAIL || 'breakpoint.desktop.test@gmail.com';
  const testPassword = process.env.TEST_USER_PASSWORD;
  if (!testPassword) {
    throw new Error('TEST_USER_PASSWORD environment variable is required');
  }

  await signInWithEmailAndPassword(auth, testEmail, testPassword);
  console.log(`✓ Authenticated as ${testEmail}`);

  // 2. Fetch Published Articles
  const fetchStart = performance.now();
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, where('status', 'in', ['approved', 'published']));
  const snapshot = await getDocs(q);
  const fetchDuration = (performance.now() - fetchStart).toFixed(1);

  const rawArticles = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(art => art.category !== 'Reel');

  console.log(`[PERF] fetch articles: ${rawArticles.length} documents in ${fetchDuration} ms\n`);

  // 3. Process Articles
  const entityUsage = new Map();
  const conceptUsage = new Map();
  const trailRecommendations = new Map();

  let enrichedCount = 0;
  const procStart = performance.now();

  for (const article of rawArticles) {
    const text = [
      article.title || article.headline || '',
      article.quick_brief?.quick_summary || '',
      article.full_article?.what_happened || '',
      article.full_article?.why_this_matters || '',
    ].join(' ');

    const entities = canonicalEntityService.extractCanonicalEntities(text);
    const concepts = canonicalConceptService.extractCanonicalConcepts(text);

    for (const ent of entities) {
      entityUsage.set(ent.id, (entityUsage.get(ent.id) || 0) + 1);
    }
    for (const con of concepts) {
      conceptUsage.set(con.id, (conceptUsage.get(con.id) || 0) + 1);
    }

    if (entities.length > 0 || concepts.length > 0) {
      enrichedCount++;
      const conceptIds = concepts.map(c => c.id);
      const trails = await knowledgeTrailService.getTrailsForStory(article.id, conceptIds);
      for (const t of trails) {
        trailRecommendations.set(t.id, (trailRecommendations.get(t.id) || 0) + 1);
      }
    }
  }

  const procDuration = (performance.now() - procStart).toFixed(1);

  console.log('--- ENRICHMENT SUMMARY ---');
  console.log(`- Total Live Articles Analyzed:     ${rawArticles.length}`);
  console.log(`- Articles Enriched with Knowledge: ${enrichedCount} (${((enrichedCount / rawArticles.length) * 100).toFixed(1)}%)`);
  console.log(`- Unique Canonical Entities Linked: ${entityUsage.size}`);
  console.log(`- Unique Canonical Concepts Linked: ${conceptUsage.size}`);
  console.log(`- Knowledge Trails Matched:         ${trailRecommendations.size}`);
  console.log(`[PERF] total enrichment processing: ${procDuration} ms`);

  console.log('\nTop Discovered Canonical Entities:');
  const sortedEntities = Array.from(entityUsage.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [entId, count] of sortedEntities) {
    const ent = canonicalEntityService.getAllCanonicalEntities().find(e => e.id === entId);
    console.log(`  - ${ent?.canonicalName || entId} (${entId}): ${count} articles`);
  }

  console.log('\nTop Discovered Canonical Concepts:');
  const sortedConcepts = Array.from(conceptUsage.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [conId, count] of sortedConcepts) {
    const con = canonicalConceptService.getAllCanonicalConcepts().find(c => c.id === conId);
    console.log(`  - ${con?.name || conId} (${conId}): ${count} articles`);
  }

  const totalDuration = (performance.now() - overallStart).toFixed(1);
  console.log(`\n========================================================`);
  console.log(`✅ SHADOW BACKFILL COMPLETED IN ${totalDuration} ms with 0 errors.`);
  console.log(`========================================================`);

  await terminate(db);
  process.exit(0);
}

runBackfill().catch(async err => {
  console.error('Backfill error:', err);
  await terminate(db);
  process.exit(1);
});
