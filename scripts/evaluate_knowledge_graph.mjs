import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { canonicalEntityService } from '../src/services/canonicalEntityService.ts';
import { canonicalConceptService } from '../src/services/canonicalConceptService.ts';
import { knowledgeGraphService } from '../src/services/knowledgeGraphService.ts';
import { knowledgeTrailService } from '../src/services/knowledgeTrailService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runEvaluation() {
  console.log('========================================================');
  console.log('BREAKPOINT PHASE 16D: KNOWLEDGE GRAPH & TRAILS BENCHMARK');
  console.log('========================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  // ----------------------------------------------------
  // SUITE 1: ENTITY BENCHMARK EVALUATION (52 Cases)
  // ----------------------------------------------------
  console.log('--- SUITE 1: Canonical Entity Recognition & Disambiguation ---');
  const entityBenchmark = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../data/entity_benchmark.json'), 'utf-8')
  );

  let entityTP = 0;
  let entityTN = 0;
  let entityFP = 0; // False Merges
  let entityFN = 0;

  for (const tc of entityBenchmark) {
    totalTests++;
    const extracted = canonicalEntityService.extractCanonicalEntities(tc.text);
    const hasMatch = extracted.length > 0;

    if (tc.expectedEntityId !== null) {
      // Positive Case: verify expected entity was extracted
      const matchedExpected = extracted.some(e => e.id === tc.expectedEntityId);
      if (matchedExpected) {
        entityTP++;
        passedTests++;
      } else if (hasMatch) {
        entityFP++; // False merge / wrong entity extracted
        console.error(`  [ENTITY FALSE MERGE] Case ${tc.id}: Expected ${tc.expectedEntityId}, got ${extracted.map(e => e.id).join(', ')}`);
      } else {
        entityFN++;
        console.error(`  [ENTITY MISS] Case ${tc.id}: Expected ${tc.expectedEntityId}, but none was extracted`);
      }
    } else {
      // Negative / Guarded Disambiguation Case (e.g., fruit "apple" or planetary "mercury")
      if (hasMatch) {
        entityFP++; // False Positive merge
        console.error(`  [ENTITY FALSE POSITIVE] Case ${tc.id}: Ambiguous text matched ${extracted.map(e => e.id).join(', ')}`);
      } else {
        entityTN++;
        passedTests++;
      }
    }
  }

  const entityPrecision = (entityTP / Math.max(1, entityTP + entityFP)) * 100;
  const entityRecall = (entityTP / Math.max(1, entityTP + entityFN)) * 100;
  const entityFalseMergeRate = (entityFP / Math.max(1, entityTP + entityFP + entityTN + entityFN)) * 100;

  console.log(`- Total Entity Cases Evaluated: ${entityBenchmark.length}`);
  console.log(`- True Positives (TP):          ${entityTP}`);
  console.log(`- True Negatives (TN):          ${entityTN}`);
  console.log(`- False Positives (FP):         ${entityFP}`);
  console.log(`- False Negatives (FN):         ${entityFN}`);
  console.log(`- Entity Precision:             ${entityPrecision.toFixed(1)}%`);
  console.log(`- Entity Recall:                ${entityRecall.toFixed(1)}%`);
  console.log(`- False Merge Rate:             ${entityFalseMergeRate.toFixed(1)}% (CRITICAL)`);

  // ----------------------------------------------------
  // SUITE 2: CONCEPT BENCHMARK EVALUATION (50 Cases)
  // ----------------------------------------------------
  console.log('\n--- SUITE 2: Canonical Concept Extraction & Quality ---');
  const conceptBenchmark = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../data/concept_benchmark.json'), 'utf-8')
  );

  let conceptTP = 0;
  let conceptTN = 0;
  let conceptFP = 0; // Irrelevant noisy phrase accepted as concept
  let conceptFN = 0;

  for (const tc of conceptBenchmark) {
    totalTests++;
    const extracted = canonicalConceptService.extractCanonicalConcepts(tc.text);
    const hasMatch = extracted.length > 0;
    const matchedId = hasMatch ? extracted[0].id : null;

    if (tc.isValidConcept) {
      if (matchedId === tc.expectedConceptId || (extracted.some(c => c.id === tc.expectedConceptId))) {
        conceptTP++;
        passedTests++;
      } else {
        conceptFN++;
        console.error(`  [CONCEPT MISS] Case ${tc.id}: Expected ${tc.expectedConceptId}, got:`, extracted.map(e => e.id));
      }
    } else {
      // Negative / Noisy candidate case (e.g., "September 29 announcement", "₹130 crore investment")
      if (hasMatch && extracted.some(c => c.aliases.includes(tc.candidate.toLowerCase()))) {
        conceptFP++;
        console.error(`  [CONCEPT IRRELEVANT FALSE POSITIVE] Case ${tc.id}: Noisy candidate "${tc.candidate}" matched as concept`);
      } else {
        conceptTN++;
        passedTests++;
      }
    }
  }

  const conceptPrecision = (conceptTP / Math.max(1, conceptTP + conceptFP)) * 100;
  const conceptRecall = (conceptTP / Math.max(1, conceptTP + conceptFN)) * 100;
  const irrelevantRate = (conceptFP / Math.max(1, conceptTP + conceptFP + conceptTN + conceptFN)) * 100;

  console.log(`- Total Concept Cases Evaluated: ${conceptBenchmark.length}`);
  console.log(`- True Positives (TP):          ${conceptTP}`);
  console.log(`- True Negatives (TN):          ${conceptTN}`);
  console.log(`- False Positives (FP):         ${conceptFP}`);
  console.log(`- False Negatives (FN):         ${conceptFN}`);
  console.log(`- Concept Precision:            ${conceptPrecision.toFixed(1)}%`);
  console.log(`- Concept Recall:               ${conceptRecall.toFixed(1)}%`);
  console.log(`- Irrelevant Concept Rate:      ${irrelevantRate.toFixed(1)}%`);

  // ----------------------------------------------------
  // SUITE 3: RELATIONSHIP BENCHMARK EVALUATION (35 Cases)
  // ----------------------------------------------------
  console.log('\n--- SUITE 3: Graph Relationships & Evidence Validation ---');
  const relationshipBenchmark = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../data/relationship_benchmark.json'), 'utf-8')
  );

  let edgeTP = 0;
  let edgeTN = 0;
  let edgeFP = 0; // Unsupported edge accepted
  let edgeFN = 0;

  for (const tc of relationshipBenchmark) {
    totalTests++;
    const testEdge = {
      id: `test_${tc.id}`,
      sourceId: tc.sourceId,
      targetId: tc.targetId,
      sourceType: tc.sourceId.startsWith('ent_') ? 'entity' : 'concept',
      targetType: tc.targetId.startsWith('ent_') ? 'entity' : 'concept',
      relationType: tc.expectedRelation,
      evidenceArticleIds: tc.hasEvidence ? ['art_test_evidence'] : [],
      confidence: 1.0,
      createdAt: { seconds: 1725500000, nanoseconds: 0 },
      updatedAt: { seconds: 1725500000, nanoseconds: 0 },
    };

    const validation = knowledgeGraphService.validateEdge(testEdge);

    if (tc.isValid) {
      if (validation.valid) {
        edgeTP++;
        passedTests++;
      } else {
        edgeFN++;
        console.error(`  [EDGE FALSE REJECTION] Case ${tc.id}: Valid edge rejected: ${validation.reason}`);
      }
    } else {
      if (!validation.valid) {
        edgeTN++;
        passedTests++;
      } else {
        edgeFP++;
        console.error(`  [EDGE UNSUPPORTED ACCEPTANCE] Case ${tc.id}: Unsupported edge accepted`);
      }
    }
  }

  const edgePrecision = (edgeTP / Math.max(1, edgeTP + edgeFP)) * 100;
  const edgeRecall = (edgeTP / Math.max(1, edgeTP + edgeFN)) * 100;
  const unsupportedEdgeRate = (edgeFP / Math.max(1, edgeTP + edgeFP + edgeTN + edgeFN)) * 100;

  console.log(`- Total Relationship Cases Evaluated: ${relationshipBenchmark.length}`);
  console.log(`- True Positives (TP):                ${edgeTP}`);
  console.log(`- True Negatives (TN):                ${edgeTN}`);
  console.log(`- Unsupported Accepted Edges (FP):    ${edgeFP}`);
  console.log(`- Relationship Precision:             ${edgePrecision.toFixed(1)}%`);
  console.log(`- Relationship Recall:                ${edgeRecall.toFixed(1)}%`);
  console.log(`- Unsupported Edge Rate:              ${unsupportedEdgeRate.toFixed(1)}% (CRITICAL)`);

  // ----------------------------------------------------
  // SUITE 4: KNOWLEDGE TRAILS QUALITY BENCHMARK (12 Cases)
  // ----------------------------------------------------
  console.log('\n--- SUITE 4: Knowledge Trails Pedagogical Coherence & Quality ---');
  const trailsBenchmark = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../data/knowledge_trails_benchmark.json'), 'utf-8')
  );

  let trailPassedCount = 0;
  for (const tc of trailsBenchmark) {
    totalTests++;
    const testTrail = {
      id: tc.id,
      title: tc.title,
      entryConceptId: tc.entryConceptId,
      steps: tc.stepConceptIds.map((cid, idx) => ({
        position: idx + 1,
        conceptId: cid,
        title: `Step ${idx + 1}`,
        reason: 'Step progression',
      })),
      relatedEntityIds: [],
      relatedStoryIds: [],
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const validation = knowledgeTrailService.validateTrail(testTrail);

    if (tc.expectedValid) {
      if (validation.valid) {
        trailPassedCount++;
        passedTests++;
      } else {
        console.error(`  [TRAIL FALSE REJECTION] Case ${tc.id}: Valid trail rejected: ${validation.errors.join(', ')}`);
      }
    } else {
      if (!validation.valid) {
        trailPassedCount++;
        passedTests++;
      } else {
        console.error(`  [TRAIL INVALID ACCEPTANCE] Case ${tc.id}: Invalid trail with cycles or length errors was accepted`);
      }
    }
  }

  console.log(`- Total Knowledge Trails Evaluated: ${trailsBenchmark.length}`);
  console.log(`- Quality Validation Pass Rate:     ${((trailPassedCount / trailsBenchmark.length) * 100).toFixed(1)}%`);

  console.log('\n========================================================');
  console.log(`BENCHMARK SUMMARY: ${passedTests} / ${totalTests} tests passed.`);
  console.log('========================================================');

  // Assertions
  if (entityFalseMergeRate > 0) {
    console.error('CRITICAL ASSERTION FAILED: Entity False Merge Rate must be 0.0%');
    process.exit(1);
  }
  if (unsupportedEdgeRate > 0) {
    console.error('CRITICAL ASSERTION FAILED: Unsupported Edge Rate must be 0.0%');
    process.exit(1);
  }
  if (passedTests !== totalTests) {
    console.error('SOME BENCHMARK TESTS FAILED');
    process.exit(1);
  }

  console.log('✅ ALL PHASE 16D BENCHMARKS PASSED WITH 100% PRECISION & ZERO FALSE MERGES.');
}

runEvaluation().catch(err => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
