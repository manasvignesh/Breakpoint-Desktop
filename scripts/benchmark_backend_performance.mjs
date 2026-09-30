import { rankBrief, scoreCandidate } from '../src/services/dailyBriefRanking.ts';

console.log('===============================================================');
console.log('BENCHMARK: DAILY BRIEF BACKEND PERFORMANCE & CPU LATENCY');
console.log('===============================================================\n');

// 1. Synthetic high-scale candidate pool (100 candidate items)
const candidatePool = [];
for (let i = 0; i < 100; i++) {
  const isStory = i % 3 === 0;
  candidatePool.push({
    id: `cand_${i}`,
    type: isStory ? 'story' : 'article',
    storyId: isStory ? `story_${i % 10}` : undefined,
    articleId: `art_${i}`,
    title: `Candidate News Story ${i}`,
    summary: `Summary of development ${i} with important national context.`,
    category: ['Space', 'AI', 'Economy', 'Energy', 'Defense'][i % 5],
    publishedAt: new Date(Date.now() - (i * 3600000)).toISOString(),
    editorialImportance: 0.5 + ((i % 10) * 0.05),
    entityIds: [`ent_${i % 20}`, `ent_${(i + 1) % 20}`],
    conceptIds: [`con_${i % 15}`],
    topicTags: [`tag_${i % 10}`],
    readTimeMinutes: 2 + (i % 3),
    materialChangesCount: i % 4 === 0 ? 2 : 0,
    deltas: i % 4 === 0 ? [
      {
        changeType: 'value_changed',
        subject: `Metric ${i}`,
        description: `Value increased to ${i * 10}`,
        timestamp: new Date(Date.now() - (i * 1800000)).toISOString(),
        userFacing: true,
      }
    ] : [],
  });
}

// 2. Synthetic user ranking context
const userCtx = {
  userId: 'user_perf_test',
  followedEntityIds: new Set(['ent_0', 'ent_5', 'ent_10']),
  followedTopics: new Set(['space', 'ai']),
  readingHistory: new Map([
    ['art_0', { progress: 0.9, lastReadAt: new Date(Date.now() - 86400000).toISOString() }],
    ['art_3', { progress: 0.4, lastReadAt: new Date(Date.now() - 43200000).toISOString() }],
  ]),
  storyReadHistory: new Map([
    ['story_0', { lastReadArticleId: 'art_0', lastReadAt: new Date(Date.now() - 86400000).toISOString(), maxProgress: 0.9 }],
  ]),
  knowledgeFamiliarity: new Map([
    ['con_0', 'familiar'],
    ['con_1', 'unseen'],
  ]),
  activeTrailIds: new Set(['trail_01']),
  completedTrailIds: new Set(),
};

// 3. Measure Cold Ranking Time
const coldStart = performance.now();
const coldBrief = rankBrief(candidatePool, userCtx, { minItems: 5, maxItems: 7 });
const coldEnd = performance.now();
const coldRankingTimeMs = coldEnd - coldStart;

// 4. Measure Warm Ranking Time (1,000 ranking runs)
const iterations = 1000;
const warmStart = performance.now();
for (let k = 0; k < iterations; k++) {
  rankBrief(candidatePool, userCtx, { minItems: 5, maxItems: 7 });
}
const warmEnd = performance.now();
const totalWarmTimeMs = warmEnd - warmStart;
const avgWarmRankingTimeMs = totalWarmTimeMs / iterations;

console.log('---------------------------------------------------------------');
console.log(`Candidate Pool Size:         ${candidatePool.length} candidates`);
console.log(`Ranked Output Items:         ${coldBrief.length} items`);
console.log(`Cold Ranking Engine Latency: ${coldRankingTimeMs.toFixed(3)} ms`);
console.log(`Warm Avg Ranking Latency:    ${avgWarmRankingTimeMs.toFixed(3)} ms (${iterations} iterations)`);
console.log(`Throughput:                  ${Math.round(1000 / avgWarmRankingTimeMs)} rankings/sec per core`);
console.log('---------------------------------------------------------------\n');

// 5. Database operations breakdown
console.log('ESTIMATED DATABASE OPERATIONS (Per Brief Generation):');
console.log('  Firestore Reads:');
console.log('    - 1 brief cache check (doc read)');
console.log('    - 2 post queries (approved + published, limit 40 each, ~25-50 docs)');
console.log('    - 1 batch story query (where __name__ in referenced candidate stories, ~5-15 docs)');
console.log('    - 1 batch story updates query (~5-10 docs)');
console.log('    - 1 user profile read (followed entities & topics)');
console.log('    - 1 user readingState query (active articles, ~10-20 docs)');
console.log('    Total Reads: ~45-95 document reads (bounded and index-backed)');
console.log('  Firestore Writes:');
console.log('    - 1 brief doc write (users/{uid}/briefs/{briefId})');
console.log('    Total Writes: 1 write per edition (immutable cache)');
console.log('---------------------------------------------------------------\n');

if (avgWarmRankingTimeMs < 10.0) {
  console.log('>>> PERFORMANCE BENCHMARK PASSED (LATENCY < 10ms TARGET) <<<');
  process.exit(0);
} else {
  console.error('>>> PERFORMANCE BENCHMARK FAILED (LATENCY EXCEEDED 10ms) <<<');
  process.exit(1);
}
