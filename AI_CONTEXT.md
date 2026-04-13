# 🤖 AI Context Index

> **生成時間:** 2026-04-09 22:17:54
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
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── USER_GUIDE.md
```

---

## 🔄 活躍工作區 (Active Workspace)

**當前分支:** `main`
### 未提交變更 (Uncommitted Changes)
```
M src/app/free-test/[id]/page.tsx
 M src/app/share/[id]/page.tsx
 M src/app/video-progress/[id]/page.tsx
M  src/components/canvas/SceneGraph.tsx
M  src/components/canvas/StageObjectRenderer.tsx
M  src/components/canvas/VideoManager.tsx
AM src/components/canvas/VideoTimelineController.tsx
M  src/components/client/ClientToolbar.tsx
MM src/components/client/R2VideoManager.tsx
MM src/components/client/VideoControls.tsx
M  src/hooks/useHlsTexture.ts
 M src/lib/project-service.ts
M  src/lib/thumbnail.ts
MM src/store/useStore.ts
```
### 最近 Commits
```
d47e2ae measuretool
bc05611 PROJECTION
339cd34 fix
e5b82f8 fix progress
73b77f4 fix alot
```

---

## 🧠 開發者認知 (Developer State)

| 項目 | 內容 |
|------|------|
| **當前進度/阻礙** | 1. 修復了包含 `activeContentId`, `videoCurrentTime` 以及 `r2Videos` 的專案儲存機制 (`project-service.ts`, `useProjectSave.ts`)，避免時間軸標記重整後丟失。<br>2. 時間軸過渡 (Timeline Cue) 邏輯確認使用「後過渡 (Post-transition)」機關啟動設計：抵達 Cue 時觸發漸變並持續 `duration` 秒。<br>3. VideoControls 介面上的橘色過渡區塊已正確修改為顯示在標記右側。 |
| **下次首要 TODO** | 依據目前修復後的時間軸過渡與存檔機制進行測試，若有針對機關邏輯的細節與表現需強化，再行微調。 |

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
