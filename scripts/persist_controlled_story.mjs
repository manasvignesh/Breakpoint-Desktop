import { initializeApp, deleteApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  Timestamp,
  terminate,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { extractArticleTimelineEvent, mergeTimelineEvent } from '../src/services/timelineExtractionService.ts';
import { extractStructuredFacts } from '../src/services/structuredFactService.ts';
import { computeFactDeltas } from '../src/services/storyDeltaEngine.ts';

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

const STORY_ID = 'st_isro_semicryo';
const ARTICLE_1_ID = 'jQ2IssXNX9zSqzVcGy6E'; // Sep 5, 2024
const ARTICLE_2_ID = 'KX0pvxG8rlBFOpB5cvi9'; // Sep 17, 2024

async function persistControlledStory() {
  console.log('============================================================');
  console.log('PHASE 16C.5: PERSIST ONE CONTROLLED REVIEWED STORY');
  console.log('============================================================');

  console.log(`\n1. Authenticating as creator (${userEmail})...`);
  await signInWithEmailAndPassword(auth, userEmail, userPass);
  console.log('   Authenticated successfully.');

  console.log(`\n2. Fetching source articles (${ARTICLE_1_ID}, ${ARTICLE_2_ID})...`);
  const doc1Snap = await getDoc(doc(db, 'posts', ARTICLE_1_ID));
  const doc2Snap = await getDoc(doc(db, 'posts', ARTICLE_2_ID));

  if (!doc1Snap.exists() || !doc2Snap.exists()) {
    throw new Error(`Failed to find articles: doc1Exists=${doc1Snap.exists()}, doc2Exists=${doc2Snap.exists()}`);
  }

  const art1 = { id: doc1Snap.id, ...doc1Snap.data() };
  const art2 = { id: doc2Snap.id, ...doc2Snap.data() };
  console.log(`   Article 1: "${art1.quick_brief?.headline || art1.title}" (${art1.id})`);
  console.log(`   Article 2: "${art2.quick_brief?.headline || art2.title}" (${art2.id})`);

  // 3. Compute timeline events
  console.log('\n3. Extracting and merging timeline events...');
  const ev1 = extractArticleTimelineEvent(art1, STORY_ID);
  const ev2 = extractArticleTimelineEvent(art2, STORY_ID);
  let timeline = mergeTimelineEvent([], ev1);
  timeline = mergeTimelineEvent(timeline, ev2);
  console.log(`   Extracted ${timeline.length} canonical timeline event(s).`);

  // 4. Compute structured deltas between Article 1 and Article 2
  console.log('\n4. Computing reviewed factual deltas...');
  const facts1 = extractStructuredFacts(art1);
  const facts2 = extractStructuredFacts(art2);
  const deltas = computeFactDeltas(facts1, facts2, art2, [art1]);
  console.log(`   Computed ${deltas.length} delta(s):`);
  for (const d of deltas) {
    console.log(`     - [${d.type.toUpperCase()}] ${d.subject} (userFacing=${d.userFacing}): ${d.description}`);
  }

  // 5. Construct Canonical Story Document
  console.log('\n5. Writing stories/' + STORY_ID + '...');
  const art1Time = art1.publishedAt?.toDate ? art1.publishedAt : Timestamp.fromDate(new Date('2024-09-05T00:00:00.000Z'));
  const art2Time = art2.publishedAt?.toDate ? art2.publishedAt : Timestamp.fromDate(new Date('2024-09-17T00:00:00.000Z'));

  const storyDoc = {
    id: STORY_ID,
    slug: 'isro-semi-cryogenic-rocket-engine-testing',
    title: 'ISRO Semi-Cryogenic Rocket Engine Testing & Development',
    summary: 'ISRO advances indigenous semi-cryogenic engine development with successful hot-tests of the intermediate configuration power head at Mahendragiri Propulsion Complex.',
    category: 'Tech',
    entities: ['ent_isro', 'ent_loc_mahendragiri'],
    status: 'active',
    primaryArticleId: ARTICLE_1_ID,
    latestArticleId: ARTICLE_2_ID,
    articleCount: 2,
    articleIds: [ARTICLE_1_ID, ARTICLE_2_ID],
    createdAt: art1Time,
    updatedAt: art2Time,
  };

  await setDoc(doc(db, 'stories', STORY_ID), storyDoc);
  console.log('   ✓ Story document written.');

  // 6. Write Timeline Subcollection
  console.log('\n6. Writing timeline events to stories/' + STORY_ID + '/timeline/...');
  for (const ev of timeline) {
    await setDoc(doc(db, 'stories', STORY_ID, 'timeline', ev.id), ev);
    console.log(`   ✓ Timeline event written: ${ev.id} ("${ev.title}")`);
  }

  // 7. Write Story Updates Subcollection
  console.log('\n7. Writing story updates to stories/' + STORY_ID + '/updates/...');
  const updateId = `upd_${ARTICLE_2_ID.slice(-6)}`;
  const updateDocData = {
    id: updateId,
    storyId: STORY_ID,
    articleId: ARTICLE_2_ID,
    headline: art2.quick_brief?.headline || art2.title,
    summary: art2.quick_brief?.quick_summary || 'ISRO successfully conducts subsequent hot test of Semi-Cryogenic engine power head.',
    importance: 3,
    changes: deltas,
    publishedAt: art2Time,
    createdAt: art2Time,
  };
  await setDoc(doc(db, 'stories', STORY_ID, 'updates', updateId), updateDocData);
  console.log(`   ✓ Story update written: ${updateId}`);

  // 8. Link posts to storyId
  console.log('\n8. Linking posts to storyId...');
  await updateDoc(doc(db, 'posts', ARTICLE_1_ID), { storyId: STORY_ID });
  await updateDoc(doc(db, 'posts', ARTICLE_2_ID), { storyId: STORY_ID });
  console.log('   ✓ Posts updated with storyId.');

  // 9. Read back and verify document consistency
  console.log('\n9. Verifying live Firestore consistency...');
  const verifyStorySnap = await getDoc(doc(db, 'stories', STORY_ID));
  const verifyTimelineSnap = await getDocs(collection(db, 'stories', STORY_ID, 'timeline'));
  const verifyUpdatesSnap = await getDocs(collection(db, 'stories', STORY_ID, 'updates'));
  const verifyPost1Snap = await getDoc(doc(db, 'posts', ARTICLE_1_ID));
  const verifyPost2Snap = await getDoc(doc(db, 'posts', ARTICLE_2_ID));

  console.log(`   - Story exists: ${verifyStorySnap.exists()}`);
  console.log(`   - Timeline events count: ${verifyTimelineSnap.size}`);
  console.log(`   - Story updates count: ${verifyUpdatesSnap.size}`);
  console.log(`   - Post 1 storyId: ${verifyPost1Snap.data()?.storyId}`);
  console.log(`   - Post 2 storyId: ${verifyPost2Snap.data()?.storyId}`);

  if (
    verifyStorySnap.exists() &&
    verifyTimelineSnap.size >= 1 &&
    verifyUpdatesSnap.size >= 1 &&
    verifyPost1Snap.data()?.storyId === STORY_ID &&
    verifyPost2Snap.data()?.storyId === STORY_ID
  ) {
    console.log('\n============================================================');
    console.log('✅ CONTROLLED STORY PERSISTENCE SUCCESSFUL & VERIFIED');
    console.log('============================================================');
  } else {
    throw new Error('Verification failed: Live Firestore records did not match expected structure.');
  }

  await terminate(db);
  await deleteApp(app);
}

persistControlledStory().catch((err) => {
  console.error('Persistence error:', err);
  process.exit(1);
});
