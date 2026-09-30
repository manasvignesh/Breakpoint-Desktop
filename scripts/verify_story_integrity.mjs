import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';

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

const args = process.argv.slice(2);
const isRepairMode = args.includes('--repair');

console.log('========================================================');
console.log('BREAKPOINT STORY INTEGRITY VERIFIER');
console.log('========================================================');
console.log(`Mode: ${isRepairMode ? 'REPAIR MODE (Applying Fixes)' : 'AUDIT MODE (Read-Only Inspection)'}\n`);

async function verifyIntegrity() {
  await signInWithEmailAndPassword(auth, userEmail, userPass);
  console.log('Authenticated.\n');

  console.log('1. Loading all posts from Firestore...');
  const postsSnap = await getDocs(collection(db, 'posts'));
  const postsMap = new Map();
  postsSnap.forEach((d) => postsMap.set(d.id, { id: d.id, ...d.data() }));
  console.log(`Loaded ${postsMap.size} posts.`);

  console.log('\n2. Loading all stories from Firestore...');
  const storiesMap = new Map();
  try {
    const storiesSnap = await getDocs(collection(db, 'stories'));
    storiesSnap.forEach((d) => storiesMap.set(d.id, { id: d.id, ...d.data() }));
    console.log(`Loaded ${storiesMap.size} stories.`);
  } catch (err) {
    console.log('Stories collection empty or inaccessible:', err.message);
  }

  const issues = [];

  // Check 1: Post points to non-existent story
  for (const post of postsMap.values()) {
    if (post.storyId) {
      if (!storiesMap.has(post.storyId)) {
        issues.push({
          type: 'ORPHANED_POST_STORY_REF',
          severity: 'ERROR',
          postId: post.id,
          storyId: post.storyId,
          description: `Post ${post.id} references missing storyId ${post.storyId}`,
        });
      } else {
        const parentStory = storiesMap.get(post.storyId);
        const articleIds = parentStory.articleIds || [];
        if (!articleIds.includes(post.id)) {
          issues.push({
            type: 'BIDIRECTIONAL_MEMBERSHIP_MISMATCH',
            severity: 'ERROR',
            postId: post.id,
            storyId: post.storyId,
            description: `Post ${post.id} has storyId ${post.storyId}, but Story.articleIds does not include ${post.id}`,
          });
        }
      }
    }
  }

  // Check 2: Story references non-existent post or contains duplicates
  for (const story of storiesMap.values()) {
    const articleIds = story.articleIds || [];

    // Duplicates check
    const uniqueIds = new Set(articleIds);
    if (uniqueIds.size !== articleIds.length) {
      issues.push({
        type: 'DUPLICATE_ARTICLE_IN_STORY',
        severity: 'WARNING',
        storyId: story.id,
        description: `Story ${story.id} has duplicate article IDs in articleIds list`,
      });
    }

    // Zero articles check
    if (articleIds.length === 0 && story.status !== 'closed') {
      issues.push({
        type: 'EMPTY_ACTIVE_STORY',
        severity: 'WARNING',
        storyId: story.id,
        description: `Story ${story.id} has zero articles but status is '${story.status}'`,
      });
    }

    // Missing article check
    for (const aid of articleIds) {
      if (!postsMap.has(aid)) {
        issues.push({
          type: 'MISSING_MEMBER_POST',
          severity: 'ERROR',
          storyId: story.id,
          postId: aid,
          description: `Story ${story.id} references non-existent post ${aid}`,
        });
      } else {
        const post = postsMap.get(aid);
        if (post.storyId !== story.id) {
          issues.push({
            type: 'POST_REVERSE_POINTER_MISMATCH',
            severity: 'ERROR',
            storyId: story.id,
            postId: aid,
            description: `Story ${story.id} includes post ${aid}, but post.storyId is '${post.storyId || 'NONE'}'`,
          });
        }
      }
    }

    // latestArticleId check
    if (articleIds.length > 0) {
      if (!story.latestArticleId || !articleIds.includes(story.latestArticleId)) {
        issues.push({
          type: 'INVALID_LATEST_ARTICLE_POINTER',
          severity: 'ERROR',
          storyId: story.id,
          latestArticleId: story.latestArticleId,
          description: `Story ${story.id} latestArticleId '${story.latestArticleId}' is not in articleIds`,
        });
      }
    }
  }

  console.log('\n========================================================');
  console.log('INTEGRITY AUDIT REPORT');
  console.log('========================================================');
  console.log(`Total Issues Detected: ${issues.length}`);

  if (issues.length === 0) {
    console.log('✅ ALL INTEGRITY INVARIANTS SATISFIED! Zero broken references or orphaned records.');
  } else {
    issues.forEach((iss, idx) => {
      console.log(`[Issue ${idx + 1}] [${iss.severity}] ${iss.type}: ${iss.description}`);
    });
  }
  console.log('========================================================');

  if (isRepairMode && issues.length > 0) {
    console.log('\nApplying automated repairs...');
    const batch = writeBatch(db);
    let fixCount = 0;

    for (const iss of issues) {
      if (iss.type === 'ORPHANED_POST_STORY_REF') {
        batch.update(doc(db, 'posts', iss.postId), { storyId: null });
        fixCount++;
      } else if (iss.type === 'DUPLICATE_ARTICLE_IN_STORY') {
        const story = storiesMap.get(iss.storyId);
        const deduplicated = Array.from(new Set(story.articleIds));
        batch.update(doc(db, 'stories', iss.storyId), { articleIds: deduplicated });
        fixCount++;
      } else if (iss.type === 'INVALID_LATEST_ARTICLE_POINTER') {
        const story = storiesMap.get(iss.storyId);
        const correctLatest = story.articleIds[story.articleIds.length - 1];
        batch.update(doc(db, 'stories', iss.storyId), { latestArticleId: correctLatest });
        fixCount++;
      }
    }

    await batch.commit();
    console.log(`✅ Applied ${fixCount} repairs to Firestore.`);
  }
}

verifyIntegrity().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
