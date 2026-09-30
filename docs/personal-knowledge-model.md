# Personal Knowledge Model Specification

> **Platform Reference**: Breakpoint Platform Phase 16E  
> **Firestore Subcollection**: `users/{uid}/knowledge/{conceptId}`  
> **Authoritative Service**: `src/services/userKnowledgeService.ts`  
> **State Reducer**: `src/services/knowledgeStateReducer.ts`  
> **Flutter Model**: `lib/features/knowledge_graph/models/user_knowledge_model.dart`

---

## 1. Overview & Purpose

The **Personal Knowledge Model** tracks an individual user's interaction-derived familiarity with **Canonical Concepts** (`concepts/{conceptId}`) over time.

Its purpose is to make reading and learning experiences increasingly relevant:
- Providing introductory explanations for newly encountered concepts.
- Skipping repetitive background for concepts the user already understands.
- Suggesting sequential Knowledge Trails that bridge genuine knowledge gaps.

### What the Model Is NOT
- It is NOT an estimate of IQ, intelligence, education level, or intellectual ability.
- It is NOT derived from demographic attributes (age, location, occupation, gender).
- It is NOT a gamified leveling system (no XP, badges, or "Master" titles).

---

## 2. Canonical State Semantics

Each concept state for a user progresses through four explicit stages:

```
[ UNSEEN ] ──(Encountered in Article)──> [ EXPOSED ] ──(Deep Engagement/Trail)──> [ FAMILIAR ] ──(Mastery/Confirmation)──> [ UNDERSTOOD ]
    ▲                                                                                    │                                       │
    └─────────────────────────────[ USER RESET / EXPLAIN BASICS ]────────────────────────┴───────────────────────────────────────┘
```

| State | Semantic Meaning | Explanation Experience |
|---|---|---|
| **`unseen`** | User has no record of interacting with this concept. | **`FOUNDATIONAL`**: Full clear definition with baseline background. |
| **`exposed`** | Concept was encountered centrally in content or an explanation was viewed. Understanding is not yet established. | **`FOUNDATIONAL`**: Introductory context with concise inline helpers. |
| **`familiar`** | Multiple encounters, completed trail steps, or detailed reading indicate basic working comprehension. | **`CONCISE_REFRESHER`**: Rapid 1-sentence refresher; skips elementary background. |
| **`understood`** | Strong cumulative evidence or explicit user confirmation ("I know this"). | **`ASSUME_FAMILIARITY`**: No unprompted explanation; focus directly on news impact. |

> [!NOTE]
> `understood` is never interpreted as permanent or infallible mastery. Users can always click "[ Explain from basics ]" at any time to restore foundational context.

---

## 3. Firestore Document Schema (`users/{uid}/knowledge/{conceptId}`)

```typescript
export type UserKnowledgeState = 'unseen' | 'exposed' | 'familiar' | 'understood';
export type ExplicitUserState = 'know_this' | 'learning' | null;

export interface PlatformUserKnowledgeRecord {
  conceptId: string;              // Matches concepts/{conceptId}
  state: UserKnowledgeState;       // 'unseen' | 'exposed' | 'familiar' | 'understood'
  confidence: number;              // 0.0 to 1.0 (Model confidence in this estimate)
  evidenceCount: number;           // Total qualifying interaction signals
  firstSeenAt?: string;            // ISO 8601 UTC timestamp of first encounter
  lastInteractedAt?: string;       // ISO 8601 UTC timestamp of most recent interaction
  lastReinforcedAt?: string;       // ISO 8601 UTC timestamp when understanding was reinforced
  explicitUserState?: ExplicitUserState; // User explicit preference
  evidenceSummary?: {
    articlesCompleted?: number;    // Articles completed containing concept
    explanationsOpened?: number;   // Modal/panel explanations opened
    trailsCompleted?: number;      // Completed Knowledge Trails containing concept
    explicitSignals?: number;      // Explicit user feedback events
  };
  updatedAt: string;               // ISO 8601 UTC timestamp
}
```

---

## 4. Confidence & Staleness Semantics

- **Confidence Score ($0.0 - 1.0$)**: Represents the model's statistical confidence that the assigned state reflects reality—**never displayed to the user**.
- **Lightweight Staleness**: If `lastReinforcedAt` is older than 90 days, personalization services may softly offer an optional refresher without abruptly demoting the state.

---

## 5. User Control & Deletion

Users have full authority over their knowledge state:
1. **Explicit "I know this"**: Sets `explicitUserState = 'know_this'`, `state = 'understood'`, `confidence = 0.95`.
2. **Explicit "Explain from basics"**: Sets `explicitUserState = 'learning'`, `state = 'familiar'` or `'exposed'`, restoring foundational explanations.
3. **Reset Topic**: Deletes `users/{uid}/knowledge/{conceptId}` returning the concept to `unseen`.
4. **Reset All Knowledge**: Deletes all documents in `users/{uid}/knowledge/`.
