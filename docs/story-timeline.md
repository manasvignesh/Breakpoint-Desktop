# Breakpoint Story Timeline Specification

## 1. Overview & Purpose
The **Story Timeline** transforms an evolving real-world narrative (spanning multiple articles, milestones, and developments) into an understandable, structured chronological history.

### Canonical Firestore Path:
```
stories/{storyId}/timeline/{timelineEventId}
```

Every event within a story timeline represents a discrete, verifiable real-world milestone or event with strict date provenance, classification, and source attribution.

---

## 2. Data Schema (`PlatformTimelineEventRecord`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique event ID (e.g. `ev_semicryo_jQ2IssXN`). Deterministic format: `ev_{storyIdSuffix}_{articleIdSuffix}`. |
| `storyId` | `string` | Yes | Parent story thread document ID. |
| `occurredAt` | `Timestamp` | Yes | Resolved point in time when the event occurred. |
| `datePrecision` | `DatePrecision` | Yes | Provenance level: `'exact_day' \| 'month' \| 'publication_fallback' \| 'range' \| 'undated_fallback'`. |
| `title` | `string` | Yes | Concise headline of the milestone (max 120 chars). |
| `summary` | `string` | Yes | 1-2 sentence factual description. |
| `sourceArticleIds`| `string[]` | Yes | Array of Firestore `posts/{postId}` IDs that report or corroborate this event. |
| `sourceUrls` | `string[]` | No | Direct publisher source URLs. |
| `type` | `TimelineEventType`| Yes | Milestone category (`launch`, `financial`, `regulatory`, `announcement`, `development`, `correction`, `update`, `other`). |
| `importance` | `number` | Yes | Integer rating 1-5 (5 = major milestone, 3 = standard update). |
| `supersedesEventId` | `string` | No | Referenced event ID if this event explicitly corrects or updates an earlier event. |
| `correctedByEventId`| `string` | No | Referenced event ID if a subsequent event corrected this event. |
| `createdAt` | `Timestamp` | Yes | Server creation timestamp. |
| `updatedAt` | `Timestamp` | Yes | Server last-updated timestamp. |

---

## 3. Date Resolution & Zero-Hallucination Policy

Timeline event dates are extracted strictly from article text using deterministic regular expressions without generative date hallucination.

### Precision Hierarchy:
1. **`exact_day`**: Explicit day and month found in text (e.g., `"September 27"`, `"27 September"`, `"Aug 30, 2026"`).
2. **`month`**: Month and year found without specific day (e.g., `"in November 2026"`, `"by October"`). Defaults to the 1st of that month in UTC.
3. **`publication_fallback`**: When no explicit temporal anchor exists in text, uses the canonical article `publishedAt` timestamp.
4. **`range`**: Start and end date bounds for multi-day events.
5. **`undated_fallback`**: Absolute fallback if publication date is missing.

---

## 4. Event Deduplication & Merging Engine

When multiple articles report on the exact same milestone (e.g., two publishers reporting on the Ather Konarc scooter launch or Vigyanlabs FEMTO launch):

1. **Temporal Proximity**: `occurredAt` delta $\le 3$ days.
2. **Entity & Title Overlap**: Jaccard / token similarity on titles $\ge 0.35$ OR full text overlap $\ge 0.45$.
3. **Action Predicate / Type Match**: If event types match and title overlap $\ge 0.28$.
4. **Merge Action**:
   - The existing event is preserved.
   - `sourceArticleIds` is merged as a union of IDs.
   - `sourceUrls` is merged.
   - `importance` is updated to $\max(\text{existing}, \text{new})$.
   - Prevents duplicate timeline cards while maintaining full source provenance.

---

## 5. Corrections & Retractions
When an article is classified as a `correction` (e.g. revisions, clarification, retraction):
1. The engine scans previous timeline events in the story for highest token overlap ($>0.40$).
2. The earlier event's `correctedByEventId` is set to the new event ID.
3. The new event's `supersedesEventId` is set to the target event ID.
4. The client UI renders a linked badge connecting the correction to the original event.

---

## 6. Firestore Security & Access Rules
```
match /stories/{storyId} {
  allow read: if true;
  allow write: if false;

  match /timeline/{timelineEventId} {
    allow read: if true;
    allow write: if false;
  }
}
```
All users (including unauthenticated guests) have read access to story timelines. Writes are restricted to backend service workers and administrative backfill scripts.
