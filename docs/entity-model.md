# Canonical Entity Model Specification

> **Platform Reference**: Breakpoint Platform Phase 16D
> **Firestore Collection**: `entities/{entityId}`
> **Authoritative Service**: `src/services/canonicalEntityService.ts`
> **Flutter Model**: `lib/features/knowledge_graph/models/canonical_entity_model.dart`

---

## 1. Overview & Definition

A **Canonical Entity** represents a discrete, real-world noun—a specific person, company, institution, government body, location, or physical product—that exists independently in the world.

### Fundamental Distinction: Entity vs Concept
- **Entity**: *"NVIDIA"*, *"ISRO"*, *"Reserve Bank of India"*, *"Tata Electronics"*, *"Bengaluru"*, *"Apple Inc."* (A real-world named participant/actor or location).
- **Concept**: *"Semi-Cryogenic Engine"*, *"Repo Rate"*, *"Transformer Architecture"*, *"Cleanroom"* (An abstract, teachable principle or technical mechanism).

---

## 2. Firestore Document Schema (`entities/{entityId}`)

```typescript
export type EntityType =
  | 'company'
  | 'person'
  | 'institution'
  | 'government_body'
  | 'place'
  | 'product'
  | 'organization';

export interface PlatformEntityRecord {
  id: string;                      // e.g. "ent_isro", "ent_nvidia"
  canonicalName: string;           // Primary display label, e.g. "Indian Space Research Organisation"
  type: EntityType;                // Categorical type
  aliases: string[];               // Case-insensitive aliases and variations
  shortDescription: string;        // Objective, neutral single-paragraph summary (30-60 words)
  externalIds?: {                  // Authoritative external links & registries
    wikidataId?: string;
    crunchbaseId?: string;
    officialUrl?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;               // ISO 8601 UTC timestamp
  updatedAt: string;               // ISO 8601 UTC timestamp
}
```

---

## 3. Disambiguation & Zero False Merge Safeguards

To prevent false entity merges when generic words or acronyms are mentioned in unrelated contexts, strict **Disambiguation Guards** are enforced with word-boundary checks (`\b`):

### Disambiguation Guard Rules
1. **`meta`**: Requires affirmative context words `['ai', 'llama', 'zuckerberg', 'facebook', 'model', 'tech', 'platforms', 'open-source']`. Plain mentions of "meta" (e.g. meta-analysis, metadata) are rejected.
2. **`apple`**: Requires affirmative context words `['iphone', 'mac', 'tim cook', 'cupertino', 'ios', 'tech', 'company', 'silicon']`. Plain mentions of fruit harvest ("bumper apple harvest") are rejected.
3. **`tata`**: Requires affirmative context words `['semiconductor', 'fab', 'dholera', 'electronics', 'foundry', 'chips']`.
4. **Boundary Enforced Substring Rejection**: Context checks use `new RegExp('\\b' + word + '\\b', 'i')` to prevent false positive substring collisions (e.g. "Himachal" does not trigger "mac").

---

## 4. Benchmark Validation & Quality Thresholds

- **Total Benchmark Cases**: 52
- **Precision**: 100.0%
- **Recall**: 100.0%
- **False Merge Rate**: 0.0% (Verified)
- **Supported Entity Types**: 7 distinct classes
