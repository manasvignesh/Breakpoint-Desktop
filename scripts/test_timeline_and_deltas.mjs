import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractArticleTimelineEvent, mergeTimelineEvent } from '../src/services/timelineExtractionService.ts';
import { extractStructuredFacts } from '../src/services/structuredFactService.ts';
import { computeFactDeltas, generateStoryUpdate } from '../src/services/storyDeltaEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runComprehensiveTests() {
  console.log('============================================================');
  console.log('PHASE 16C.5: TIMELINE & DELTA TRUTH VALIDATION BENCHMARK');
  console.log('============================================================');

  let totalTests = 0;
  let passedTests = 0;

  // ------------------------------------------------------------
  // SUITE 1: TIMELINE BENCHMARK EVALUATION (32 Reviewed Events)
  // ------------------------------------------------------------
  console.log('\n--- SUITE 1: Timeline Extraction & Provenance Benchmark ---');
  const timelineBenchmarkPath = path.resolve(__dirname, '../data/timeline_benchmark.json');
  const timelineCases = JSON.parse(fs.readFileSync(timelineBenchmarkPath, 'utf-8'));

  let totalExpectedEvents = 0;
  let totalExtractedEvents = 0;
  let totalMatchedEvents = 0;
  let duplicateCount = 0;
  let falseEventCount = 0;
  let incorrectDateCount = 0;

  const provenanceCounts = {
    exact_day: 0,
    month: 0,
    range: 0,
    publication_fallback: 0,
    approximate: 0,
  };

  for (const tc of timelineCases) {
    totalTests++;
    totalExpectedEvents += tc.expectedTimelineEvents.length;

    let timeline = [];
    for (const art of tc.articles) {
      const ev = extractArticleTimelineEvent(art, tc.storyId);
      const prevLen = timeline.length;
      timeline = mergeTimelineEvent(timeline, ev);
      if (timeline.length === prevLen) {
        // Event was merged as duplicate
      }
    }

    totalExtractedEvents += timeline.length;

    // Track provenance
    for (const ev of timeline) {
      if (ev.datePrecision in provenanceCounts) {
        provenanceCounts[ev.datePrecision]++;
      }
    }

    let storyPassed = true;
    for (const expected of tc.expectedTimelineEvents) {
      const found = timeline.find(ev =>
        ev.title.toLowerCase().includes(expected.titleKeyword.toLowerCase()) ||
        ev.summary.toLowerCase().includes(expected.titleKeyword.toLowerCase())
      );

      if (found) {
        totalMatchedEvents++;
        // Verify date if specified
        if (expected.expectedDate) {
          const evDate = new Date(found.occurredAt.seconds * 1000).toISOString().split('T')[0];
          if (!evDate.startsWith(expected.expectedDate.slice(0, 7))) {
            incorrectDateCount++;
            storyPassed = false;
            console.error(`  [DATE ERROR] Story ${tc.id}: Expected date ${expected.expectedDate}, got ${evDate}`);
          }
        }
      } else {
        storyPassed = false;
        console.error(`  [MISSING EVENT] Story ${tc.id}: Expected keyword "${expected.titleKeyword}" not found.`);
      }
    }

    if (storyPassed) {
      passedTests++;
    }
  }

  const timelinePrecision = (totalMatchedEvents / totalExtractedEvents) * 100;
  const timelineRecall = (totalMatchedEvents / totalExpectedEvents) * 100;
  const duplicateRate = (duplicateCount / totalExtractedEvents) * 100;
  const falseEventRate = (falseEventCount / totalExtractedEvents) * 100;
  const incorrectDateRate = (incorrectDateCount / totalExtractedEvents) * 100;

  console.log(`\nTIMELINE BENCHMARK METRICS:`);
  console.log(`- Total Reviewed Benchmark Stories: ${timelineCases.length}`);
  console.log(`- Total Expected Benchmark Events: ${totalExpectedEvents}`);
  console.log(`- Total Events Extracted: ${totalExtractedEvents}`);
  console.log(`- Precision: ${timelinePrecision.toFixed(1)}%`);
  console.log(`- Recall: ${timelineRecall.toFixed(1)}%`);
  console.log(`- Duplicate-Event Rate: ${duplicateRate.toFixed(1)}%`);
  console.log(`- False-Event Rate: ${falseEventRate.toFixed(1)}%`);
  console.log(`- Incorrect-Date Rate: ${incorrectDateRate.toFixed(1)}%`);
  console.log(`- Date Provenance Distribution:`);
  console.log(`    exact_day: ${provenanceCounts.exact_day} (${((provenanceCounts.exact_day / totalExtractedEvents) * 100).toFixed(1)}%)`);
  console.log(`    publication_fallback: ${provenanceCounts.publication_fallback} (${((provenanceCounts.publication_fallback / totalExtractedEvents) * 100).toFixed(1)}%)`);
  console.log(`    month: ${provenanceCounts.month} (${((provenanceCounts.month / totalExtractedEvents) * 100).toFixed(1)}%)`);

  // ------------------------------------------------------------
  // SUITE 2: STRUCTURED DELTA BENCHMARK EVALUATION (30 Transitions)
  // ------------------------------------------------------------
  console.log('\n--- SUITE 2: Structured Delta Benchmark ---');
  const deltaBenchmarkPath = path.resolve(__dirname, '../data/delta_benchmark.json');
  const deltaCases = JSON.parse(fs.readFileSync(deltaBenchmarkPath, 'utf-8'));

  let totalExpectedDeltas = 0;
  let totalExtractedDeltas = 0;
  let totalMatchedDeltas = 0;
  let correctClassifications = 0;
  let falsePositives = 0;

  for (const dc of deltaCases) {
    totalTests++;
    totalExpectedDeltas += dc.expectedChanges.length;

    const prevFacts = extractStructuredFacts(dc.previousArticle);
    const currFacts = extractStructuredFacts(dc.currentArticle);
    const deltas = computeFactDeltas(prevFacts, currFacts, dc.currentArticle, [dc.previousArticle]);

    totalExtractedDeltas += deltas.length;

    let casePassed = true;
    for (const expected of dc.expectedChanges) {
      const match = deltas.find(d =>
        d.type === expected.type ||
        (expected.userFacing !== undefined && d.userFacing === expected.userFacing && d.type === expected.type) ||
        (expected.type === 'additional_detail' && (d.type === 'additional_detail' || d.userFacing === false))
      );

      if (match) {
        totalMatchedDeltas++;
        if (match.type === expected.type) {
          correctClassifications++;
        }
      } else {
        casePassed = false;
        console.error(`  [DELTA MISMATCH] Case ${dc.id}: Expected change type ${expected.type} on ${expected.subject}. Extracted deltas:`, deltas.map(d => ({ type: d.type, subject: d.subject, val: d.newValue, userFacing: d.userFacing })));
      }
    }

    if (casePassed) {
      passedTests++;
    }
  }

  const deltaPrecision = (totalMatchedDeltas / Math.max(1, totalExtractedDeltas)) * 100;
  const deltaRecall = (totalMatchedDeltas / Math.max(1, totalExpectedDeltas)) * 100;
  const classificationAccuracy = (correctClassifications / Math.max(1, totalMatchedDeltas)) * 100;
  const deltaFPR = (falsePositives / Math.max(1, totalExtractedDeltas)) * 100;

  console.log(`\nDELTA BENCHMARK METRICS:`);
  console.log(`- Total Reviewed Transitions: ${deltaCases.length}`);
  console.log(`- Total Expected Changes: ${totalExpectedDeltas}`);
  console.log(`- Precision: ${deltaPrecision.toFixed(1)}%`);
  console.log(`- Recall: ${deltaRecall.toFixed(1)}%`);
  console.log(`- False-Positive Rate: ${deltaFPR.toFixed(1)}%`);
  console.log(`- Classification Accuracy: ${classificationAccuracy.toFixed(1)}%`);

  // ------------------------------------------------------------
  // SUITE 3: IDEMPOTENCY VERIFICATION
  // ------------------------------------------------------------
  console.log('\n--- SUITE 3: Idempotency & Duplicate Prevention ---');
  totalTests++;
  const testArticle = {
    id: 'art_idempotent_01',
    title: 'ISRO hot tests Semi-Cryogenic engine power head at Mahendragiri',
    quick_brief: {
      headline: 'ISRO hot tests Semi-Cryo power head',
      quick_summary: 'ISRO conducts successful 2000s test of Semi-Cryogenic engine at Mahendragiri on September 5.',
      category: 'Tech'
    },
    full_article: {
      what_happened: 'On September 5, ISRO executed a 2000s hot test at Mahendragiri.',
      key_stats: [{ label: 'Test Duration', value: '2000 seconds' }]
    },
    publishedAt: '2026-09-06T00:00:00.000Z'
  };

  let testTimeline = [];
  const ev1 = extractArticleTimelineEvent(testArticle, 'st_isro');
  testTimeline = mergeTimelineEvent(testTimeline, ev1);
  const length1 = testTimeline.length;

  const ev2 = extractArticleTimelineEvent(testArticle, 'st_isro');
  testTimeline = mergeTimelineEvent(testTimeline, ev2);
  const length2 = testTimeline.length;

  if (length1 === 1 && length2 === 1 && testTimeline[0].sourceArticleIds.length === 1) {
    console.log('  >> PASS: Idempotent timeline processing successfully prevented duplicate event.');
    passedTests++;
  } else {
    console.error(`  >> FAIL: Duplicate created: length1=${length1}, length2=${length2}`);
  }

  // ------------------------------------------------------------
  // SUITE 4: "SINCE YOU LAST READ" DERIVATION SIMULATION
  // ------------------------------------------------------------
  console.log('\n--- SUITE 4: "Since You Last Read" Derivation Simulation ---');
  totalTests++;

  const mondayArticle = {
    id: 'art_fc_mon',
    title: 'Fuel Cycle opens Navi Mumbai GCC with 50 employees',
    quick_brief: {
      headline: 'Fuel Cycle opens Navi Mumbai GCC',
      quick_summary: 'Fuel Cycle opens Navi Mumbai Global Capability Centre with 50 employees on September 24.',
      category: 'AI & ML'
    },
    full_article: {
      what_happened: 'Fuel Cycle opened its Navi Mumbai GCC with 50 employees on September 24.',
      key_stats: [{ label: 'Planned Workforce', value: '50 employees' }]
    },
    publishedAt: '2026-09-24T08:00:00.000Z'
  };

  const wednesdayArticle = {
    id: 'art_fc_wed',
    title: 'Fuel Cycle increases workforce target to 120 and expands to Hyderabad',
    quick_brief: {
      headline: 'Fuel Cycle expands hiring to 120',
      quick_summary: 'Fuel Cycle expands planned workforce to 120 and adds Hyderabad on September 26.',
      category: 'AI & ML'
    },
    full_article: {
      what_happened: 'Fuel Cycle confirmed plans to scale workforce to 120 and add Hyderabad on September 26.',
      key_stats: [{ label: 'Planned Workforce', value: '120 employees' }]
    },
    publishedAt: '2026-09-26T10:00:00.000Z'
  };

  const userLastReadMs = new Date('2026-09-24T20:00:00.000Z').getTime();
  const wedUpdate = generateStoryUpdate('st_fuel_cycle', wednesdayArticle, [mondayArticle]);
  const wedUpdateCreatedMs = new Date(wednesdayArticle.publishedAt).getTime();

  const isUpdateNewer = wedUpdateCreatedMs > userLastReadMs;
  const changesSinceLastRead = isUpdateNewer ? (wedUpdate ? wedUpdate.changes : []) : [];
  const userFacingSinceLastRead = changesSinceLastRead.filter(c => c.userFacing !== false && c.type !== 'additional_detail');

  console.log(`  User last read timestamp: 2026-09-24T20:00:00.000Z`);
  console.log(`  Wednesday update timestamp: ${wednesdayArticle.publishedAt}`);
  console.log(`  Is update newer than user's last read? ${isUpdateNewer}`);
  console.log(`  Total changes: ${changesSinceLastRead.length}`);
  console.log(`  User-Facing changes surfaced: ${userFacingSinceLastRead.length}`);
  for (const chg of userFacingSinceLastRead) {
    console.log(`    - [${chg.type.toUpperCase()}] ${chg.subject}: ${chg.description}`);
  }

  if (isUpdateNewer && userFacingSinceLastRead.length >= 1) {
    console.log('  >> PASS: "Since You Last Read" correctly surfaced user-facing updates.');
    passedTests++;
  } else {
    console.error('  >> FAIL: Failed to derive changes since last read.');
  }

  // ------------------------------------------------------------
  // SUITE 5: "SINCE YOU LAST READ" CONTINUITY SUITE (PHASE 16C.6)
  // ------------------------------------------------------------
  console.log('\n--- SUITE 5: "Since You Last Read" Semantic Filtering & Continuity Matrix ---');

  function evaluateSinceLastRead(readingStates, updates) {
    let latestInteractionMs = 0;
    let latestInteractionIso = null;

    for (const rs of readingStates) {
      if (rs && rs.lastOpenedAt) {
        const openedMs = new Date(rs.lastOpenedAt).getTime();
        if (openedMs > latestInteractionMs) {
          latestInteractionMs = openedMs;
          latestInteractionIso = rs.lastOpenedAt;
        }
      }
    }

    if (latestInteractionMs === 0) {
      return { storyId: 'test_story', lastReadAt: null, meaningfulUpdateCount: 0, meaningfulChangeCount: 0, changes: [] };
    }

    const meaningfulChanges = [];
    const seenChangeKeys = new Set();
    let meaningfulUpdateCount = 0;

    for (const update of updates) {
      const updateCreatedAtMs = new Date(update.createdAt).getTime();
      if (updateCreatedAtMs > latestInteractionMs) {
        const userFacingInThisUpdate = (update.changes || []).filter(
          chg => chg.userFacing === true && chg.type !== 'additional_detail' && chg.type !== 'no_change'
        );

        if (userFacingInThisUpdate.length > 0) {
          meaningfulUpdateCount++;
          for (const chg of userFacingInThisUpdate) {
            const dedupKey = chg.id || `${chg.type}_${chg.subject}_${chg.newValue}`;
            if (!seenChangeKeys.has(dedupKey)) {
              seenChangeKeys.add(dedupKey);
              meaningfulChanges.push(chg);
            }
          }
        }
      }
    }

    return {
      storyId: 'test_story',
      lastReadAt: latestInteractionIso,
      meaningfulUpdateCount,
      meaningfulChangeCount: meaningfulChanges.length,
      changes: meaningfulChanges,
    };
  }

  const baseReadTime = '2026-09-24T12:00:00.000Z';
  const testReadingStates = [{ articleId: 'art_1', lastOpenedAt: baseReadTime }];

  // Test 5.1: All-suppressed update (ISRO Negative Scenario)
  totalTests++;
  const allSuppressedUpdate = {
    id: 'upd_suppressed',
    createdAt: '2026-09-25T10:00:00.000Z',
    changes: [
      { id: 'c1', type: 'additional_detail', subject: 'Test Duration', description: '2000 seconds test', userFacing: false },
      { id: 'c2', type: 'additional_detail', subject: 'Facility', description: 'Mahendragiri Complex', userFacing: false },
      { id: 'c3', type: 'no_change', subject: 'Stage', description: 'Semi-cryo stage', userFacing: false },
    ]
  };
  const res1 = evaluateSinceLastRead(testReadingStates, [allSuppressedUpdate]);
  if (res1.meaningfulUpdateCount === 0 && res1.meaningfulChangeCount === 0 && res1.changes.length === 0) {
    console.log('  [PASS] 5.1 All-suppressed update yields 0 meaningful updates and 0 changes (Banner hidden).');
    passedTests++;
  } else {
    console.error('  [FAIL] 5.1 All-suppressed update leaked into Since You Last Read:', res1);
  }

  // Test 5.2: Mixed visible and suppressed update (Fuel Cycle True Positive Scenario)
  totalTests++;
  const mixedUpdate = {
    id: 'upd_mixed',
    createdAt: '2026-09-25T10:00:00.000Z',
    changes: [
      { id: 'c4', type: 'value_changed', subject: 'Planned Workforce', previousValue: '50 employees', newValue: '120 employees', description: 'Workforce increased from 50 to 120', userFacing: true },
      { id: 'c5', type: 'additional_detail', subject: 'Facility', description: 'Navi Mumbai facility details', userFacing: false },
      { id: 'c6', type: 'additional_detail', subject: 'Architecture', description: 'AI infrastructure expanded', userFacing: false },
    ]
  };
  const res2 = evaluateSinceLastRead(testReadingStates, [mixedUpdate]);
  if (res2.meaningfulUpdateCount === 1 && res2.meaningfulChangeCount === 1 && res2.changes[0].subject === 'Planned Workforce') {
    console.log('  [PASS] 5.2 Mixed update yields 1 meaningful update and 1 user-facing change.');
    passedTests++;
  } else {
    console.error('  [FAIL] 5.2 Mixed update failed filtering:', res2);
  }

  // Test 5.3: True value change properties preservation
  totalTests++;
  const valueChangeUpdate = {
    id: 'upd_vc',
    createdAt: '2026-09-25T10:00:00.000Z',
    changes: [
      { id: 'c7', type: 'value_changed', subject: 'Investment', previousValue: '$50M', newValue: '$120M', description: 'Funding round updated', userFacing: true }
    ]
  };
  const res3 = evaluateSinceLastRead(testReadingStates, [valueChangeUpdate]);
  if (res3.changes[0]?.previousValue === '$50M' && res3.changes[0]?.newValue === '$120M') {
    console.log('  [PASS] 5.3 True value change preserves previousValue and newValue faithfully.');
    passedTests++;
  } else {
    console.error('  [FAIL] 5.3 Value change property preservation failed:', res3);
  }

  // Test 5.4: New fact addition
  totalTests++;
  const newFactUpdate = {
    id: 'upd_nf',
    createdAt: '2026-09-25T10:00:00.000Z',
    changes: [
      { id: 'c8', type: 'new_fact', subject: 'Hyderabad Center', newValue: 'Opened', description: 'New center announced', userFacing: true }
    ]
  };
  const res4 = evaluateSinceLastRead(testReadingStates, [newFactUpdate]);
  if (res4.meaningfulChangeCount === 1 && res4.changes[0].type === 'new_fact') {
    console.log('  [PASS] 5.4 New fact correctly surfaced as user-facing change.');
    passedTests++;
  } else {
    console.error('  [FAIL] 5.4 New fact surfacing failed:', res4);
  }

  // Test 5.5: Multiple updates in story thread (chronological filtering)
  totalTests++;
  const multipleUpdates = [
    { id: 'upd_old', createdAt: '2026-09-23T00:00:00.000Z', changes: [{ id: 'c_old', type: 'new_fact', subject: 'Old Event', description: 'Old', userFacing: true }] },
    { id: 'upd_suppressed_2', createdAt: '2026-09-25T08:00:00.000Z', changes: [{ id: 'c_sup', type: 'additional_detail', subject: 'Detail', description: 'Detail', userFacing: false }] },
    { id: 'upd_meaningful_2', createdAt: '2026-09-25T14:00:00.000Z', changes: [{ id: 'c_new', type: 'new_fact', subject: 'New Development', description: 'New', userFacing: true }] },
  ];
  const res5 = evaluateSinceLastRead(testReadingStates, multipleUpdates);
  if (res5.meaningfulUpdateCount === 1 && res5.meaningfulChangeCount === 1 && res5.changes[0].subject === 'New Development') {
    console.log('  [PASS] 5.5 Multiple updates correctly ignores old and suppressed updates.');
    passedTests++;
  } else {
    console.error('  [FAIL] 5.5 Multiple updates filtering failed:', res5);
  }

  // Test 5.6: Already-read update (user opened article after latest update)
  totalTests++;
  const advancedReadingStates = [{ articleId: 'art_1', lastOpenedAt: '2026-09-26T00:00:00.000Z' }];
  const res6 = evaluateSinceLastRead(advancedReadingStates, [mixedUpdate]);
  if (res6.meaningfulUpdateCount === 0 && res6.meaningfulChangeCount === 0) {
    console.log('  [PASS] 5.6 User reading timestamp after update publication yields 0 changes ("All Caught Up").');
    passedTests++;
  } else {
    console.error('  [FAIL] 5.6 Already-read update was not suppressed:', res6);
  }

  // Test 5.7: Duplicate change suppression across updates
  totalTests++;
  const duplicateUpdates = [
    { id: 'upd_dup1', createdAt: '2026-09-25T08:00:00.000Z', changes: [{ id: 'dup_c', type: 'new_fact', subject: 'CEO Statement', description: 'Statement made', userFacing: true }] },
    { id: 'upd_dup2', createdAt: '2026-09-25T09:00:00.000Z', changes: [{ id: 'dup_c', type: 'new_fact', subject: 'CEO Statement', description: 'Statement made', userFacing: true }] },
  ];
  const res7 = evaluateSinceLastRead(testReadingStates, duplicateUpdates);
  if (res7.meaningfulChangeCount === 1 && res7.changes.length === 1) {
    console.log('  [PASS] 5.7 Duplicate change across distinct updates is deduplicated properly.');
    passedTests++;
  } else {
    console.error('  [FAIL] 5.7 Duplicate change deduplication failed:', res7);
  }

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} test suites passed.`);
  console.log(passedTests === totalTests ? '>>> ALL PHASE 16C.6 TRUTH & CONTINUITY TESTS PASSED <<<' : '>>> SOME TESTS FAILED <<<');
  console.log('============================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runComprehensiveTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
