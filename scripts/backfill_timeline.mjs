import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, terminate } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { performance } from 'perf_hooks';
import { extractArticleTimelineEvent, mergeTimelineEvent } from '../src/services/timelineExtractionService.ts';
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

let limitFilter = null;
const limitArgIdx = args.indexOf('--limit');
if (limitArgIdx !== -1 && args[limitArgIdx + 1]) {
  limitFilter = parseInt(args[limitArgIdx + 1], 10);
}

const sampleThreads = [
  {
    storyId: 'st_ather_konarc',
    title: 'Ather Energy Konarc Electric Scooter Mass-Market Launch',
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
  {
    storyId: 'st_fuel_cycle_gcc',
    title: 'Fuel Cycle Navi Mumbai GCC Expansion',
    keyword: 'Fuel Cycle',
  },
  {
    storyId: 'st_brics_ai',
    title: 'BRICS New Delhi AI Cooperation Framework',
    keyword: 'BRICS',
  },
  {
    storyId: 'st_phonepe_indus',
    title: 'PhonePe Indus Appstore Android Ecosystem',
    keyword: 'Indus Appstore',
  },
  {
    storyId: 'st_zomato_blinkit',
    title: 'Zomato Blinkit Quick Commerce Expansion',
    keyword: 'Blinkit',
  },
  {
    storyId: 'st_tata_semiconductor',
    title: 'Tata Semiconductor Dholera Fab Construction',
    keyword: 'Dholera',
  },
  {
    storyId: 'st_ola_krigrim',
    title: 'Ola Krutrim Sovereign Cloud & Silicon Architecture',
    keyword: 'Krutrim',
  },
  {
    storyId: 'st_swiggy_instamart',
    title: 'Swiggy Instamart 10-Minute Dark Store Network',
    keyword: 'Instamart',
  },
  {
    storyId: 'st_sarvam_ai',
    title: 'Sarvam AI Open Indic LLM Deployment',
    keyword: 'Sarvam',
  },
];

async function runTimelineBackfill() {
  const overallStart = performance.now();
  console.log('============================================================');
  console.log(`BREAKPOINT STORY TIMELINE BACKFILL (${isDryRun ? 'DRY RUN' : 'LIVE'})`);
  console.log('============================================================');

  // 1. Auth
  const authStart = performance.now();
  console.log(`[PERF] authenticating as ${userEmail}...`);
  await signInWithEmailAndPassword(auth, userEmail, userPass);
  console.log(`[PERF] auth completed in ${(performance.now() - authStart).toFixed(1)}ms`);

  // 2. Fetch Articles
  const fetchStart = performance.now();
  console.log('[PERF] Firestore query: fetching live articles from posts...');
  const postsSnap = await getDocs(
    query(collection(db, 'posts'), where('status', 'in', ['approved', 'published']))
  );
  console.log(`[PERF] Firestore query completed in ${(performance.now() - fetchStart).toFixed(1)}ms`);

  // 3. Construct story groups
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
    if (targets.length === 0) {
      // Dynamic fallback
      targets = [{ storyId: storyFilter, title: storyFilter, keyword: storyFilter.replace(/^st_/, '').replace(/_/g, ' ') }];
    }
  }
  if (limitFilter && limitFilter > 0) {
    targets = targets.slice(0, limitFilter);
  }

  let totalEventsGenerated = 0;
  let totalDeduplicated = 0;

  console.log(`\nProcessing ${targets.length} target story thread(s)...`);

  for (let idx = 0; idx < targets.length; idx++) {
    const thread = targets[idx];
    const storyStart = performance.now();

    const matchingArticles = articles.filter(a => {
      const text = `${a.title || ''} ${a.quick_brief?.headline || ''} ${a.quick_brief?.quick_summary || ''}`;
      return text.toLowerCase().includes(thread.keyword.toLowerCase());
    });

    let timeline = [];
    let extractTime = 0;
    let dedupTime = 0;
    let dedupCount = 0;

    for (const art of matchingArticles) {
      const eStart = performance.now();
      const event = extractArticleTimelineEvent(art, thread.storyId);
      extractTime += (performance.now() - eStart);

      const dStart = performance.now();
      const prevLength = timeline.length;
      timeline = mergeTimelineEvent(timeline, event);
      dedupTime += (performance.now() - dStart);

      if (timeline.length === prevLength) {
        dedupCount++;
        totalDeduplicated++;
      }
    }

    const storyTotalTime = performance.now() - storyStart;
    totalEventsGenerated += timeline.length;

    console.log(`\nStory ${idx + 1}/${targets.length}: ${thread.title} (${thread.storyId})`);
    console.log(`Articles: ${matchingArticles.length}`);
    console.log(`Extraction: ${extractTime.toFixed(1)}ms`);
    console.log(`Dedup: ${dedupTime.toFixed(1)}ms (Merged ${dedupCount} duplicate(s))`);
    console.log(`Total: ${storyTotalTime.toFixed(1)}ms`);

    if (isVerbose || targets.length <= 3) {
      console.log(`  Chronological Timeline Events (${timeline.length}):`);
      for (let i = 0; i < timeline.length; i++) {
        const ev = timeline[i];
        const d = new Date(ev.occurredAt.seconds * 1000).toISOString().split('T')[0];
        console.log(`    [${i + 1}] [${d}] (${ev.type.toUpperCase()}) [${ev.datePrecision}]`);
        console.log(`        Title: ${ev.title}`);
        console.log(`        Summary: ${ev.summary.slice(0, 90)}...`);
        console.log(`        Sources: ${ev.sourceArticleIds.join(', ')}`);
      }
    }
  }

  const totalTime = performance.now() - overallStart;

  console.log('\n============================================================');
  console.log('TIMELINE BACKFILL SUMMARY:');
  console.log(`- Stories Evaluated: ${targets.length}`);
  console.log(`- Total Timeline Events Extracted: ${totalEventsGenerated}`);
  console.log(`- Duplicate Events Successfully Merged: ${totalDeduplicated}`);
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

runTimelineBackfill()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Backfill error:', err);
    process.exit(1);
  });
