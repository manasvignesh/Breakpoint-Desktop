import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, terminate } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { performance } from 'perf_hooks';
import { generateStoryUpdate } from '../src/services/storyDeltaEngine.ts';
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

// CLI Arg Parsing
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--live');
const isVerbose = args.includes('--verbose');

let storyFilter = null;
const storyArgIdx = args.indexOf('--story');
if (storyArgIdx !== -1 && args[storyArgIdx + 1]) {
  storyFilter = args[storyArgIdx + 1];
}

const sampleThreads = [
  {
    storyId: 'st_fuel_cycle_gcc',
    title: 'Fuel Cycle Navi Mumbai GCC Expansion',
    keyword: 'Fuel Cycle',
  },
  {
    storyId: 'st_ather_konarc',
    title: 'Ather Energy Konarc Electric Scooter Launch',
    keyword: 'Konarc',
  },
  {
    storyId: 'st_vigyanlabs_femto',
    title: 'Vigyanlabs FEMTO Sovereign AI Platform',
    keyword: 'FEMTO',
  },
  {
    storyId: 'st_isro_semicryo',
    title: 'ISRO Semi-Cryogenic Rocket Engine Testing',
    keyword: 'Semi-Cryogenic',
  },
];

async function runUpdatesBackfill() {
  const overallStart = performance.now();
  console.log('============================================================');
  console.log(`BREAKPOINT STORY UPDATES & DELTA BACKFILL (${isDryRun ? 'DRY RUN' : 'LIVE'})`);
  console.log('============================================================');

  const authStart = performance.now();
  console.log(`[PERF] authenticating as ${userEmail}...`);
  await signInWithEmailAndPassword(auth, userEmail, userPass);
  console.log(`[PERF] auth completed in ${(performance.now() - authStart).toFixed(1)}ms`);

  const fetchStart = performance.now();
  console.log('[PERF] Firestore query: fetching live articles from posts...');
  const postsSnap = await getDocs(
    query(collection(db, 'posts'), where('status', 'in', ['approved', 'published']))
  );
  console.log(`[PERF] Firestore query completed in ${(performance.now() - fetchStart).toFixed(1)}ms`);

  const groupStart = performance.now();
  console.log('[PERF] construct story groups...');
  const articles = postsSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(a => a.category !== 'Reel');

  // Chronological sort
  articles.sort((a, b) => {
    const aSec = a.publishedAt?.seconds || (a.createdAt?.seconds || 0);
    const bSec = b.publishedAt?.seconds || (b.createdAt?.seconds || 0);
    return aSec - bSec;
  });
  console.log(`[PERF] construct story groups completed in ${(performance.now() - groupStart).toFixed(1)}ms (${articles.length} valid articles).`);

  let targets = sampleThreads;
  if (storyFilter) {
    targets = targets.filter(t => t.storyId === storyFilter || t.storyId.includes(storyFilter));
  }

  let totalUpdatesGenerated = 0;
  let totalChangesFound = 0;

  for (let idx = 0; idx < targets.length; idx++) {
    const thread = targets[idx];
    const storyStart = performance.now();

    const matchingArticles = articles.filter(a => {
      const text = `${a.title || ''} ${a.quick_brief?.headline || ''} ${a.quick_brief?.quick_summary || ''}`;
      return text.toLowerCase().includes(thread.keyword.toLowerCase());
    });

    const history = [];
    let deltaCalcTime = 0;
    let storyUpdates = 0;
    let storyChanges = 0;

    for (let i = 0; i < matchingArticles.length; i++) {
      const curr = matchingArticles[i];
      if (i > 0) {
        const dStart = performance.now();
        const update = generateStoryUpdate(thread.storyId, curr, history);
        deltaCalcTime += (performance.now() - dStart);

        if (update && update.changes.length > 0) {
          totalUpdatesGenerated++;
          storyUpdates++;
          totalChangesFound += update.changes.length;
          storyChanges += update.changes.length;

          if (isVerbose || targets.length <= 4) {
            console.log(`\n  >> DELTA DETECTED in Article #${i + 1} (${curr.id}):`);
            for (const chg of update.changes) {
              console.log(`     [${chg.type.toUpperCase()}] ${chg.subject}: ${chg.description}`);
              if (chg.previousValue !== null && chg.previousValue !== undefined) {
                console.log(`         Previous: ${chg.previousValue} -> New: ${chg.newValue}`);
              }
            }
          }
        }
      }
      history.push(curr);
    }

    const storyTotal = performance.now() - storyStart;
    console.log(`\nStory ${idx + 1}/${targets.length}: ${thread.title} (${thread.storyId})`);
    console.log(`Articles: ${matchingArticles.length}`);
    console.log(`Delta extraction: ${deltaCalcTime.toFixed(1)}ms (${storyUpdates} updates, ${storyChanges} changes)`);
    console.log(`Total: ${storyTotal.toFixed(1)}ms`);
  }

  const totalTime = performance.now() - overallStart;

  console.log('\n============================================================');
  console.log('UPDATES / DELTA BACKFILL SUMMARY:');
  console.log(`- Stories Evaluated: ${targets.length}`);
  console.log(`- Total Story Updates Emitted: ${totalUpdatesGenerated}`);
  console.log(`- Total Material Changes Detected: ${totalChangesFound}`);
  console.log(`- Execution Time: ${totalTime.toFixed(1)}ms`);
  console.log(`- Mode: ${isDryRun ? 'DRY RUN (0 database mutations written)' : 'LIVE'}`);
  console.log('============================================================');

  // Clean Firebase termination
  try {
    await terminate(db);
    await deleteApp(app);
  } catch (e) {
    // ignore
  }
}

runUpdatesBackfill()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Updates backfill error:', err);
    process.exit(1);
  });
