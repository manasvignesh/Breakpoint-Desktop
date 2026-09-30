import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { matchArticleToStory, generateStoryId, generateSlug } from '../src/services/storyMatchingService.ts';
import { extractEntities } from '../src/services/entityExtractionService.ts';
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

// CLI argument parsing
const args = process.argv.slice(2);
const isApplyMode = args.includes('--apply-high-confidence');
const isDryRun = !isApplyMode || args.includes('--dry-run');
const targetStoryIdIndex = args.indexOf('--story-id');
const filterStoryId = targetStoryIdIndex !== -1 ? args[targetStoryIdIndex + 1] : null;

console.log('========================================================');
console.log('BREAKPOINT STORY CLUSTERING — PRODUCTION BACKFILL TOOL');
console.log('========================================================');
console.log(`Execution Mode: ${isDryRun ? 'DRY-RUN (Simulation Only - ZERO WRITES)' : 'APPLY HIGH-CONFIDENCE (LIVE DATABASE WRITES)'}`);
if (filterStoryId) console.log(`Target Story Filter: ${filterStoryId}`);
console.log('--------------------------------------------------------\n');

async function runBackfill() {
  console.log(`Authenticating as ${userEmail}...`);
  await signInWithEmailAndPassword(auth, userEmail, userPass);
  console.log('Authentication successful.');
  // 1. Query all approved/published articles
  console.log('Fetching live articles from Firestore...');
  const postsSnap = await getDocs(
    query(collection(db, 'posts'), where('status', 'in', ['approved', 'published']))
  );

  const rawArticles = postsSnap.docs
    .filter((d) => d.data().category !== 'Reel')
    .map((d) => {
      const data = d.data();
      const publishedDate = data.publishedAt?.toDate ? data.publishedAt.toDate() : data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      return {
        id: d.id,
        title: data.quick_brief?.headline || data.headline || data.title || '',
        category: data.quick_brief?.category || data.category || 'Article',
        summary: data.quick_brief?.quick_summary || data.description || '',
        publishedAt: publishedDate,
        existingStoryId: data.storyId || null,
        heroImage: data.imageUrl || data.coverImage || null,
      };
    });

  // Sort chronological (oldest to newest so story seed happens first)
  rawArticles.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  console.log(`Loaded ${rawArticles.length} live articles to process.\n`);

  // In-memory story state tracking during simulation
  const storiesMap = new Map(); // storyId -> StoryThread

  // Also query existing stories from Firestore if any
  try {
    const existingStoriesSnap = await getDocs(collection(db, 'stories'));
    existingStoriesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      storiesMap.set(docSnap.id, {
        id: docSnap.id,
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        primaryTopic: data.primaryTopic,
        status: data.status,
        entityIds: data.entityIds || [],
        articleIds: data.articleIds || [],
        latestArticleId: data.latestArticleId,
        firstPublishedAt: data.firstPublishedAt?.toDate ? data.firstPublishedAt.toDate() : new Date(),
        lastUpdatedAt: data.lastUpdatedAt?.toDate ? data.lastUpdatedAt.toDate() : new Date(),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        heroImage: data.heroImage,
      });
    });
    console.log(`Found ${storiesMap.size} pre-existing Story documents in Firestore.`);
  } catch (err) {
    console.log('Note: Querying stories collection skipped or empty:', err.message);
  }

  let createdCount = 0;
  let attachedCount = 0;
  let alreadyAssignedCount = 0;
  let ambiguousCount = 0;
  const proposedClusters = [];

  for (const article of rawArticles) {
    // If article already has storyId in Firestore
    if (article.existingStoryId && storiesMap.has(article.existingStoryId)) {
      alreadyAssignedCount++;
      continue;
    }

    const candidateStories = Array.from(storiesMap.values());
    const matchResult = matchArticleToStory(article, candidateStories);

    if (matchResult.action === 'ATTACH' && matchResult.targetStoryId) {
      const targetStory = storiesMap.get(matchResult.targetStoryId);
      if (targetStory) {
        targetStory.articleIds.push(article.id);
        targetStory.latestArticleId = article.id;
        targetStory.lastUpdatedAt = article.publishedAt;
        attachedCount++;

        proposedClusters.push({
          action: 'ATTACH',
          storyId: targetStory.id,
          storyTitle: targetStory.title,
          articleId: article.id,
          articleHeadline: article.title,
          confidence: matchResult.candidate?.confidence,
          reason: matchResult.candidate?.reason,
        });
      }
    } else {
      // Check if ambiguous
      if (matchResult.candidate && matchResult.candidate.decision === 'REVIEW_OR_SPLIT') {
        ambiguousCount++;
      }

      // Create new story thread
      const newStoryId = generateStoryId();
      const newTitle = matchResult.proposedNewStory?.title || article.title;
      const newSummary = matchResult.proposedNewStory?.summary || article.summary || article.title;
      const newEntities = matchResult.proposedNewStory?.entityIds || [];

      const newStory = {
        id: newStoryId,
        title: newTitle,
        slug: generateSlug(newTitle),
        summary: newSummary,
        primaryTopic: article.category,
        status: 'developing',
        entityIds: newEntities,
        articleIds: [article.id],
        latestArticleId: article.id,
        firstPublishedAt: article.publishedAt,
        lastUpdatedAt: article.publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        heroImage: article.heroImage,
      };

      storiesMap.set(newStoryId, newStory);
      createdCount++;

      proposedClusters.push({
        action: 'CREATE',
        storyId: newStoryId,
        storyTitle: newTitle,
        articleId: article.id,
        articleHeadline: article.title,
        confidence: 1.0,
        reason: 'New event seed article',
      });
    }
  }

  // Print proposed clusters
  console.log('--------------------------------------------------------');
  console.log('BACKFILL SIMULATION PROPOSED CLUSTERS SAMPLE');
  console.log('--------------------------------------------------------');
  const multiArticleStories = Array.from(storiesMap.values()).filter((s) => s.articleIds.length > 1);
  console.log(`Identified ${multiArticleStories.length} multi-article Story Threads:\n`);

  multiArticleStories.forEach((s, idx) => {
    console.log(`[Thread ${idx + 1}] ID: ${s.id} | Topic: ${s.primaryTopic}`);
    console.log(`  Title:   "${s.title}"`);
    console.log(`  Members: ${s.articleIds.length} articles`);
    s.articleIds.forEach((aid) => {
      const art = rawArticles.find((a) => a.id === aid);
      console.log(`    - [${aid}] "${art?.title || aid}" (${art?.publishedAt.toISOString().substring(0, 10)})`);
    });
    console.log('');
  });

  console.log('========================================================');
  console.log('BACKFILL SUMMARY METRICS');
  console.log('========================================================');
  console.log(`Total Articles Processed:     ${rawArticles.length}`);
  console.log(`Total Stories Created/Seeded: ${createdCount}`);
  console.log(`Articles Attached to Story:   ${attachedCount}`);
  console.log(`Multi-Article Clusters:       ${multiArticleStories.length}`);
  console.log(`Ambiguous (Split) Cases:      ${ambiguousCount}`);
  console.log(`Pre-assigned Articles:        ${alreadyAssignedCount}`);
  console.log('========================================================');

  if (isDryRun) {
    console.log('\n🔒 DRY-RUN COMPLETE: Zero database writes executed. Pass --apply-high-confidence to write changes.');
  } else {
    console.log('\nWriting high-confidence clusters to live Firestore...');
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const story of storiesMap.values()) {
      const storyRef = doc(db, 'stories', story.id);
      batch.set(storyRef, {
        storyId: story.id,
        title: story.title,
        slug: story.slug,
        summary: story.summary,
        primaryTopic: story.primaryTopic,
        status: story.status,
        entityIds: story.entityIds,
        articleIds: story.articleIds,
        latestArticleId: story.latestArticleId,
        firstPublishedAt: Timestamp.fromDate(story.firstPublishedAt),
        lastUpdatedAt: Timestamp.fromDate(story.lastUpdatedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        heroImage: story.heroImage || null,
        importance: 50,
        region: 'India',
      });
      batchCount++;

      for (const articleId of story.articleIds) {
        const postRef = doc(db, 'posts', articleId);
        batch.update(postRef, { storyId: story.id });
        batchCount++;
      }
    }

    await batch.commit();
    console.log(`✅ Successfully committed ${batchCount} operations to Firestore.`);
  }
}

runBackfill().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
