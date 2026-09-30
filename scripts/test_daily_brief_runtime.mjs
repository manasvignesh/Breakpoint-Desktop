import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { scoreCandidate, rankBrief, isMaterialUserFacingChange } from '../src/services/dailyBriefRanking.ts';

console.log('===============================================================');
console.log('TEST: REAL RUNTIME DAILY BRIEF GENERATION & SCORE DECOMPOSITION');
console.log('===============================================================\n');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDucWzTVZomZYsXyWZ83ygCSJOCArOBzIs',
  authDomain: 'cie-connect.firebaseapp.com',
  projectId: 'cie-connect',
  storageBucket: 'cie-connect.firebasestorage.app',
  messagingSenderId: '226102698550',
  appId: '1:226102698550:web:453d7032cec3231a6dee97',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runRuntimeTest() {
  console.log('[1/4] Querying candidate posts from production Firestore...');

  const postsRef = collection(db, 'posts');
  // Separate approved and published queries
  const qApproved = query(postsRef, where('status', '==', 'approved'), limit(25));
  const qPublished = query(postsRef, where('status', '==', 'published'), limit(25));

  const [snapA, snapP] = await Promise.all([getDocs(qApproved), getDocs(qPublished)]);
  const postsMap = new Map();

  for (const docSnap of [...snapA.docs, ...snapP.docs]) {
    const data = docSnap.data();
    if (data.category === 'reel') continue;
    postsMap.set(docSnap.id, { id: docSnap.id, ...data });
  }

  const candidatePosts = Array.from(postsMap.values()).sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  console.log(`  ✓ Found ${candidatePosts.length} candidate articles`);

  // [2/4] Collect relevant story IDs and fetch stories & updates
  const storyIds = new Set();
  candidatePosts.forEach((p) => {
    if (p.storyId) storyIds.add(p.storyId);
  });
  console.log(`  ✓ Found ${storyIds.size} unique referenced stories`);

  const storiesMap = new Map();
  const storyUpdatesMap = new Map();

  for (const sId of storyIds) {
    try {
      const storySnap = await getDocs(query(collection(db, 'stories'), where('__name__', '==', sId)));
      if (!storySnap.empty) {
        storiesMap.set(sId, { id: sId, ...storySnap.docs[0].data() });
      }

      const updatesSnap = await getDocs(query(collection(db, 'stories', sId, 'updates'), limit(10)));
      const updates = [];
      updatesSnap.forEach((uDoc) => {
        const uData = uDoc.data();
        const rawChanges = Array.isArray(uData.changes)
          ? uData.changes
          : [
              {
                type: uData.changeType || 'new_fact',
                userFacing: uData.userFacing === true,
                subject: uData.subject || uData.field || '',
                description: uData.description || uData.summary || '',
                previousValue: uData.previousValue,
                newValue: uData.newValue,
              },
            ];
        const validChanges = rawChanges.filter(isMaterialUserFacingChange);
        if (validChanges.length > 0) {
          updates.push({
            id: uDoc.id,
            publishedAt: uData.publishedAt || uData.timestamp || new Date().toISOString(),
            changes: validChanges,
          });
        }
      });
      storyUpdatesMap.set(sId, updates);
    } catch (e) {
      console.warn(`Could not fetch story ${sId}:`, e.message);
    }
  }

  // [3/4] Build candidate pool
  const candidates = candidatePosts.map((p) => {
    const story = p.storyId ? storiesMap.get(p.storyId) : null;
    const updates = p.storyId ? (storyUpdatesMap.get(p.storyId) || []) : [];
    const flattenedDeltas = [];
    updates.forEach((u) => {
      u.changes.forEach((c) => {
        flattenedDeltas.push({
          changeType: c.type,
          subject: c.subject,
          description: c.description,
          oldValue: c.previousValue,
          newValue: c.newValue,
          timestamp: u.publishedAt,
          userFacing: true,
        });
      });
    });

    const editorialImportance =
      typeof p.editorialImportance === 'number'
        ? p.editorialImportance
        : p.isFeatured || p.isBreaking
        ? 0.8
        : 0.5;

    return {
      id: `cand_${p.id}`,
      type: flattenedDeltas.length > 0 ? 'story_update' : p.storyId ? 'story' : 'article',
      storyId: p.storyId,
      articleId: p.id,
      title: p.title || 'Untitled',
      summary: p.summary || p.description || '',
      category: p.category || 'General',
      publishedAt: p.publishedAt || p.createdAt || new Date().toISOString(),
      editorialImportance,
      entityIds: p.entityIds || p.entities || [],
      conceptIds: p.conceptIds || p.concepts || [],
      topicTags: p.tags || p.topicTags || [],
      readTimeMinutes: p.readTimeMinutes || 2,
      materialChangesCount: flattenedDeltas.length,
      deltas: flattenedDeltas,
    };
  });

  // [4/4] Rank for realistic user context
  const userContext = {
    userId: 'test_runtime_user',
    followedEntityIds: new Set(['ent_isro', 'ent_spacex', 'ent_skyroot']),
    followedTopics: new Set(['space', 'technology']),
    readingHistory: new Map(),
    storyReadHistory: new Map(),
    knowledgeFamiliarity: new Map(),
    activeTrailIds: new Set(),
    completedTrailIds: new Set(),
  };

  const rankedBrief = rankBrief(candidates, userContext, { minItems: 5, maxItems: 7 });

  console.log('\n===============================================================');
  console.log(`GENERATED RUNTIME DAILY BRIEF (${rankedBrief.length} Items)`);
  console.log('===============================================================\n');

  rankedBrief.forEach((item, idx) => {
    const cand = candidates.find((c) => c.articleId === item.articleId || c.id === item.id);
    const scored = cand ? scoreCandidate(cand, userContext) : null;
    console.log(`[Item ${idx + 1}] ${item.title}`);
    console.log(`  Type:               ${item.type}`);
    console.log(`  Reason:             ${item.reasonCode} (${item.reasonExplanation})`);
    if (item.selectionSignals && item.selectionSignals.length > 0) {
      console.log(`  Signals:            ${item.selectionSignals.join(', ')}`);
    }
    console.log(`  Explanation Mode:   ${item.explanationMode}`);
    console.log(`  Score:              ${item.score}`);
    if (scored && scored.decomposition) {
      const d = scored.decomposition;
      console.log(`  Score Breakdown:    Editorial=${d.editorialImportanceScore} + Freshness=${d.freshnessScore} + Continuing=${d.continuingDeltaScore} + Follow=${d.followScore} + Interest=${d.interestScore} + Knowledge=${d.knowledgeScore} = Total ${d.totalScore}`);
    }
    console.log(`  Category:           ${item.category}`);
    console.log(`  Read Time:          ${item.readTimeMinutes} min`);
    console.log('---------------------------------------------------------------');
  });

  console.log('\n>>> RUNTIME BRIEF GENERATION COMPLETED SUCCESSFULLY <<<');
}

runRuntimeTest().catch((err) => {
  console.error('Runtime generation test error:', err);
  process.exit(1);
});
