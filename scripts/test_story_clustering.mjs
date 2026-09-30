import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { matchArticleToStory, generateStoryId, generateSlug } from '../src/services/storyMatchingService.ts';
import {
  createStoryThread,
  attachArticleToStory,
  getStoryThread,
  mergeStoryThreads,
  splitStoryThread,
} from '../src/services/storyThreadService.ts';

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

console.log('========================================================');
console.log('PHASE 16B: STORY IDENTITY & CLUSTERING RUNTIME VALIDATION');
console.log('========================================================\n');

async function runValidation() {
  console.log(`Authenticating as test account: ${userEmail}...`);
  await signInWithEmailAndPassword(auth, userEmail, userPass);
  console.log('✓ Authentication successful.\n');

  const testArticleId1 = `test_art_fuelcycle_01_${Date.now()}`;
  const testArticleId2 = `test_art_fuelcycle_02_${Date.now()}`;
  const testArticleId3 = `test_art_fuelcycle_other_${Date.now()}`;
  let createdStoryIdA = '';
  let createdStoryIdB = '';

  try {
    // -------------------------------------------------------------
    // Step 1: Create Test Articles in Firestore
    // -------------------------------------------------------------
    console.log('1. Setting up temporary test articles in posts collection...');
    const now = new Date();

    const post1Data = {
      schema_version: 2,
      status: 'approved',
      category: 'AI & ML',
      title: 'Fuel Cycle opens Navi Mumbai GCC for AI and product development',
      headline: 'Fuel Cycle opens Navi Mumbai GCC for AI and product development',
      description: 'Fuel Cycle establishes new AI engineering facility in Navi Mumbai.',
      quick_brief: {
        category: 'AI & ML',
        headline: 'Fuel Cycle opens Navi Mumbai GCC for AI and product development',
        quick_summary: 'Fuel Cycle establishes new AI engineering facility in Navi Mumbai.',
        three_things_to_know: ['Point 1', 'Point 2', 'Point 3'],
        key_number: null,
      },
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    };

    const post2Data = {
      schema_version: 2,
      status: 'approved',
      category: 'AI & ML',
      title: 'Fuel Cycle begins hiring 200 engineers for Navi Mumbai GCC',
      headline: 'Fuel Cycle begins hiring 200 engineers for Navi Mumbai GCC',
      description: 'Fuel Cycle doubles engineering hiring for its new Navi Mumbai GCC hub.',
      quick_brief: {
        category: 'AI & ML',
        headline: 'Fuel Cycle begins hiring 200 engineers for Navi Mumbai GCC',
        quick_summary: 'Fuel Cycle doubles engineering hiring for its new Navi Mumbai GCC hub.',
        three_things_to_know: ['Point 1', 'Point 2', 'Point 3'],
        key_number: null,
      },
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    };

    const post3Data = {
      schema_version: 2,
      status: 'approved',
      category: 'AI & ML',
      title: 'Fuel Cycle acquires Chicago-based analytics firm in $50M deal',
      headline: 'Fuel Cycle acquires Chicago-based analytics firm in $50M deal',
      description: 'Fuel Cycle expands US market footprint with $50M acquisition.',
      quick_brief: {
        category: 'AI & ML',
        headline: 'Fuel Cycle acquires Chicago-based analytics firm in $50M deal',
        quick_summary: 'Fuel Cycle expands US market footprint with $50M acquisition.',
        three_things_to_know: ['Point 1', 'Point 2', 'Point 3'],
        key_number: null,
      },
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    };

    await Promise.all([
      setDoc(doc(db, 'posts', testArticleId1), post1Data),
      setDoc(doc(db, 'posts', testArticleId2), post2Data),
      setDoc(doc(db, 'posts', testArticleId3), post3Data),
    ]);
    console.log('✓ Created test articles in posts collection.\n');

    // -------------------------------------------------------------
    // Step 2: Seed Story A with Article 1
    // -------------------------------------------------------------
    console.log('2. Creating initial StoryThread from Article 1...');
    const seedArticle1 = {
      id: testArticleId1,
      title: post1Data.title,
      category: post1Data.category,
      summary: post1Data.description,
      publishedAt: now,
    };

    const storyThreadA = await createStoryThread(seedArticle1, {
      customTitle: "Fuel Cycle's Navi Mumbai GCC Expansion",
      customSummary: "Fuel Cycle is expanding its engineering and AI operations in India through a new GCC in Navi Mumbai.",
    });
    createdStoryIdA = storyThreadA.id;

    console.log(`✓ Created StoryThread: ${storyThreadA.id}`);
    console.log(`  Title: "${storyThreadA.title}"`);
    console.log(`  Articles: [${storyThreadA.articleIds.join(', ')}]`);
    console.log(`  Latest Article: ${storyThreadA.latestArticleId}`);

    // Verify post 1 has storyId set
    const post1Snap = await getDoc(doc(db, 'posts', testArticleId1));
    if (post1Snap.data()?.storyId !== storyThreadA.id) {
      throw new Error(`Post 1 does not have storyId matching StoryThread! Got: ${post1Snap.data()?.storyId}`);
    }
    console.log('✓ Verified post 1 storyId reverse link.\n');

    // -------------------------------------------------------------
    // Step 3: Match Article 2 (Continuation of Navi Mumbai GCC)
    // -------------------------------------------------------------
    console.log('3. Matching Article 2 against candidate StoryThreads...');
    const matchArticle2 = {
      id: testArticleId2,
      title: post2Data.title,
      category: post2Data.category,
      summary: post2Data.description,
      publishedAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2), // +2 days
    };

    const matchRes2 = matchArticleToStory(matchArticle2, [storyThreadA]);
    console.log(`  Match Decision: ${matchRes2.candidate?.decision} | Confidence: ${matchRes2.candidate?.confidence}`);
    console.log(`  Reason: ${matchRes2.candidate?.reason}`);

    if (matchRes2.action !== 'ATTACH' || matchRes2.targetStoryId !== storyThreadA.id) {
      throw new Error(`Expected Article 2 to auto-attach to StoryThread A! Got: ${matchRes2.action}`);
    }
    console.log('✓ Article 2 successfully recognized as continuation.');

    // Attach Article 2
    const updatedStoryA = await attachArticleToStory(storyThreadA.id, matchArticle2);
    console.log(`✓ Attached Article 2. Story A now has ${updatedStoryA.articleIds.length} articles.`);
    if (updatedStoryA.latestArticleId !== testArticleId2) {
      throw new Error(`Expected latestArticleId to update to Article 2!`);
    }

    // -------------------------------------------------------------
    // Step 4: Test Idempotent Attachment
    // -------------------------------------------------------------
    console.log('\n4. Testing Idempotency (re-attaching Article 2)...');
    const idempotentStory = await attachArticleToStory(storyThreadA.id, matchArticle2);
    if (idempotentStory.articleIds.length !== 2) {
      throw new Error(`Idempotency failed! Article duplicated in articleIds: ${idempotentStory.articleIds}`);
    }
    console.log('✓ Idempotency verified: Article membership remained 2 without duplicates.');

    // -------------------------------------------------------------
    // Step 5: Match Article 3 (Hard Negative - Different Event)
    // -------------------------------------------------------------
    console.log('\n5. Matching Article 3 (US Acquisition vs India GCC)...');
    const matchArticle3 = {
      id: testArticleId3,
      title: post3Data.title,
      category: post3Data.category,
      summary: post3Data.description,
      publishedAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3),
    };

    const matchRes3 = matchArticleToStory(matchArticle3, [updatedStoryA]);
    console.log(`  Match Decision: ${matchRes3.candidate?.decision} | Confidence: ${matchRes3.candidate?.confidence}`);
    console.log(`  Action: ${matchRes3.action}`);

    if (matchRes3.action === 'ATTACH') {
      throw new Error(`False merge detected! Article 3 (US Acquisition) was merged into India GCC story!`);
    }
    console.log('✓ Article 3 correctly separated into a distinct story thread.');

    // Create Story B for Article 3
    const storyThreadB = await createStoryThread(matchArticle3);
    createdStoryIdB = storyThreadB.id;
    console.log(`✓ Created StoryThread B: ${storyThreadB.id}`);

    // -------------------------------------------------------------
    // Step 6: Story Split & Merge Operations
    // -------------------------------------------------------------
    console.log('\n6. Testing Story Split and Merge Operations...');

    // Split Article 2 out into its own story
    const splitResult = await splitStoryThread(storyThreadA.id, [testArticleId2], {
      title: 'Fuel Cycle India Hiring Initiative',
      summary: 'Fuel Cycle hiring drive for 200 engineers.',
    });
    console.log(`✓ Split executed. Original Story A has ${splitResult.originalStory.articleIds.length} articles, New Story has ${splitResult.newStory.articleIds.length} articles.`);

    // Merge them back together
    const mergedStory = await mergeStoryThreads(splitResult.newStory.id, storyThreadA.id);
    console.log(`✓ Merge executed. Target Story A now has ${mergedStory.articleIds.length} articles.`);
    if (!mergedStory.articleIds.includes(testArticleId2)) {
      throw new Error('Merge did not include Article 2!');
    }

    console.log('\n========================================================');
    console.log('ALL PHASE 16B RUNTIME VALIDATIONS PASSED!');
    console.log('========================================================');
  } finally {
    // Clean up test documents
    console.log('\nCleaning up test documents from Firestore...');
    const cleanupBatch = writeBatch(db);
    cleanupBatch.delete(doc(db, 'posts', testArticleId1));
    cleanupBatch.delete(doc(db, 'posts', testArticleId2));
    cleanupBatch.delete(doc(db, 'posts', testArticleId3));
    if (createdStoryIdA) cleanupBatch.delete(doc(db, 'stories', createdStoryIdA));
    if (createdStoryIdB) cleanupBatch.delete(doc(db, 'stories', createdStoryIdB));
    await cleanupBatch.commit();
    console.log('✓ Cleaned up all temporary test records.');
  }
}

runValidation().catch((err) => {
  console.error('Validation Error:', err);
  process.exit(1);
});
