# Breakpoint Structured Story Updates & "Since You Last Read"

## 1. Overview & Purpose
While the Story Timeline presents the macro chronology of events, **Story Updates** capture granular factual deltas between successive articles in an evolving story.

When a reader returns to an evolving story they opened days or weeks ago, Breakpoint answers:
> *"What changed in this story since I last read it?"*

### Canonical Firestore Path:
```
stories/{storyId}/updates/{updateId}
```

---

## 2. Data Schema (`PlatformStoryUpdateRecord` & `PlatformStoryChange`)

### Update Document Schema:
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique update ID (e.g. `upd_st_fuel_cycle_gcc_art_fc_02`). |
| `storyId` | `string` | Yes | Parent story thread document ID. |
| `sourceArticleId` | `string` | Yes | The incoming article introducing this update. |
| `emittedAt` | `Timestamp` | Yes | Timestamp of when this delta was generated or published. |
| `summary` | `string` | Yes | 1-2 sentence high-level summary of what changed. |
| `changes` | `PlatformStoryChange[]` | Yes | List of structured, itemized factual shifts. |
| `createdAt` | `Timestamp` | Yes | Creation timestamp. |

### Factual Change Schema (`PlatformStoryChange`):
| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `StoryChangeType` | Yes | `'value_changed' \| 'new_fact' \| 'location_changed' \| 'status_changed' \| 'date_changed' \| 'metric_updated' \| 'entity_added'`. |
| `subject` | `string` | Yes | Fact label or subject (e.g. `"Planned Workforce"`, `"Primary Facility Location"`). |
| `description` | `string` | Yes | Human-readable explanation (e.g. `"Planned workforce increased from 50 to 120 employees."`). |
| `previousValue`| `any` | No | Previous recorded value if applicable. |
| `newValue` | `any` | Yes | New recorded value. |
| `sourceArticleId`| `string` | Yes | Source article ID. |

---

## 3. Structured Fact Extraction Taxonomy
Articles are parsed for 6 categories of structured facts (`StructuredFact`):
1. **Metrics**: Key financial, capacity, scale, and performance figures (`key_stats` or regex `₹\d+ Cr`, `\d+ engineers`, `\d+ km range`).
2. **Locations**: Cities and facilities mentioned in connection with operations (`Navi Mumbai`, `Hyderabad`, `Bengaluru`, `Pune`, `Hosur`, `Dholera`).
3. **Status**: Operational lifecycle states (`Announced`, `Under Construction`, `Testing`, `Expanding`, `Launched`, `Delivering`).
4. **Dates**: Key future or historic target dates (`"by November 2026"`, `"Q3 2027"`).
5. **Products**: Primary model names, platforms, or systems (`"Konarc"`, `"FEMTO"`, `"Semi-Cryogenic PHTA"`).
6. **Entities**: Involved corporate partners, agencies, or investors.

---

## 4. "Since You Last Read" Derivation Pipeline

### Step 1: Query User Reading State
```
users/{uid}/readingState/{articleId}
```
Fetches `lastReadAt` timestamp for all articles previously read by the user in this story.

### Step 2: Query Story Updates
```
stories/{storyId}/updates where emittedAt > latestUserLastReadAt
```
Fetches all updates recorded after the user's latest interaction with any article in that story thread.

### Step 3: Summarize & Surface
If updates exist:
- Desktop UI renders `<SinceYouLastReadBanner>` prominently above the article body.
- Displays relative time reference: *"Since you last read on Wednesday, 2 material updates occurred:"*
- Itemizes the factual shifts with previous $\rightarrow$ new value indicators.
- Allows the user to jump directly to the relevant section or source article.

---

## 5. Security & Access Rules
```
match /stories/{storyId} {
  allow read: if true;
  allow write: if false;

  match /updates/{updateId} {
    allow read: if true;
    allow write: if false;
  }
}
```
All users have read access to story updates. Writing is restricted to authorized platform backfill scripts and background workers.
