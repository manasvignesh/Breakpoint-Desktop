import { canonicalEntityService } from '../src/services/canonicalEntityService.ts';
import { canonicalConceptService } from '../src/services/canonicalConceptService.ts';
import { knowledgeGraphService } from '../src/services/knowledgeGraphService.ts';
import { knowledgeTrailService } from '../src/services/knowledgeTrailService.ts';
import { contextualExplanationService } from '../src/services/contextualExplanationService.ts';

async function runUnitTests() {
  console.log('========================================================');
  console.log('PHASE 16D: KNOWLEDGE GRAPH & TRAILS UNIT REGRESSION SUITE');
  console.log('========================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Canonical Entity Lookup & Aliases
  totalTests++;
  const isroEntity = await canonicalEntityService.getEntity('ent_isro');
  if (isroEntity && isroEntity.canonicalName === 'Indian Space Research Organisation' && isroEntity.aliases.includes('isro')) {
    console.log('  [PASS] 1. Canonical Entity lookup for ent_isro returns correct record.');
    passedTests++;
  } else {
    console.error('  [FAIL] 1. Canonical Entity lookup failed:', isroEntity);
  }

  // Test 2: Entity Disambiguation - Meta in AI context vs generic meta
  totalTests++;
  const metaWithContext = canonicalEntityService.normalizeEntityAlias('meta', 'Meta AI releases new open weights for Llama model');
  const metaWithoutContext = canonicalEntityService.normalizeEntityAlias('meta', 'The author discussed meta tags in HTML header');
  if (metaWithContext?.entityId === 'ent_meta' && metaWithoutContext === null) {
    console.log('  [PASS] 2. Disambiguation guard correctly resolved "Meta" only in AI context and rejected in generic context.');
    passedTests++;
  } else {
    console.error('  [FAIL] 2. Disambiguation guard failed: withContext =', metaWithContext, 'withoutContext =', metaWithoutContext);
  }

  // Test 3: Disambiguation Guard for Fruit vs Tech Company
  totalTests++;
  const appleFruit = canonicalEntityService.normalizeEntityAlias('apple', 'Farmers in Himachal report bumper apple harvest season');
  if (appleFruit === null) {
    console.log('  [PASS] 3. Disambiguation guard correctly rejected non-tech mentions of "apple" (Zero False Merge).');
    passedTests++;
  } else {
    console.error('  [FAIL] 3. False merge occurred for apple fruit:', appleFruit);
  }

  // Test 4: Concept Extraction & Category Mapping
  totalTests++;
  const semiCryoConcept = await canonicalConceptService.getConcept('con_semi_cryogenic_engine');
  if (
    semiCryoConcept &&
    semiCryoConcept.category === 'Space & Propulsion' &&
    semiCryoConcept.difficulty === 'advanced' &&
    semiCryoConcept.shortDefinition.length > 30
  ) {
    console.log('  [PASS] 4. Canonical Concept con_semi_cryogenic_engine has valid definition and category.');
    passedTests++;
  } else {
    console.error('  [FAIL] 4. Canonical Concept inspection failed:', semiCryoConcept);
  }

  // Test 5: Concept Extraction from Text
  totalTests++;
  const text = 'The RBI Monetary Policy Committee decided to maintain the benchmark repo rate to achieve the 4% inflation targeting mandate.';
  const extractedConcepts = canonicalConceptService.extractCanonicalConcepts(text);
  const conceptIds = extractedConcepts.map(c => c.id);
  if (conceptIds.includes('con_repo_rate') && conceptIds.includes('con_monetary_policy') && conceptIds.includes('con_inflation_targeting')) {
    console.log('  [PASS] 5. Multiple canonical concepts successfully extracted from policy text.');
    passedTests++;
  } else {
    console.error('  [FAIL] 5. Concept extraction missed target concepts:', conceptIds);
  }

  // Test 6: Typed Knowledge Graph Edge Validation
  totalTests++;
  const validEdge = {
    id: 'edge_test_valid',
    sourceId: 'con_semi_cryogenic_engine',
    targetId: 'con_rocket_propulsion',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'IS_A',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 },
    updatedAt: { seconds: 1725500000, nanoseconds: 0 },
  };
  const edgeCheck = knowledgeGraphService.validateEdge(validEdge);
  if (edgeCheck.valid) {
    console.log('  [PASS] 6. Valid typed edge with supporting evidence passed validation.');
    passedTests++;
  } else {
    console.error('  [FAIL] 6. Valid edge was incorrectly rejected:', edgeCheck);
  }

  // Test 7: Rejection of Unsupported / Circular Edges
  totalTests++;
  const unsupportedEdge = {
    id: 'edge_test_unsupported',
    sourceId: 'ent_isro',
    targetId: 'ent_isro',
    sourceType: 'entity',
    targetType: 'entity',
    relationType: 'RELATED_TO',
    evidenceArticleIds: [],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 },
    updatedAt: { seconds: 1725500000, nanoseconds: 0 },
  };
  const invalidCheck = knowledgeGraphService.validateEdge(unsupportedEdge);
  if (!invalidCheck.valid) {
    console.log('  [PASS] 7. Self-referential and evidence-free edge correctly rejected.');
    passedTests++;
  } else {
    console.error('  [FAIL] 7. Unsupported edge was incorrectly accepted.');
  }

  // Test 8: Knowledge Trail Cycle & Duplicate Prevention
  totalTests++;
  const cyclicTrail = {
    id: 'trail_test_cycle',
    title: 'Test Cyclic Trail',
    entryConceptId: 'con_repo_rate',
    steps: [
      { position: 1, conceptId: 'con_repo_rate', title: 'Repo Rate' },
      { position: 2, conceptId: 'con_monetary_policy', title: 'Monetary Policy' },
      { position: 3, conceptId: 'con_repo_rate', title: 'Repo Rate Again' },
    ],
    relatedEntityIds: [],
    relatedStoryIds: [],
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
  const trailCheck = knowledgeTrailService.validateTrail(cyclicTrail);
  if (!trailCheck.valid && trailCheck.errors.some(e => e.includes('Duplicate concept'))) {
    console.log('  [PASS] 8. Knowledge Trail validator successfully rejected cyclic duplicate concept.');
    passedTests++;
  } else {
    console.error('  [FAIL] 8. Cyclic trail was not caught:', trailCheck);
  }

  // Test 9: Contextual Explanation Generation
  totalTests++;
  const contextualExp = await contextualExplanationService.getContextualExplanation(
    'con_semi_cryogenic_engine',
    { title: 'ISRO hot tests Semi-Cryogenic engine power head at Mahendragiri' }
  );
  if (
    contextualExp &&
    contextualExp.concept.id === 'con_semi_cryogenic_engine' &&
    contextualExp.contextualRelevance.includes('LVM3') &&
    contextualExp.relatedConcepts.length > 0 &&
    contextualExp.relatedEntities.length > 0
  ) {
    console.log('  [PASS] 9. Contextual concept explanation derived with connected graph neighbors.');
    passedTests++;
  } else {
    console.error('  [FAIL] 9. Contextual explanation derivation failed:', contextualExp);
  }

  // Test 10: Legacy Article Backward Compatibility
  totalTests++;
  const legacyArticle = {
    id: 'art_legacy_01',
    title: 'Historic Tech Announcement',
    status: 'approved',
    // entityIds and conceptIds omitted intentionally
  };
  const extractedEnts = canonicalEntityService.extractCanonicalEntities(legacyArticle.title);
  const extractedCons = canonicalConceptService.extractCanonicalConcepts(legacyArticle.title);
  if (Array.isArray(extractedEnts) && Array.isArray(extractedCons)) {
    console.log('  [PASS] 10. Legacy article without entityIds/conceptIds functions without exceptions.');
    passedTests++;
  } else {
    console.error('  [FAIL] 10. Legacy article compatibility error.');
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} test suites passed.`);
  console.log(passedTests === totalTests ? '>>> ALL PHASE 16D UNIT REGRESSION TESTS PASSED <<<' : '>>> SOME TESTS FAILED <<<');
  console.log('========================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runUnitTests().catch(err => {
  console.error('Unit test error:', err);
  process.exit(1);
});
