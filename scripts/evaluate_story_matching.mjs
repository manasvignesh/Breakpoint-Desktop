import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import compiled or source modules
import { matchArticleToStory, generateStoryId, generateSlug } from '../src/services/storyMatchingService.ts';
import { extractEntities } from '../src/services/entityExtractionService.ts';

const benchmarkPath = path.join(__dirname, '../data/story_matching_benchmark.json');
const testCases = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

console.log('========================================================');
console.log('BREAKPOINT STORY CLUSTERING — EVALUATION BENCHMARK');
console.log('========================================================');
console.log(`Loaded ${testCases.length} curated test cases.\n`);

let truePositives = 0;   // Correctly auto-attached same story
let trueNegatives = 0;   // Correctly kept separate (created new story)
let falseMerges = 0;     // CRITICAL ERROR: Unrelated / distinct articles merged together
let falseSplits = 0;      // Same story split into separate stories
let reviewFlagged = 0;   // Flagged for review (0.65 <= conf < 0.82)

testCases.forEach((tc, index) => {
  const articleA = tc.articleA;
  const articleB = tc.articleB;

  // Synthesize StoryThread from articleA
  const fullTextA = `${articleA.title} ${articleA.summary}`;
  const entitiesA = extractEntities(fullTextA);
  const publishedDateA = new Date(articleA.publishedAt);

  const storyA = {
    id: `st_${articleA.id.toLowerCase()}`,
    title: articleA.title,
    slug: generateSlug(articleA.title),
    summary: articleA.summary,
    primaryTopic: articleA.category,
    status: 'developing',
    entityIds: entitiesA.map((e) => e.id),
    articleIds: [articleA.id],
    latestArticleId: articleA.id,
    articleCount: 1,
    firstPublishedAt: publishedDateA,
    lastUpdatedAt: publishedDateA,
    createdAt: publishedDateA,
    updatedAt: publishedDateA,
    heroImage: null,
    importance: 50,
    region: 'India',
  };

  // Run Matcher
  const articleBDomain = {
    id: articleB.id,
    title: articleB.title,
    category: articleB.category,
    summary: articleB.summary,
    publishedAt: new Date(articleB.publishedAt),
  };

  const matchResult = matchArticleToStory(articleBDomain, [storyA]);
  const decision = matchResult.candidate?.decision || 'CREATE_NEW';
  const confidence = matchResult.candidate?.confidence ?? 0;
  const isMatch = matchResult.action === 'ATTACH';

  const expectedMatch = tc.expectedDecision === 'AUTO_ATTACH';
  const passed = (isMatch === expectedMatch);

  console.log(`[Test ${index + 1}/${testCases.length}] [${tc.type}] ${tc.description}`);
  console.log(`  Article A: "${articleA.title}"`);
  console.log(`  Article B: "${articleB.title}"`);
  console.log(`  Score: Confidence=${confidence.toFixed(2)} | Decision=${decision} | Action=${matchResult.action}`);
  console.log(`  Signals: ${JSON.stringify(matchResult.candidate?.signals || {})}`);
  console.log(`  Expected: ${tc.expectedDecision} | Actual: ${isMatch ? 'AUTO_ATTACH' : 'CREATE_NEW'} -> ${passed ? '✓ PASS' : '✗ FAIL'}\n`);

  if (decision === 'REVIEW_OR_SPLIT') {
    reviewFlagged++;
  }

  if (expectedMatch && isMatch) {
    truePositives++;
  } else if (!expectedMatch && !isMatch) {
    trueNegatives++;
  } else if (!expectedMatch && isMatch) {
    falseMerges++;
    console.error(`  🚨 CRITICAL FALSE MERGE DETECTED on ${tc.id}!`);
  } else if (expectedMatch && !isMatch) {
    falseSplits++;
    console.warn(`  ⚠️ False Split detected on ${tc.id} (Confidence=${confidence.toFixed(2)}).`);
  }
});

