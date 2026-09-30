# Breakpoint Personal Knowledge & Understanding Audit

> **Document Version**: 1.0 (Phase 16E)  
> **Status**: Authoritative Architectural Audit  
> **Date**: September 2026

---

## 1. Executive Summary

As Breakpoint introduces the **Personal Knowledge Model**, this audit examines all existing subsystems across Desktop, Flutter, MEDHA, Firestore, Studio, and analytics to verify how user learning progress, topic familiarity, explanation history, and reading interactions are currently handled.

### Primary Audit Findings:
1. **Zero Demographic/IQ Systems Exist**: No previous subsystem attempted to infer user intelligence, competence, IQ, education level, or demographic expertise.
2. **Clear Separation of Concerns**: `readingState` tracks *what was opened/read/listened to*; `knowledgeState` tracks *interaction-derived familiarity with canonical concepts*.
3. **No Duplicate Knowledge Stores**: Prior phases (16A–16D) established `readingState` and canonical `concepts/` / `knowledgeTrails/`, but left user concept familiarity strictly unpopulated until Phase 16E.

---

## 2. Audit Findings by Subsystem

### 2.1 Desktop Client (`src/`)
- **`src/services/readingStateService.ts`**:
  - Manages `users/{userId}/readingState/{articleId}`.
  - Stores: `scrollDepth`, `completionRatio`, `isCompleted`, `lastReadAt`, `audioPositionSeconds`, `audioCompleted`.
  - *Finding*: High reading completion (e.g. 90%) indicates attention to an article, but does NOT automatically equate to mastery of every attached technical concept.
- **`src/services/canonicalConceptService.ts` & `src/services/knowledgeTrailService.ts`**:
  - Provides public/read-only canonical definitions and 3–6 step learning pathways.
  - *Finding*: No user-specific trail step progress or concept familiarity was tracked.

### 2.2 Flutter Mobile App (`C:\Users\Public\New67\app`)
- **`features/reading_state/`**:
  - Implements `FirebaseReadingStateRepository` reading/writing `users/{uid}/readingState/{articleId}`.
- **`features/knowledge_graph/`**:
  - Implements canonical models (`CanonicalEntityModel`, `CanonicalConceptModel`, `KnowledgeEdgeModel`, `KnowledgeTrailModel`).
  - *Finding*: Mobile client is completely ready to receive shared `UserKnowledgeModel` and `TrailProgressModel` without architectural conflicts.

### 2.3 MEDHA Assistant (`supabase/functions/medha-chat`)
- **Current State**:
  - Takes `selectedText`, `articleText`, and question.
  - Answers questions using Gemini LLM without awareness of whether the user is encountering a concept for the 1st time or the 10th time.
- **Opportunity**:
  - Provide a compact, non-invasive knowledge summary (`{ conceptId: state }`) for concepts relevant to the current article, enabling Medha to skip introductory definitions when the user is already familiar.

### 2.4 Cie-Daily-Studio Publishing Platform (`Cie-Daily-Studio`)
- **`src/lib/article-contract.ts`**:
  - Authors create structured Schema v2 content.
  - *Finding*: Studio does not interact with user personal knowledge states. Personalization occurs strictly on the consumption layer (Desktop/Mobile/Assistant).

---

## 3. Principles for Personal Knowledge Modeling

1. **Not Intelligence, Smartness, or IQ**: The model estimates interaction-based concept familiarity, NOT user capability or intelligence.
2. **Direct Interaction Evidence Only**: No demographic or inferred attributes (age, geography, job title, gender).
3. **Weak vs Strong Signals**:
   - Article open: Weak evidence (never causes familiarity on its own).
   - Asking for an explanation: Curiosity / help-seeking (NOT evidence of understanding).
   - Trail step / completion: Strong structured evidence.
   - Explicit "I know this": High-confidence user override.
4. **Private & Owner-Only**: Stored in `users/{uid}/knowledge/{conceptId}` and `users/{uid}/trailProgress/{trailId}`.
