# Knowledge Graph & Relationships Specification

> **Platform Reference**: Breakpoint Platform Phase 16D
> **Firestore Collection**: `knowledgeEdges/{edgeId}`
> **Authoritative Service**: `src/services/knowledgeGraphService.ts`
> **Flutter Model**: `lib/features/knowledge_graph/models/knowledge_edge_model.dart`

---

## 1. Overview & Graph Architecture

The Breakpoint Knowledge Graph models typed, directional, and evidenced relationships connecting **Canonical Entities** (`entities/{entityId}`) and **Canonical Concepts** (`concepts/{conceptId}`).

Unlike ungrounded LLM hallucinated linkings, every edge in the Breakpoint Knowledge Graph requires **authoritative evidence snippets** or source references.

```
+------------------+         depends_on          +------------------+
|  con_semi_cryo   | ------------------------->  |   con_cryogenic  |
+------------------+                             +------------------+
        |                                                 ^
        | operates_in                                     | builds
        v                                                 |
+------------------+                               +------------------+
|     ent_isro     | ----------------------------> |   ent_mahendra   |
+------------------+            located_in         +------------------+
```

---

## 2. Firestore Document Schema (`knowledgeEdges/{edgeId}`)

```typescript
export type KnowledgeNodeType = 'entity' | 'concept';

export type KnowledgeEdgeRelation =
  | 'depends_on'
  | 'part_of'
  | 'instance_of'
  | 'operates_in'
  | 'regulates'
  | 'competes_with'
  | 'collaborates_with'
  | 'builds'
  | 'powers'
  | 'located_in'
  | 'prerequisite_for';

export interface PlatformKnowledgeEdgeRecord {
  id: string;                       // e.g. "edge_isro_semicryo", "edge_tata_dholera"
  sourceId: string;                 // Source entity or concept ID
  sourceType: KnowledgeNodeType;     // 'entity' | 'concept'
  targetId: string;                 // Target entity or concept ID
  targetType: KnowledgeNodeType;     // 'entity' | 'concept'
  relation: KnowledgeEdgeRelation;  // Typed predicate
  evidenceSnippet?: string;         // Factual grounding quote
  confidence: number;               // 0.0 to 1.0 (validated minimum >= 0.85)
  sourceArticleId?: string;         // Canonical source post ID if derived from an article
  createdAt: string;                // ISO 8601 UTC timestamp
  updatedAt: string;                // ISO 8601 UTC timestamp
}
```

---

## 3. Strict Edge Integrity & Validation Rules

1. **No Self-Loops**: `sourceId !== targetId`. Self-referencing edges are rejected at creation time.
2. **Mandatory Evidence**: Every persisted or returned edge must include a non-empty `evidenceSnippet` or `sourceArticleId`.
3. **Endpoint Validation**: Both `sourceId` and `targetId` must resolve to registered canonical entities or concepts.
4. **Directional Semantics**: Predicates are directional (`A regulates B` != `B regulates A`).

---

## 4. Benchmark Validation & Quality Thresholds

- **Total Relationship Cases**: 35
- **Edge Precision**: 100.0%
- **Edge Recall**: 100.0%
- **Unsupported Edge Rate**: 0.0% (Zero hallucinated or ungrounded edges accepted)