const total = testCases.length;
const actualPositiveCount = testCases.filter(tc => tc.expectedDecision === 'AUTO_ATTACH').length;
const actualNegativeCount = testCases.filter(tc => tc.expectedDecision === 'CREATE_NEW').length;

// Benchmark Accounting Assertions
if (actualPositiveCount + actualNegativeCount !== total) {
  console.error(`❌ Benchmark Label Error: positive (${actualPositiveCount}) + negative (${actualNegativeCount}) !== total (${total})`);
  process.exit(1);
}

if (truePositives + falseSplits !== actualPositiveCount) {
  console.error(`❌ Confusion Matrix Error: TP (${truePositives}) + FN (${falseSplits}) !== actualPositiveCount (${actualPositiveCount})`);
  process.exit(1);
}

if (trueNegatives + falseMerges !== actualNegativeCount) {
  console.error(`❌ Confusion Matrix Error: TN (${trueNegatives}) + FP (${falseMerges}) !== actualNegativeCount (${actualNegativeCount})`);
  process.exit(1);
}

if (truePositives + trueNegatives + falseMerges + falseSplits !== total) {
  console.error(`❌ Confusion Matrix Error: TP + TN + FP + FN !== total (${total})`);
  process.exit(1);
}

const precision = (truePositives + falseMerges) > 0 ? (truePositives / (truePositives + falseMerges)) : 1.0;
const recall = actualPositiveCount > 0 ? (truePositives / actualPositiveCount) : 1.0;
const specificity = actualNegativeCount > 0 ? (trueNegatives / actualNegativeCount) : 1.0;
const accuracy = (truePositives + trueNegatives) / total;
const falseMergeRate = actualNegativeCount > 0 ? (falseMerges / actualNegativeCount) : 0.0;
const falseSplitRate = actualPositiveCount > 0 ? (falseSplits / actualPositiveCount) : 0.0;

console.log('========================================================');
console.log('BENCHMARK EVALUATION SUMMARY & CONFUSION MATRIX');
console.log('========================================================');
console.log(`Total Curated Pairs:         ${total}`);
console.log(`Actual Positive Pairs:       ${actualPositiveCount}`);
console.log(`Actual Negative Pairs:       ${actualNegativeCount}`);
console.log('--------------------------------------------------------');
console.log(`True Positives (TP):         ${truePositives}`);
console.log(`True Negatives (TN):         ${trueNegatives}`);
console.log(`False Positives / Merges (FP): ${falseMerges}`);
console.log(`False Negatives / Splits (FN): ${falseSplits}`);
console.log(`Review Flagged (Ambiguous):  ${reviewFlagged}`);
console.log('--------------------------------------------------------');
console.log(`Precision (TP / (TP + FP)):  ${(precision * 100).toFixed(1)}%`);
console.log(`Recall (TP / (TP + FN)):     ${(recall * 100).toFixed(1)}%`);
console.log(`Specificity (TN / (TN + FP)): ${(specificity * 100).toFixed(1)}%`);
console.log(`Accuracy ((TP + TN) / Total): ${(accuracy * 100).toFixed(1)}%`);
console.log(`False Merge Rate (CRITICAL): ${(falseMergeRate * 100).toFixed(1)}%`);
console.log(`False Split Rate:            ${(falseSplitRate * 100).toFixed(1)}%`);
console.log('--------------------------------------------------------');
console.log('Accounting Assertions:       ✓ ALL PASSED (TP+FN=P, TN+FP=N, Total=P+N)');
console.log('========================================================');

if (falseMerges > 0) {
  console.error('\n❌ BENCHMARK FAILED: False merges detected. False merge rate must be 0.0%!');
  process.exit(1);
} else {
  console.log('\n✅ BENCHMARK PASSED: Zero false merges detected with 100% precision & verified accounting.');
  process.exit(0);
}
