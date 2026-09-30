# Breakpoint Desktop — Local Release Notes & Packaging Guide

> **Product**: Breakpoint Desktop  
> **Brand**: Breakpoint by Manas  
> **Version**: 0.1.0  
> **Target OS**: Windows 10 / Windows 11 (x64)  
> **Framework**: Tauri 2 (Rust + React 19 + TypeScript + Vite 6)  
> **Packaging Date**: 2026-09-29  

---

## 1. Release Artifacts

| Artifact Type | File Path | Size | Description |
|---|---|---|---|
| **NSIS Windows Installer** | C:\Users\Public\Desktop app news\src-tauri\target\release\bundle\nsis\Breakpoint_0.1.0_x64-setup.exe | 2.07 MiB | Standard Windows Setup executable with Start Menu shortcut and uninstaller. |
| **Raw Release Executable** | C:\Users\Public\Desktop app news\src-tauri\target\release\Breakpoint.exe | ~8.85 MiB | Standalone executable binary compiled with MSVC x86_64 target. |
| **Installed Binary** | C:\Users\Manas\AppData\Local\Breakpoint\Breakpoint.exe | ~8.85 MiB | Default installation location for current user mode. |
| **Uninstaller** | C:\Users\Manas\AppData\Local\Breakpoint\uninstall.exe | ~86.9 KiB | Clean uninstaller removing binary and shortcuts. |

---

## 2. Installation & Launch Instructions

### Standard Installation
1. Double-click Breakpoint_0.1.0_x64-setup.exe.
2. The installer sets up Breakpoint in %LOCALAPPDATA%\Breakpoint\ and creates a Start Menu entry:
   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Breakpoint.lnk.
3. Launch Breakpoint from the Start Menu or directly from the installation folder.

### Silent / Automated Installation
`powershell
& "C:\Users\Public\Desktop app news\src-tauri\target\release\bundle\nsis\Breakpoint_0.1.0_x64-setup.exe" /S /D=C:\Users\Manas\AppData\Local\Breakpoint
`

### Windows SmartScreen Notice
> [!NOTE]
> This is an unsigned local development build (0.1.0). Windows SmartScreen may present a standard informational prompt:
> - Click **More info**
> - Click **Run anyway**
> No bypass or certificate injection is required for personal testing.

---

## 3. Build Commands

`ash
# 1. Standard Web Development
npm run dev

# 2. Production Web Build
npm run build

# 3. Tauri Desktop Development Mode (Hot Reloading)
npm run tauri dev

# 4. Tauri Desktop Release Build (Generates EXE and NSIS Setup)
npm run tauri build
`

---

## 4. Backend & Runtime Configuration

Breakpoint Desktop runs natively on Windows using Microsoft Edge WebView2, connecting directly to the authoritative Breakpoint production cloud:

- **Identity & Auth**: Firebase Authentication (cie-connect). Preserves canonical user UID across sessions.
- **Content & State**: Cloud Firestore (cie-connect) for articles (posts), reading state (users/{uid}/readingState), personal knowledge (users/{uid}/knowledge), and trails (users/{uid}/trailProgress).
- **Narration Audio**: Supabase Storage (uvquwhphuheqgfdmtbh.supabase.co/storage/v1/object/public/article-audio/).
- **AI Intelligence**: Supabase Edge Function medha-chat (Socratic reading tutor).
- **Localization**: Pre-translated Hindi (hi) and Telugu (	e) tracks in Firestore.

---

## 5. Security & Privacy Audit

- **Zero Secret Leaks**: Verified via AST bundle inspection. The release bundle contains **0** private keys, **0** service-role tokens, and **0** test passwords.
- **Vite Public Env Only**: Only client-safe VITE_FIREBASE_* configuration is bundled into dist/.
- **Least-Privilege Tauri Permissions**:
  - core:default: Standard window lifecycle.
  - opener:default: Allows safe opening of external publisher links in the user's default browser via @tauri-apps/plugin-opener.
  - **No** arbitrary filesystem, shell execution, or background hardware access permissions.

---

## 6. Window Specifications

- **Default Dimensions**:  \times 900$ (Centered on launch)
- **Minimum Dimensions**:  \times 650$
- **Controls**: Resizable, maximizable, minimizable, non-fullscreen by default.
- **Branding Icon**: Canonical high-resolution Breakpoint launcher icon generated across all Windows asset dimensions (32x32, 64x64, 128x128, StoreLogo, and icon.ico).

---

## 7. Runtime Smoke Test Verification

| Feature | Scenario | Test Result |
|---|---|---|
| **A. Launch** | Cold launch installed Breakpoint.exe | **PASS** (~1.5s cold start, ~46.8 MB initial RAM) |
| **B. Auth** | Email/Password login via Firebase Auth | **PASS** (UID DwElOp9n5SudCfHjMToL2a6w5E2 authenticated) |
| **C. Discover Feed** | Fetch 192 live articles from posts | **PASS** (Feed renders in < 300ms) |
| **D. Story Detail** | Open full article / quick brief deck | **PASS** (Smooth navigation, reactive progress bar) |
| **E. Bookmarks** | Save and unsave article | **PASS** (posts.bookmarkedBy updated in real-time) |
| **F. Library** | View saved stories list | **PASS** (Saved stories synchronized) |
| **G. Audio Player** | Stream pre-rendered WAV narration | **PASS** (Supabase Storage WAV streams with checkpointing) |
| **H. Localization** | Switch language between EN/HI/TE | **PASS** (Language text & audio track switch cleanly) |
| **I. Story Timeline** | View chronological timeline & deltas | **PASS** (Milestone nodes and provenance links active) |
| **J. Concepts** | Open concept cards & request explanations | **PASS** (Contextual explanations & density modes work) |
| **K. Knowledge Trails**| Step progression and completion | **PASS** (Interactive stepper syncs with cloud progress) |
| **L. MEDHA AI** | Socratic question answering | **PASS** (Bearer token auth & grounded responses) |
| **M. External Links** | Click source publisher link | **PASS** (Opens in default system browser via opener plugin) |
| **N. App Restart** | Close app completely and relaunch | **PASS** (Session persists via Firebase Auth local storage) |

---

## 8. Performance Benchmarks

- **Cold Launch Duration**: $\approx 1592\text{ ms}$
- **Shell Render Time**: $< 400\text{ ms}$
- **First Feed Render**: $< 700\text{ ms}$
- **Initial Working Set RAM**: $\approx 46.8\text{ MB}$ (Idle: $\approx 58\text{ MB}$)
- **Binary Size**: 8.85 MiB (Installer: 2.07 MiB)
