# Breakpoint Daily Brief Architecture

> **Document Version**: 1.5 (Phase 16F.5: Trusted Backend Generation & Semantic Precision)  
> **Status**: Authoritative Architectural Standard  
> **Date**: September 2026

---

## 1. Overview & Philosophy

The Breakpoint **Daily Brief** answers the core question:
> **"What should I understand today?"**

Unlike algorithmic infinite feeds engineered for time-on-app and doomscrolling, Breakpoint's Daily Brief is designed as a **finite, calm, and trustworthy digest**.

### Key Principles:
1. **Trusted Backend Generation**: Canonical briefs are generated strictly on the server (Supabase Edge Function `generate-daily-brief`) using verified Firebase ID tokens and written via Admin SDK. Clients have read-only access to `users/{uid}/briefs/{briefId}`.
2. **Finite Digest**: Target of **5 to 8 high-impact items** totaling ~5 to 10 minutes of reading time. Governed by a quality threshold (0.35); if fewer items clear it, only qualified items are included.
3. **Definitive Stopping Point**: Reaching the end of the brief displays a peaceful **"YOU'RE CAUGHT UP"** confirmation screen. No infinite scroll recommendations exist below it. Handled items = `completedItemIds ∪ skippedItemIds`. Caught up when `handledCount >= totalItems`.
4. **Strict Deduplication**: Exactly **1 item per story thread** regardless of how many individual articles were published.
5. **Suppression of Consumed Stories**: Unchanged stories that the user has already read (`progress >= 0.90`) are strictly suppressed.
6. **Continuing Story Deltas**: Stories with material updates after the user's latest interaction timestamp are highlighted with explicit factual changes ("Since You Last Read").
7. **Reading State Isolation**: Brief progress tracks digest completion only and never corrupts full article `readingState.progress`.
8. **Separation of Interest & Knowledge**:
   - **Interest** (topics, entities, followed sources) determines *what* appears in the brief.
   - **Knowledge** (concept familiarity states) determines *how deep* background explanations are. Facts are never altered or personalized.

---

## 2. Document Schema & Hierarchy

```
users/{userId}/
  ├── briefs/{briefId}               # Daily brief document (e.g. 2026-09-30-morning) [CLIENT READ ONLY]
  │     ├── briefId: string
  │     ├── userId: string
  │     ├── edition: "morning" | "evening"
  │     ├── date: "YYYY-MM-DD"
  │     ├── createdAt: ISO string
  │     ├── estimatedMinutes: number
  │     ├── itemsCount: number
  │     ├── isCompleted: boolean
  │     └── items: DailyBriefItem[]
  │
  └── briefProgress/{briefId}        # Real-time progress synchronization [CLIENT OWNER READ/WRITE]
        ├── briefId: string
        ├── userId: string
        ├── activeIndex: number
        ├── completedItemIds: string[]
        ├── skippedItemIds: string[]
        ├── isCaughtUp: boolean
        ├── caughtUpAt: ISO string | null
        ├── timeSpentSeconds: number
        └── lastUpdatedAt: ISO string
```

---

## 3. Daily Brief Item Types & Reason Codes

### Item Types:
- `story`: A developing or established multi-article news story thread.
- `story_update`: A continuing story with new factual changes since the user last read.
- `article`: A high-importance standalone news report.
- `trail`: A curated 3–6 step knowledge pathway bridging relevant concepts.
- `knowledge`: A contextual concept explainer.

### Reason Codes:
- `important`: Top canonical editorial development today.
- `followed`: Directly matches an entity or topic explicitly followed by the user.
- `continuing`: New developments in an evolving story the user was previously reading.
- `interest`: Matches user's preferred categories and general reading history.
- `knowledge_gap`: Recommended concept pathway based on `unseen` or `exposed` concepts.
- `outside_bubble`: High-importance development outside the user's primary topics to ensure intellectual diversity.

---

## 4. Cross-Device Synchronization

Both Breakpoint Desktop (React/Tauri) and Breakpoint Mobile (Flutter) consume the exact same Firestore collections:
- `users/{uid}/briefs/{briefId}`
- `users/{uid}/briefProgress/{briefId}`

When a user reads an item on Desktop, `completedItemIds` is immediately updated in Firestore, syncing to Mobile in real-time. When all items are completed on either device, `isCaughtUp` is marked true on both platforms.
