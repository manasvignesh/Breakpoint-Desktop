import fs from 'fs';

const scenarios = [];

// 1-10: Consumed Story Suppression
for (let i = 1; i <= 5; i++) {
  scenarios.push({
    id: `SUPPRESS_UNCHANGED_${i}`,
    description: `Story ${i} consumed (progress 0.95) with NO material updates -> must be suppressed`,
    candidate: {
      id: `cand_supp_${i}`,
      type: 'story',
      storyId: `story_supp_${i}`,
      articleId: `art_supp_${i}`,
      title: `Old Story ${i}`,
      summary: `Summary of old story ${i}`,
      category: 'Technology',
      publishedAt: '2026-09-29T10:00:00.000Z',
      editorialImportance: 0.8,
      entityIds: ['ent_tech_01'],
      conceptIds: [],
      topicTags: ['tech'],
      readTimeMinutes: 2,
      materialChangesCount: 0,
      changesCount: 1,
    },
    userContext: {
      userId: `user_test_${i}`,
      followedEntityIds: [],
      followedTopics: [],
      readingHistory: {
        [`art_supp_${i}`]: { progress: 0.95, lastReadAt: '2026-09-29T12:00:00.000Z' },
      },
      storyReadHistory: {
        [`story_supp_${i}`]: { lastReadArticleId: `art_supp_${i}`, lastReadAt: '2026-09-29T12:00:00.000Z', maxProgress: 0.95 },
      },
      knowledgeFamiliarity: {},
      activeTrailIds: [],
      completedTrailIds: [],
    },
    expectedSuppressed: true,
  });
}

for (let i = 6; i <= 10; i++) {
  scenarios.push({
    id: `INCLUDE_MATERIAL_DELTA_${i}`,
    description: `Story ${i} consumed (progress 0.95) with 2 material deltas -> must NOT be suppressed (must be story_update)`,
    candidate: {
      id: `cand_delta_${i}`,
      type: 'story',
      storyId: `story_delta_${i}`,
      articleId: `art_delta_${i}`,
      title: `Developing Story ${i} Major Pivot`,
      summary: `New material facts about story ${i}`,
      category: 'Finance',
      publishedAt: '2026-09-30T06:00:00.000Z',
      editorialImportance: 0.85,
      entityIds: ['ent_fin_01'],
      conceptIds: [],
      topicTags: ['finance'],
      readTimeMinutes: 2,
      materialChangesCount: 2,
      changesCount: 2,
      deltas: [
        { changeType: 'value_changed', summary: 'Revenue increased by $500M' },
        { changeType: 'status_changed', summary: 'Merger regulatory approval granted' },
      ],
    },
    userContext: {
      userId: `user_test_${i}`,
      followedEntityIds: [],
      followedTopics: [],
      readingHistory: {
        [`art_delta_${i}`]: { progress: 0.95, lastReadAt: '2026-09-29T12:00:00.000Z' },
      },
      storyReadHistory: {
        [`story_delta_${i}`]: { lastReadArticleId: `art_delta_${i}`, lastReadAt: '2026-09-29T12:00:00.000Z', maxProgress: 0.95 },
      },
      knowledgeFamiliarity: {},
      activeTrailIds: [],
      completedTrailIds: [],
    },
    expectedSuppressed: false,
    expectedReasonCode: 'continuing',
    expectedType: 'story_update',
  });
}

// 11-20: Deduplication Multi-Article Stories
for (let i = 11; i <= 20; i++) {
  scenarios.push({
    id: `DEDUP_STORY_THREAD_${i}`,
    description: `Multiple candidates with same storyId story_thread_${i} -> only 1 selected in brief`,
    candidates: [
      {
        id: `cand_${i}_art1`,
        type: 'story',
        storyId: `story_thread_${i}`,
        articleId: `art_${i}_1`,
        title: `Thread ${i} Post 1`,
        summary: 'Early post',
        category: 'Economy',
        publishedAt: '2026-09-30T01:00:00.000Z',
        editorialImportance: 0.6,
        entityIds: [],
        conceptIds: [],
        topicTags: [],
        readTimeMinutes: 2,
        materialChangesCount: 0,
      },
      {
        id: `cand_${i}_art2`,
        type: 'story',
        storyId: `story_thread_${i}`,
        articleId: `art_${i}_2`,
        title: `Thread ${i} Post 2 Major Update`,
        summary: 'Latest post',
        category: 'Economy',
        publishedAt: '2026-09-30T05:00:00.000Z',
        editorialImportance: 0.9,
        entityIds: [],
        conceptIds: [],
        topicTags: [],
        readTimeMinutes: 2,
        materialChangesCount: 1,
      },
    ],
    expectedSelectedCountForStory: 1,
  });
}

