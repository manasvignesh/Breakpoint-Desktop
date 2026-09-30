# Breakpoint Reading State Architecture & Audit

> **Phase 16A Pre-Implementation Audit**  
> **Audited Workspaces**: Flutter Mobile (`app/`), Web Studio (`Cie-Daily-Studio/`), Supabase Functions (`supabase/functions/`), Firestore Rules (`firestore.rules`)  
> **Target Firebase Project**: `cie-connect`  
> **Date**: 2026-09-29  

---

## 1. Audit Findings Summary

A complete systematic audit was conducted across the Breakpoint platform repositories to determine if any canonical reading history, article opened, progress tracking, audio resume, or completion data models currently exist.

| Repository / Subsystem | Path / File | Findings |
|---|---|---|
| **Flutter Mobile Client** | `app/lib/features/discover/screens/article_detail_screen.dart` | **Local Ephemeral Only**: Maintained widget state `double _readingProgress = 0.0` (lines 41, 136–157) derived from `ScrollNotification.metrics.pixels / maxScrollExtent`. Used purely for rendering an in-memory linear progress indicator (`widthFactor: _readingProgress`) and feeding velocity to `medhaBehaviorControllerProvider`. **Zero disk or cloud persistence.** |
| **Flutter Local Storage** | `app/pubspec.yaml`, `app/lib/` | No SharedPreferences or Hive key-value stores used for storing read post IDs or reading history. |
| **Firestore Production Database** | `cie-connect` (`posts`, `users`, `follows`, `notifications`) | **Zero Reading State Collections**: Only `posts/{id}.bookmarkedBy` (array of UIDs) exists for saved content. No `history`, `reading_state`, `user_progress`, or `read_articles` collections exist. |
| **Firestore Security Rules** | `C:\Users\Public\New67\firestore.rules` | No subcollection rules defined under `users/{userId}` for reading state. |
| **CIE Daily Studio** | `Cie-Daily-Studio/` | Editorial publishing and live space management only. No reader telemetry ingestion or state tracking. |
| **Supabase Edge Functions** | `supabase/functions/` | Functions (`medha-chat`, `publish-content`, `send-message`) operate statelessly regarding reading progress. |

---

## 2. Identified Gap & Architectural Necessity

Currently, when a user:
1. Reads 70% of an in-depth article on Flutter Android and later switches to Desktop, the progress is lost.
2. Listens to 4 minutes of a 10-minute narrated story on Desktop and opens the mobile app, playback starts from 0:00.
3. Opens an article multiple times, there is no cross-device record that the article was previously read or completed.

To solve this without creating conflicting client-specific schemas (e.g., `desktopReadingState` vs `mobileReadingState`) or introducing invasive surveillance, a single canonical cloud subcollection is introduced.

---

## 3. Canonical Model Architecture

### Path
```
users/{userId}/readingState/{articleId}
```

### Key Design Principles
1. **Direct Article Identity Mapping**: `articleId` in the subcollection corresponds 1:1 with Firestore `posts/{articleId}`.
2. **Owner-Only Security**: Read and write access is restricted strictly to `request.auth.uid == userId`.
3. **Milestone-Based Storage**: Only meaningful milestones (open, debounced progress, completion, audio checkpoints, article language) are persisted. No raw scroll coordinates, mouse telemetry, or keystrokes.
4. **Additive & Backward-Compatible**: Absence of a `readingState` document indicates the article has not yet been opened with the new system. Existing mobile and web studio versions continue operating with zero disruptions.

---

## 4. Conflict Resolution Strategy

| Field | Conflict Resolution Rule |
|---|---|
| `firstOpenedAt` | **Immutable Earliest**: Set on initial document creation; never overwritten on subsequent opens. |
| `lastOpenedAt` | **Latest Timestamp**: Overwritten with server timestamp whenever article is actively opened in `StoryDetail`. |
| `progress` | **Monotonic Max**: During active reading, progress increases monotonically: `Math.max(cloudProgress, localProgress)` unless explicitly reset by user. |
| `lastCompletedAt` | **Preserved Upon Attainment**: Recorded when `progress >= 0.90` with meaningful reading interaction; preserved once attained. |
| `lastAudioPositionSeconds` | **Latest Checkpoint**: Updated on audio pause, seek completion, periodic 10-second checkpoints, and player unmount. |
| `preferredLanguage` | **Article-Scoped**: Preserves reader's chosen language for this specific article without altering global account default. |
