# Breakpoint Personalization & Reading Data Policy

> **Phase 16A Privacy & Data Governance Specification**  
> **Target Subcollection**: `users/{userId}/readingState/{articleId}`  
> **Security Posture**: Strict Owner-Only Access (`request.auth.uid == userId`)  

---

## 1. What Data Is Stored

Reading state exists exclusively to provide a seamless, non-intrusive cross-device experience (reading on Android, continuing on Desktop; listening on Desktop, resuming on mobile; knowing a story was already completed).

The stored data is strictly limited to the following minimal milestones:

| Field Name | Type | Purpose |
|---|---|---|
| `articleId` | `string` | Canonical identifier matching Firestore `posts/{articleId}`. |
| `firstOpenedAt` | `Timestamp` | Initial timestamp when reader first opened the story deep-dive. |
| `lastOpenedAt` | `Timestamp` | Latest timestamp when reader opened the story. |
| `progress` | `number` | Normalized reading progress from `0.0` to `1.0`. |
| `lastCompletedAt` | `Timestamp?` | Timestamp recorded when progress reaches `0.90` (90%+ read). |
| `preferredLanguage` | `'en' \| 'hi' \| 'te'` | Article-specific language choice (preserves per-story preference without altering account global language). |
| `lastAudioPositionSeconds` | `number?` | Playback position checkpoint for audio resume (e.g. `128` seconds). |
| `audioDurationSeconds` | `number?` | Total audio track length in seconds. |
| `lastInteractionMode` | `'reading' \| 'audio' \| 'brief'` | Primary mode used during the last interaction. |
| `updatedAt` | `Timestamp` | Timestamp of the last state sync. |

---

## 2. Why This Data Is Stored

1. **Cross-Device Continuity**: Enables readers to switch seamlessly between desktop and mobile without losing their spot in long-form investigative pieces.
2. **Audio Checkpointing**: Allows readers listening to high-fidelity audio tracks to pause and resume accurately without scrubbing manually.
3. **Preventing Repetition**: Allows the platform to identify which stories have already been read or completed, avoiding duplicate recommendations.
4. **Offline Resilience**: Enables local offline caching while maintaining conflict-free convergence when connectivity is restored.

---

## 3. What Is NOT Stored (Strict Non-Surveillance Policy)

To protect user privacy and minimize data collection, Breakpoint explicitly **DOES NOT** collect or store:

- ❌ **No raw scroll coordinates or scroll velocity telemetry.**
- ❌ **No continuous heartbeat tracking.**
- ❌ **No mouse hover, mouse movement, or cursor coordinates.**
- ❌ **No keystrokes or input dwell times.**
- ❌ **No selection history by default** (selected text is sent ephemerally to MEDHA AI only upon explicit user button click).
- ❌ **No background microphone or device sensor telemetry.**

---

## 4. Write Throttling & Network Efficiency

To prevent wasteful database operations and battery/network drain, reading progress is throttled and debounced:
- Progress is updated in local state instantly.
- Cloud synchronization is triggered **only upon crossing 10% milestone deltas** (e.g. 25%, 50%, 75%, 90%+) or after an inactivity debounce delay of 2,500ms.
- A typical 60-second reading session with continuous scrolling generates fewer than **10 total Firestore writes**.

---

---

## 6. Personal Knowledge Model Data Policy (Phase 16E)

> **Target Subcollections**: `users/{userId}/knowledge/{conceptId}` and `users/{userId}/trailProgress/{trailId}`  
> **Security Posture**: Strict Owner-Only Access (`request.auth.uid == userId`)

### 6.1 What Data Is Stored
| Field Name | Type | Purpose |
|---|---|---|
| `conceptId` | `string` | Canonical concept identifier matching `concepts/{conceptId}`. |
| `state` | `string` | Interaction-derived familiarity state (`'unseen' \| 'exposed' \| 'familiar' \| 'understood'`). |
| `confidence` | `number` | Internal model confidence in estimate (`0.0` to `1.0`). Never displayed to the user. |
| `evidenceCount` | `number` | Total number of qualifying interaction signals. |
| `firstSeenAt` / `lastInteractedAt` / `lastReinforcedAt` | `string` | ISO 8601 UTC timestamps of interactions. |
| `explicitUserState` | `'know_this' \| 'learning' \| null` | Direct user feedback override. |
| `evidenceSummary` | `object` | Aggregate counts: `{ articlesCompleted, explanationsOpened, trailsCompleted, explicitSignals }`. |
| `trailProgress` | `object` | Sequential learning pathway tracking: `{ trailId, currentStep, completedStepIds, startedAt, lastInteractedAt, completedAt }`. |

### 6.2 Why This Data Is Stored
1. **Reduce Repetitive Background**: Skips elementary definitions for concepts the reader already understands.
2. **Contextual Clarity**: Delivers tailored introductory explanations when a concept is newly encountered.
3. **Knowledge Trail Resumption**: Seamlessly synchronizes multi-step learning pathways between desktop and mobile.
4. **Targeted Knowledge Gap Bridging**: Recommends learning pathways that address genuine prerequisite gaps rather than repeating known topics.

### 6.3 What Is Explicitly NOT Stored (Non-Profiling Commitment)
- ❌ **No Intelligence or IQ scores** (no "smartness", "ability", or "competence" ratings).
- ❌ **No Inferred Education Level or Background** (no assumptions based on school, degree, or credentials).
- ❌ **No Demographic-Derived Expertise** (zero inferences from age, gender, geography, or job title).
- ❌ **No Full Chat or Private Question Transcripts** in knowledge documents.
- ❌ **No Gamified XP or Competitive Leaderboards**.

---

## 7. User Data Rights, Overrides & Erasure

Users retain absolute sovereignty over their reading state and personal knowledge:
1. **Explicit Topic Control**: Users can click `[ I know this ]` or `[ Explain from basics ]` at any time to instantly override any algorithmic state.
2. **Topic Reset**: Users can reset familiarity for any specific concept back to `unseen`.
3. **Full Knowledge Erasure**: Users can purge their entire `users/{uid}/knowledge/` and `users/{uid}/trailProgress/` subcollections without affecting their account or bookmarked articles.
4. **Account Deletion**: Deleting the user document cascades to purge all subcollections (`readingState`, `knowledge`, `trailProgress`) permanently.
