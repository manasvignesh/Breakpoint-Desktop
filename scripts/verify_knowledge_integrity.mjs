import { canonicalEntityService } from '../src/services/canonicalEntityService.ts';
import { canonicalConceptService } from '../src/services/canonicalConceptService.ts';
import { knowledgeGraphService, SEED_KNOWLEDGE_EDGES } from '../src/services/knowledgeGraphService.ts';
import { knowledgeTrailService, SEED_KNOWLEDGE_TRAILS } from '../src/services/knowledgeTrailService.ts';

async function verifyIntegrity() {
  console.log('========================================================');
  console.log('PHASE 16D: KNOWLEDGE GRAPH DATA INTEGRITY AUDITOR');
  console.log('========================================================\n');

  const entities = canonicalEntityService.getAllCanonicalEntities();
  const concepts = canonicalConceptService.getAllCanonicalConcepts();
  const edges = SEED_KNOWLEDGE_EDGES;
  const trails = SEED_KNOWLEDGE_TRAILS;

  const entityMap = new Map(entities.map(e => [e.id, e]));
  const conceptMap = new Map(concepts.map(c => [c.id, c]));

  let issuesFound = 0;

  // 1. Check Entity Alias Collisions
  console.log('1. Checking Entity Alias Collisions...');
  const aliasToEntity = new Map();
  for (const ent of entities) {
    for (const alias of ent.aliases) {
      const lower = alias.toLowerCase().trim();
      if (aliasToEntity.has(lower) && aliasToEntity.get(lower) !== ent.id) {
        console.error(`  [ALIAS COLLISION] Alias "${lower}" shared by ${aliasToEntity.get(lower)} and ${ent.id}`);
        issuesFound++;
      } else {
        aliasToEntity.set(lower, ent.id);
      }
    }
  }
  console.log(`   ✓ Checked ${entities.length} canonical entities (${aliasToEntity.size} unique aliases).`);

  // 2. Check Concept Definitions Quality
  console.log('\n2. Auditing Canonical Concept Definitions...');
  for (const c of concepts) {
    if (!c.shortDefinition || c.shortDefinition.trim().length < 20) {
      console.error(`  [DEF SHORT] Concept ${c.id} definition too short: "${c.shortDefinition}"`);
      issuesFound++;
    }
    if (c.shortDefinition.toLowerCase().startsWith(`a ${c.name.toLowerCase()} is a ${c.name.toLowerCase()}`)) {
      console.error(`  [CIRCULAR DEF] Concept ${c.id} contains circular definition`);
      issuesFound++;
    }
  }
  console.log(`   ✓ Audited ${concepts.length} canonical concept definitions.`);

  // 3. Check Knowledge Edges Node Integrity
  console.log('\n3. Verifying Graph Edges Endpoint Integrity...');
  for (const edge of edges) {
    const sourceExists = edge.sourceType === 'entity' ? entityMap.has(edge.sourceId) : conceptMap.has(edge.sourceId);
    const targetExists = edge.targetType === 'entity' ? entityMap.has(edge.targetId) : conceptMap.has(edge.targetId);

    if (!sourceExists) {
      console.error(`  [DANGLING SOURCE] Edge ${edge.id}: Source node ${edge.sourceId} (${edge.sourceType}) does not exist!`);
      issuesFound++;
    }
    if (!targetExists) {
      console.error(`  [DANGLING TARGET] Edge ${edge.id}: Target node ${edge.targetId} (${edge.targetType}) does not exist!`);
      issuesFound++;
    }
    if (edge.sourceId === edge.targetId) {
      console.error(`  [CIRCULAR EDGE] Edge ${edge.id} connects node to itself`);
      issuesFound++;
    }
    if (!edge.evidenceArticleIds || edge.evidenceArticleIds.length === 0) {
      console.error(`  [NO EVIDENCE] Edge ${edge.id} has 0 supporting evidenceArticleIds`);
      issuesFound++;
    }
  }
  console.log(`   ✓ Verified ${edges.length} knowledge graph edges.`);

  // 4. Check Knowledge Trails Integrity & Quality
  console.log('\n4. Verifying Knowledge Trails Pedagogical Integrity...');
  for (const trail of trails) {
    const domainTrail = {
      ...trail,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const validation = knowledgeTrailService.validateTrail(domainTrail);
    if (!validation.valid) {
      console.error(`  [TRAIL ERROR] Trail ${trail.id}: ${validation.errors.join(', ')}`);
      issuesFound += validation.errors.length;
    }

    if (!conceptMap.has(trail.entryConceptId)) {
      console.error(`  [DANGLING ENTRY] Trail ${trail.id} references missing entry concept: ${trail.entryConceptId}`);
      issuesFound++;
    }
  }
  console.log(`   ✓ Verified ${trails.length} canonical knowledge trails.`);

  console.log('\n========================================================');
  if (issuesFound === 0) {
    console.log('✅ ZERO GRAPH INTEGRITY ISSUES DETECTED. ALL NODES, EDGES, AND TRAILS ARE VALID.');
  } else {
    console.error(`❌ ${issuesFound} GRAPH INTEGRITY ISSUES FOUND!`);
    process.exit(1);
  }
  console.log('========================================================');
}

verifyIntegrity().catch(err => {
  console.error('Integrity verification failed:', err);
  process.exit(1);
});
