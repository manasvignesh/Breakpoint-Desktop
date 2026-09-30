# Breakpoint Reader — Feature Parity Audit & Matrix (Phase 16F.7)

## 1. Executive Summary
This document establishes the comprehensive feature parity comparison between the canonical Flutter mobile application (`C:\Users\Public\New67\app`) and the Breakpoint Desktop application (`C:\Users\Public\Desktop app news`).

Every capability is classified into **REQUIRED DESKTOP**, **OPTIONAL DESKTOP**, or **MOBILE-ONLY**, with implementation status and remediation actions.

---

## 2. Feature Parity Matrix

| Feature / Domain | Mobile (Flutter) | Desktop (React + Tauri) | Classification | Status | Desktop Appropriateness & Remediation Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & SSO** | Firebase Auth (Email/Pass, Google, Apple) | Firebase Auth (`AuthContext`, `AuthModal`, single login) | REQUIRED DESKTOP | **PASS** | Parity achieved. Unified SSO supporting Readers and Admins. |
| **Discover Feed** | Multi-category feed, filter chips, live stream | Discover Feed with categories, real-time Firestore sync | REQUIRED DESKTOP | **PASS** | Full parity. |
| **Today's Drops** | Curated daily stories with urgency badges | Today's Drops filter & dedicated navigation | REQUIRED DESKTOP | **PASS** | Full parity. |
| **Daily Brief** | Finite carousel/drawer with progress tracking | Dedicated primary destination + Modal viewer | REQUIRED DESKTOP | **PASS** | Made primary navigation destination; handles caught-up, generating, and error states gracefully. |
| **Chat / Messaging** | Two-way direct messaging, optimistic bubbles, push notifications | Desktop 2-pane messaging layout (`ChatView`, `chatService`) | REQUIRED DESKTOP | **PASS** | Ported canonical backend (`conversations`, `messages`, `send-message` Edge function), optimistic UI, unread counts. |
| **Search** | Global search across stories, articles, entities | Dedicated Search destination (`SearchView`) | REQUIRED DESKTOP | **PASS** | Upgraded from local filter to full multi-index search across Articles, Stories, Entities, and Concepts. |
| **Personal Library** | Bookmarks & saved items with offline sync | Saved stories view (`LibraryView`) with optimistic toggle | REQUIRED DESKTOP | **PASS** | Full parity. |
| **Reading State & Continuity** | `SinceYouLastRead`, reading percentage, delta highlights | `readingStateService`, `storyDeltaEngine`, Continue Reading | REQUIRED DESKTOP | **PASS** | Fixed Continue Reading logic to prioritize unread deltas and partially-read articles. |
| **Audio Narration** | Multi-language TTS audio player with scrubber | Integrated `AudioPlayer` supporting EN, HI, TE | REQUIRED DESKTOP | **PASS** | Enhanced status distinction (pending, processing, ready, failed). |
| **Multilingual Localization** | EN, HI, TE with live content swapping | Real-time localization in EN, HI, TE (`LanguageSelector`) | REQUIRED DESKTOP | **PASS** | Full parity. |
| **Notifications** | In-app snackbars, notification center, route push | `NotificationsPopover` with typed destination routing | REQUIRED DESKTOP | **PASS** | Fixed chat vs article vs knowledge routing, improved layout, mark all read batch. |
| **Story Timeline & Deltas** | Chronological timeline updates & semantic diffs | `StoryTimelinePanel`, `StoryDetail` timeline tab | REQUIRED DESKTOP | **PASS** | Full parity. |
| **Entity & Concept Graph** | Concept pill inspection, graph relation view | `StoryConceptsPanel`, `ConceptDetailModal`, graph links | REQUIRED DESKTOP | **PASS** | Full parity. |
| **Knowledge Trails** | Multi-step interactive learning trails with progress | Dedicated `KnowledgeView` & `KnowledgeTrailViewer` | REQUIRED DESKTOP | **PASS** | Exposed as top-level navigation destination with active trail continuation. |
| **MEDHA AI Assistant** | Grounded contextual companion chat (`medha-chat`) | Resilient `MedhaContextPanel` with token refresh & retry | REQUIRED DESKTOP | **PASS** | Fixed "Failed to fetch" via CORS preflight on `medha-chat` and added graceful error UX. |
| **Sources & Deep-Links** | External web intent & deep-linking | `openExternal` utility (browser opener) & query deep-links | REQUIRED DESKTOP | **PASS** | Full parity. |
| **Follow System** | Follow creators/topics | `followService` & Firestore user follows | OPTIONAL DESKTOP | **PASS** | Integrated into article headers and profile. |
| **Admin Workspace** | Separate admin screens | Direct `BreakpointAdmin` workspace (`/admin`) | REQUIRED DESKTOP | **PASS** | Complete Studio capabilities integrated natively. |
| **NFC Connect** | NFC hardware badge tap for student meetup | N/A (Hardware specific) | MOBILE-ONLY | **EXCLUDED** | Hardware-specific to mobile devices. |
| **Nearby BLE Radar** | Bluetooth Low Energy proximity beacon scanning | N/A (Hardware specific) | MOBILE-ONLY | **EXCLUDED** | Hardware-specific to mobile devices. |
| **Interactive Puzzles** | Touch-based mini crossword / daily quiz game | N/A (Mobile casual feature) | OPTIONAL DESKTOP | **DEFERRED** | Non-essential for desktop intelligence workflow. |

---

## 3. Desktop Navigation Hierarchy
- **TODAY**
  - Daily Brief (`/app/brief`)
  - Discover (`/app/discover`)
  - Today's Drops (`/app/drops`)
- **PERSONAL**
  - Search (`/app/search`)
  - Library (`/app/saved`)
  - Chat (`/app/chat`)
- **UNDERSTAND**
  - Knowledge & Trails (`/app/knowledge`)
- **SYSTEM / ADMIN**
  - Breakpoint Admin (`/admin` - Visible only to authorized Admin/Editor accounts)