// 21-25: Followed Entity / Topic prioritization
for (let i = 21; i <= 25; i++) {
  scenarios.push({
    id: `FOLLOW_PRIORITY_${i}`,
    description: `Candidate matching followed entity ent_target_${i} receives followed reason code`,
    candidate: {
      id: `cand_follow_${i}`,
      type: 'article',
      articleId: `art_follow_${i}`,
      title: `Followed Entity Development ${i}`,
      summary: `Breaking news for entity ent_target_${i}`,
      category: 'Science',
      publishedAt: '2026-09-30T07:00:00.000Z',
      editorialImportance: 0.7,
      entityIds: [`ent_target_${i}`],
      conceptIds: [],
      topicTags: ['science'],
      readTimeMinutes: 2,
      materialChangesCount: 0,
    },
    userContext: {
      userId: `user_test_${i}`,
      followedEntityIds: [`ent_target_${i}`],
      followedTopics: [],
      readingHistory: {},
      storyReadHistory: {},
      knowledgeFamiliarity: {},
      activeTrailIds: [],
      completedTrailIds: [],
    },
    expectedReasonCode: 'followed',
  });
}

// 26-30: Continuing Story Prioritization
for (let i = 26; i <= 30; i++) {
  scenarios.push({
    id: `CONTINUING_STORY_${i}`,
    description: `In-progress story with new facts -> prioritized with compact_delta explanation mode`,
    candidate: {
      id: `cand_cont_${i}`,
      type: 'story',
      storyId: `story_cont_${i}`,
      articleId: `art_cont_${i}`,
      title: `Continuing Mission Update ${i}`,
      summary: `Mission phase 2 started`,
      category: 'Aerospace',
      publishedAt: '2026-09-30T06:30:00.000Z',
      editorialImportance: 0.75,
      entityIds: [],
      conceptIds: [],
      topicTags: ['aerospace'],
      readTimeMinutes: 2,
      materialChangesCount: 1,
      deltas: [{ changeType: 'new_fact', summary: 'Second stage separation confirmed' }],
    },
    userContext: {
      userId: `user_test_${i}`,
      followedEntityIds: [],
      followedTopics: [],
      readingHistory: {},
      storyReadHistory: {
        [`story_cont_${i}`]: { lastReadArticleId: `art_prev_${i}`, lastReadAt: '2026-09-29T20:00:00.000Z', maxProgress: 0.60 },
      },
      knowledgeFamiliarity: {},
      activeTrailIds: [],
      completedTrailIds: [],
    },
    expectedReasonCode: 'continuing',
    expectedExplanationMode: 'compact_delta',
  });
}

// 31-35: Knowledge Gap / Trail Recommendations
for (let i = 31; i <= 35; i++) {
  scenarios.push({
    id: `KNOWLEDGE_GAP_${i}`,
    description: `Story introducing unseen concepts -> assigned primer explanation mode`,
    candidate: {
      id: `cand_know_${i}`,
      type: 'article',
      articleId: `art_know_${i}`,
      title: `Quantum Teleportation Breakthrough ${i}`,
      summary: `Researchers demo entanglement transfer`,
      category: 'Physics',
      publishedAt: '2026-09-30T07:15:00.000Z',
      editorialImportance: 0.8,
      entityIds: [],
      conceptIds: [`con_quantum_${i}`],
      topicTags: ['quantum'],
      readTimeMinutes: 3,
      materialChangesCount: 0,
    },
    userContext: {
      userId: `user_test_${i}`,
      followedEntityIds: [],
      followedTopics: [],
      readingHistory: {},
      storyReadHistory: {},
      knowledgeFamiliarity: {
        [`con_quantum_${i}`]: 'unseen',
      },
      activeTrailIds: [],
      completedTrailIds: [],
    },
    expectedExplanationMode: 'primer',
  });
}

// 36-40: Diversity & Outside Bubble
for (let i = 36; i <= 40; i++) {
  scenarios.push({
    id: `OUTSIDE_BUBBLE_${i}`,
    description: `Outside bubble candidate selected when pool has diverse non-followed topics`,
    poolSize: 10,
    expectedOutsideBubbleSelected: true,
  });
}

// 41-45: Finite Size & Reading Time
for (let i = 41; i <= 45; i++) {
  scenarios.push({
    id: `FINITE_CONSTRAINTS_${i}`,
    description: `Brief must contain between 5 and 8 items with estimated time between 5 and 15 minutes`,
    minExpectedItems: 5,
    maxExpectedItems: 8,
  });
}

fs.writeFileSync('data/daily_brief_benchmark.json', JSON.stringify({ scenarios }, null, 2), 'utf8');
console.log(`Successfully wrote ${scenarios.length} benchmark scenarios to data/daily_brief_benchmark.json`);
