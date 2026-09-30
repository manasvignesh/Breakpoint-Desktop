# Breakpoint Brief Progress & Caught-Up Protocol

> **Document Version**: 1.5 (Phase 16F.5: Reading State Isolation & Handled Union Semantics)  
> **Status**: Authoritative Architectural Standard  
> **Date**: September 2026

---

## 1. Overview

The Daily Brief Progress tracking system provides cross-device, real-time synchronization of brief item consumption and ensures a definitive, calm completion state ("Caught Up").

---

## 2. Synchronization Subcollection

Document path: `users/{userId}/briefProgress/{briefId}`

```typescript
interface DailyBriefProgress {
  briefId: string;              // e.g. "2026-09-30-morning"
  userId: string;
  activeIndex: number;          // 0-indexed current position
  completedItemIds: string[];   // IDs of finished items
  skippedItemIds: string[];     // IDs of explicitly skipped items
  isCaughtUp: boolean;          // true when (completedItemIds ∪ skippedItemIds).length >= totalCount
  caughtUpAt?: string;          // ISO timestamp when caught up
  timeSpentSeconds: number;     // Aggregate seconds spent in brief reader
  lastUpdatedAt: string;
}
```

---

## 3. Strict Reading State Isolation

Brief progress tracks item consumption **specifically for the Daily Brief** and must NEVER corrupt the user's primary `readingState`:
1. When an item is completed or skipped in the Daily Brief viewer, ONLY `users/{userId}/briefProgress/{briefId}` is modified.
2. Brief item completion **does NOT** write `readingState.progress = 1.0` or call `updateReadingProgress`. An article's `readingState` remains unchanged until the user explicitly opens and reads the full article.
3. Handled items are defined as the union: $\text{Handled} = \text{completedItemIds} \cup \text{skippedItemIds}$.
4. When $\lvert \text{Handled} \rvert \ge \text{totalItemsCount}$, `isCaughtUp` is marked `true` and `caughtUpAt` is recorded.
5. The `resolveNextUnresolvedIndex(brief, progress)` function determines the active item by resolving the first item in the brief whose ID is not present in either `completedItemIds` or `skippedItemIds`.

---

## 4. Calm Endpoint Protocol

When `isCaughtUp` is true:
- The UI immediately transitions to the **"YOU'RE CAUGHT UP"** peaceful completion screen.
- Shows total items read, time invested, and confirmation that no breaking updates require attention.
- Desktop and Mobile never render infinite algorithmic recommendations below this endpoint.
