import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { scoreCandidate } from '../src/services/dailyBriefRanking.ts';

console.log('===============================================================');
console.log('TEST: REAL ARTICLE QUALITY THRESHOLD & NEGATIVES EVALUATION');
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

async function runQualityEvaluation() {
  const postsRef = collection(db, 'posts');
  const qA = query(postsRef, where('status', '==', 'approved'), limit(25));
  const snap = await getDocs(qA);

  const posts = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.category !== 'reel') {
      posts.push({ id: d.id, ...data });
    }
  });

  const sampleArticles = posts.slice(0, 12);
  const userCtx = {
    userId: 'user_quality_eval',
    followedEntityIds: new Set(['ent_tcs', 'ent_salesforce']),
    followedTopics: new Set(['ai']),
    readingHistory: new Map(),
    storyReadHistory: new Map(),
    knowledgeFamiliarity: new Map(),
    activeTrailIds: new Set(),
    completedTrailIds: new Set(),
  };

  console.log(`Evaluating ${sampleArticles.length} Real Production Articles:\n`);

  sampleArticles.forEach((art, idx) => {
    const candidate = {
      id: `cand_${art.id}`,
      type: 'article',
      articleId: art.id,
      title: art.title || 'Untitled',
      summary: art.summary || art.description || '',
      category: art.category || 'General',
      publishedAt: art.publishedAt || art.createdAt || new Date().toISOString(),
      editorialImportance: typeof art.editorialImportance === 'number' ? art.editorialImportance : (art.isFeatured || art.isBreaking ? 0.8 : 0.5),
      entityIds: art.entityIds || art.entities || [],
      conceptIds: art.conceptIds || art.concepts || [],
      topicTags: art.tags || art.topicTags || [],
      readTimeMinutes: art.readTimeMinutes || 2,
    };

    const scored = scoreCandidate(candidate, userCtx);
    const d = scored.decomposition;

    console.log(`[#${idx + 1}] ID: ${art.id}`);
    console.log(`     Title:     ${art.title}`);
    console.log(`     Category:  ${art.category}`);
    console.log(`     Editorial: ${candidate.editorialImportance} (Score: ${d.editorialImportanceScore})`);
    console.log(`     Freshness: Score: ${d.freshnessScore}`);
    console.log(`     Follow/Interest: Follow: ${d.followScore}, Interest: ${d.interestScore}`);
    console.log(`     Total Score: ${d.totalScore}`);
    console.log(`     ReasonCode:  ${scored.reasonCode}`);
    console.log('--------------------------------------------------------------------------------');
  });
}

runQualityEvaluation().catch(console.error);
