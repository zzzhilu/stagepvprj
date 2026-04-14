# 🤖 AI Context Index

> **生成時間:** 2026-04-14 10:39:47
> **專案路徑:** `E:\work\AI_Antigravity\stagepv_1`
> **掃描深度:** 3 層
>
> ⚠️ **此文件由腳本自動生成，請勿手動編輯。** 重新執行 `generate_context.py` 以更新。

---

## 📁 專案結構 (Topology)

以下為專案目錄樹（已過濾環境依賴與編譯產物）：

```
📁 stagepv_1/
├── 📁 .firebase
│   └── 📁 stagepv-5f335
│       ├── 📁 functions
│       └── 📁 hosting
├── 📁 .gemini
│   ├── 📁 diagnostics
│   │   ├── r2_debug_panel_guide.md
│   │   ├── r2_env_checklist.md
│   │   ├── r2_fix_summary.md
│   │   ├── r2_quick_reference.md
│   │   ├── r2_video_fix_report.md
│   │   ├── r2_video_playback_fix.md
│   │   ├── r2_video_test.html
│   │   └── video_format_compatibility.md
│   └── implementation_plan.md
├── 📁 .vercel
│   ├── project.json
│   └── README.txt
├── 📁 public
│   ├── 📁 favicon-concepts
│   │   ├── concept-1-spotlight.svg
│   │   ├── concept-2-stage-box.svg
│   │   ├── concept-3-sp-monogram.svg
│   │   ├── concept-4-curtain.svg
│   │   ├── concept-5-eye-stage.svg
│   │   └── preview.html
│   ├── 📁 models
│   │   └── 📁 presets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── 📁 src
│   ├── 📁 app
│   │   ├── 📁 api
│   │   ├── 📁 free-test
│   │   ├── 📁 share
│   │   ├── 📁 simulation
│   │   ├── 📁 video-progress
│   │   ├── apple-icon.tsx
│   │   ├── globals.css
│   │   ├── icon.svg
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── 📁 components
│   │   ├── 📁 admin
│   │   ├── 📁 canvas
│   │   ├── 📁 client
│   │   ├── 📁 debug
│   │   ├── 📁 ui
│   │   └── ErrorBoundary.tsx
│   ├── 📁 hooks
│   │   ├── useHlsTexture.ts
│   │   └── useRecorder.ts
│   ├── 📁 lib
│   │   ├── draco.ts
│   │   ├── drive.ts
│   │   ├── firebase.ts
│   │   ├── materials.ts
│   │   ├── presets.tsx
│   │   ├── project-service.ts
│   │   ├── ratelimit.ts
│   │   ├── thumbnail.ts
│   │   └── transcode.ts
│   └── 📁 store
│       └── useStore.ts
├── 📁 test
│   ├── A_pose1.glb
│   ├── A_pose2.glb
│   ├── drum.glb
│   ├── guitar.glb
│   └── program.glb
├── .env.example
├── .env.local
├── .firebaserc
├── .gitignore
├── AI_CONTEXT.md
├── build_error.log
├── eslint.config.mjs
├── firebase-debug.log
├── firebase.json
├── git-push.bat
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── TASK_IMAGE_PROGRESS.md
├── test_old_store.txt
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── USER_GUIDE.md
```

---

## 🔄 活躍工作區 (Active Workspace)

**當前分支:** `main`
### 未提交變更 (Uncommitted Changes)
```
M .env.example
 M .gemini/implementation_plan.md
 M package-lock.json
 M package.json
 M src/app/free-test/[id]/page.tsx
 M src/app/share/[id]/page.tsx
 M src/app/video-progress/[id]/page.tsx
 M src/components/admin/AdminControls.tsx
 M src/components/admin/StageLightingPanel.tsx
 M src/components/canvas/StageObjectRenderer.tsx
 M src/components/canvas/VideoManager.tsx
 M src/components/canvas/VideoTimelineController.tsx
 M src/lib/project-service.ts
 M src/store/useStore.ts
?? src/app/api/drive/
?? src/components/admin/ContentInspector.tsx
?? src/components/admin/GDriveVideoManager.tsx
?? src/components/client/ClientPlaylistSidebar.tsx
?? src/lib/drive.ts
?? test_old_store.txt
```
### 最近 Commits
```
6ce1b80 add cue setting
d47e2ae measuretool
bc05611 PROJECTION
339cd34 fix
e5b82f8 fix progress
```

---

## 🧠 開發者認知 (Developer State)

| 功能模組 | 內容狀態 |
|------|------|
| **1. 專案核心架構與狀態** | 使用 Next.js + React Three Fiber + Firebase。<br>所有的 3D 狀態與編輯資訊皆由 `src/store/useStore.ts` (Zustand) 集中管理，包含節點屬性、目前影片播放、Cues事件等。 |
| **2. 3D發光材質與媒體映射** | 針對 `StageObject` (具有 emissive 屬性的 3D 節點) 支援動態貼圖。<br>透過 `ContentInspector.tsx` 可配置套用的影片/圖片 (`ContentTexture`)，並可個別設定縮放 (`width`/`height`)、偏移 (`x`/`y`) 以及選擇「特定畫布顯示 (`targetNodeId`)」。<br>這段邏輯在 `StageObjectRenderer.tsx` 透過 `textureMap.clone()` 處理。 |
| **3. 雲端影音與CORS整合** | 實作了 Google Drive 影片同步 (`GDriveVideoManager.tsx`) 及 Cloudflare R2 影音流的載入。<br>已處理 iOS WebGL CORS 在 R2 Video 的相容性問題（`VideoManager.tsx` 配置單純化的隱藏 `<video>`，由 WebGL 同步讀取 frame）。 |
| **4. 浮動式管理介面 (UI)** | 後台管理頁面實裝了拖曳式浮動視窗系統，容許諸如 Scene Graph、Content Inspector、Stage Lighting 等多個面板同時存在並操作，提升佈展操作流暢度。 |
| **5. 當前阻礙點/預期TODO** | 目前 `VideoManager.tsx` 僅透過維護一個全域的隱藏 `<video>` 來提供材質給 3D 世界使用，故**全場景同時只能播放一支影片**。<br>若未來需求包含支援「同時多影片異步播放」，將須擴充為「多個影片標籤與獨立管理 VideoTexture」架構。 |

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
