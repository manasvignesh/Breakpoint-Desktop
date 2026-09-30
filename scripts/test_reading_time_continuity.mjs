import { scoreCandidate, isCandidateSuppressed } from '../src/services/dailyBriefRanking.ts';

console.log('===============================================================');
console.log('TEST: TIME-BASED STORY CONTINUITY & READING STATE DECOUPLING');
console.log('===============================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

// 1. Setup mock story and articles
const storyId = 'story_semiconductor_fab';
const articleId1 = 'art_semi_01';
const articleId2 = 'art_semi_02';
const articleId3 = 'art_semi_03';

const storyArticleIds = [articleId1, articleId2, articleId3];

// Timestamps:
// T1: User reads article 1 to 95% at 2026-09-28T10:00:00Z
// T_delta1: Material update published at 2026-09-28T14:00:00Z (Delta A)
// T2: User opens article 2 to 40% at 2026-09-29T08:00:00Z (Newer interaction)
// T_delta2: Material update published at 2026-09-29T12:00:00Z (Delta B)

const T1 = '2026-09-28T10:00:00.000Z';
const T_delta1 = '2026-09-28T14:00:00.000Z';
const T2 = '2026-09-29T08:00:00.000Z';
const T_delta2 = '2026-09-29T12:00:00.000Z';

// Mock readingState documents: users/{uid}/readingState/{articleId} (No storyId dependency)
const mockReadingStateDocs = {
  [articleId1]: {
    articleId: articleId1,
    progress: 0.95,
    lastOpenedAt: T1,
    updatedAt: T1,
  },
  [articleId2]: {
    articleId: articleId2,
    progress: 0.40,
    lastOpenedAt: T2,
    updatedAt: T2,
  },
};

// Compute story last meaningful interaction
let lastMeaningfulInteractionAt = null;
let maxProgress = 0;

for (const aId of storyArticleIds) {
  const rs = mockReadingStateDocs[aId];
  if (rs) {
    if (rs.progress > maxProgress) maxProgress = rs.progress;
    const itemDate = rs.lastOpenedAt || rs.updatedAt;
    if (itemDate && (!lastMeaningfulInteractionAt || new Date(itemDate) > new Date(lastMeaningfulInteractionAt))) {
      lastMeaningfulInteractionAt = itemDate;
    }
  }
}

assert(lastMeaningfulInteractionAt === T2, `lastMeaningfulInteractionAt resolved to newer interaction timestamp T2 (${T2}) rather than T1`);
assert(maxProgress === 0.95, `maxProgress correctly tracked as 0.95 (95%)`);

// Build user context
const userCtx = {
  userId: 'user_test_continuity',
  followedEntityIds: new Set(),
  followedTopics: new Set(),
  readingHistory: new Map([
    [articleId1, { progress: 0.95, lastReadAt: T1 }],
    [articleId2, { progress: 0.40, lastReadAt: T2 }],
  ]),
  storyReadHistory: new Map([
    [storyId, { lastReadArticleId: articleId2, lastReadAt: lastMeaningfulInteractionAt, maxProgress }],
  ]),
  knowledgeFamiliarity: new Map(),
  activeTrailIds: new Set(),
  completedTrailIds: new Set(),
};

// Candidate candidate with 2 deltas: Delta A (before T2) and Delta B (after T2)
const continuingCandidate = {
  id: 'cand_semi_update',
  type: 'story_update',
  storyId,
  articleId: articleId3,
  title: 'Semiconductor Fab Equipment Arrives',
  summary: 'New stepper machines delivered to Dholera facility.',
  category: 'Tech',
  publishedAt: T_delta2,
  editorialImportance: 0.7,
  entityIds: ['ent_semi'],
  conceptIds: [],
  topicTags: ['semiconductors'],
  readTimeMinutes: 2,
  materialChangesCount: 2,
  deltas: [
    {
      changeType: 'value_changed',
      subject: 'Phase 1 Investment',
      description: 'Capital expenditure increased to $11 Billion',
      timestamp: T_delta1, // Older than T2
    },
    {
      changeType: 'status_changed',
      subject: 'Cleanroom Construction',
      description: 'Cleanroom certified Class 1000',
      timestamp: T_delta2, // Newer than T2
    },
  ],
};

const scored = scoreCandidate(continuingCandidate, userCtx);

assert(scored.reasonCode === 'continuing', `Scored candidate identified as continuing story`);
assert(scored.explanationMode === 'compact_delta', `Explanation mode set to compact_delta`);
assert(scored.deltas.length === 1, `Filtered deltas contains only 1 delta published after T2 (Delta B)`);
assert(scored.deltas[0] === 'Cleanroom certified Class 1000', `Correctly identified Delta B (Cleanroom certified Class 1000) as the only unseen delta`);

// Test suppression if candidate has no deltas after T2 and maxProgress >= 0.8
const oldConsumedCandidate = {
  id: 'cand_semi_old',
  type: 'story',
  storyId,
  articleId: articleId1,
  title: 'Semiconductor Fab Construction Begins',
  summary: 'Foundation work started.',
  category: 'Tech',
  publishedAt: T1,
  editorialImportance: 0.7,
  entityIds: ['ent_semi'],
  conceptIds: [],
  topicTags: ['semiconductors'],
  readTimeMinutes: 2,
  materialChangesCount: 0,
};

const isSuppressed = isCandidateSuppressed(oldConsumedCandidate, userCtx);
assert(isSuppressed === true, `Old candidate with no new deltas and maxProgress >= 0.8 is correctly suppressed`);

console.log('\n---------------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('---------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('>>> READING TIME CONTINUITY TEST PASSED <<<');
  process.exit(0);
}
