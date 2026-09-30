# Knowledge Trail Progress Specification

> **Platform Reference**: Breakpoint Platform Phase 16E  
> **Firestore Subcollection**: `users/{uid}/trailProgress/{trailId}`  
> **Flutter Model**: `lib/features/knowledge_graph/models/trail_progress_model.dart`  
> **Desktop Component**: `src/components/KnowledgeTrailViewer.tsx`

---

## 1. Overview & Cross-Device Resumption

Knowledge Trails are sequential learning pathways (3 to 6 steps). To provide continuity between desktop and mobile reading sessions, the user's current step and completed steps are synced in real time to Firestore.

### Workflow Example:
1. **Desktop**: User starts *Space Propulsion* trail and completes Step 1 (*Thrust*) and Step 2 (*Rocket Propulsion*).
2. **Cloud Sync**: `users/{uid}/trailProgress/trail_space_propulsion` is updated (`currentStep = 3`, `completedStepIds = ['con_thrust', 'con_rocket_propulsion']`).
3. **Mobile**: User opens the app on Android. The trail viewer displays *"Resume Step 3: Cryogenic Rocket Engine"*.
4. **Mobile**: User finishes Step 3, 4, and 5.
5. **Completion**: Trail is marked `completedAt: timestamp`, and completion signals are emitted to the Personal Knowledge Model.

---

## 2. Firestore Document Schema (`users/{uid}/trailProgress/{trailId}`)

```typescript
export interface PlatformUserTrailProgressRecord {
  trailId: string;                // Canonical trail ID (matches knowledgeTrails/{trailId})
  currentStep: number;            // 1-indexed step number currently active
  completedStepIds: string[];     // Array of canonical concept IDs completed in this trail
  startedAt: string;              // ISO 8601 UTC timestamp
  lastInteractedAt: string;       // ISO 8601 UTC timestamp
  completedAt?: string | null;    // ISO 8601 UTC timestamp when trail was finished
  updatedAt: string;              // ISO 8601 UTC timestamp
}
```

---

## 3. Trail Step & Completion Rules

1. **Step Continuity**: Steps are strictly 1-indexed up to `trail.steps.length`.
2. **No Overwrites**: Progressing to Step $K+1$ appends Step $K$'s `conceptId` to `completedStepIds` without duplicating IDs.
3. **Completion Gate**: `completedAt` is set only when all steps in `trail.steps` have been completed.
4. **Signal Dispatch**: Each step completed dispatches `TRAIL_STEP_COMPLETED(conceptId)`. Finishing the final step dispatches `TRAIL_COMPLETED(trailId)`.
