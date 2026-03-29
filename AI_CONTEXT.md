# 🤖 AI Context Index

> **生成時間:** 2026-03-27 00:47:23
> **專案路徑:** `E:\work\AI_Antigravity\stagepv_1`
> **掃描深度:** 4 層
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
│       │   └── 📁 public
│       └── 📁 hosting
│           ├── 📁 _next
│           ├── 📁 models
│           ├── 404.html
│           ├── 500.html
│           ├── _global-error.html
│           ├── _not-found.html
│           ├── favicon.ico
│           ├── file.svg
│           ├── free-test.html
│           ├── globe.svg
│           ├── index.html
│           ├── next.svg
│           ├── simulation.html
│           ├── vercel.svg
│           ├── video-progress.html
│           └── window.svg
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
│   ├── 📁 models
│   │   └── 📁 presets
│   │       ├── A_pose1.glb
│   │       ├── A_pose2.glb
│   │       ├── drum.glb
│   │       ├── guitar.glb
│   │       └── program.glb
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── 📁 src
│   ├── 📁 app
│   │   ├── 📁 api
│   │   │   ├── 📁 compress-glb
│   │   │   ├── 📁 r2-upload
│   │   │   ├── 📁 sign-cloudinary
│   │   │   └── 📁 upload
│   │   ├── 📁 free-test
│   │   │   ├── 📁 [id]
│   │   │   └── page.tsx
│   │   ├── 📁 share
│   │   │   └── 📁 [id]
│   │   ├── 📁 simulation
│   │   │   └── page.tsx
│   │   ├── 📁 video-progress
│   │   │   ├── 📁 [id]
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── 📁 components
│   │   ├── 📁 admin
│   │   │   ├── AdminControls.tsx
│   │   │   ├── CueManager.tsx
│   │   │   ├── FloorPlanUploader.tsx
│   │   │   ├── LightingControls.tsx
│   │   │   ├── MaterialSelector.tsx
│   │   │   ├── ModelUploader.tsx
│   │   │   ├── ObjectInspector.tsx
│   │   │   ├── QuickAddPanel.tsx
│   │   │   ├── ReflectionControls.tsx
│   │   │   ├── StageLightingPanel.tsx
│   │   │   └── TextureUploader.tsx
│   │   ├── 📁 canvas
│   │   │   ├── BoxPrimitiveRenderer.tsx
│   │   │   ├── CameraCapture.tsx
│   │   │   ├── CameraTransition.tsx
│   │   │   ├── PaperFigureRenderer.tsx
│   │   │   ├── PerfectRenderEnvironment.tsx
│   │   │   ├── Scene.tsx
│   │   │   ├── SceneGraph.tsx
│   │   │   ├── StageLightRenderer.tsx
│   │   │   ├── StageObjectRenderer.tsx
│   │   │   └── VideoManager.tsx
│   │   ├── 📁 client
│   │   │   ├── BottomLeftPanel.tsx
│   │   │   ├── ClientControls.tsx
│   │   │   ├── ClientToolbar.tsx
│   │   │   ├── ClientUploader.tsx
│   │   │   ├── CueSelector.tsx
│   │   │   ├── DrawingOverlay.tsx
│   │   │   ├── PerfectRenderToggle.tsx
│   │   │   ├── R2VideoManager.tsx
│   │   │   ├── RenderModeSelector.tsx
│   │   │   ├── TranscodeModal.tsx
│   │   │   ├── VideoControls.tsx
│   │   │   └── ViewSwitcher.tsx
│   │   ├── 📁 debug
│   │   │   └── R2VideoDebugPanel.tsx
│   │   ├── 📁 ui
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   └── PageLoadingBar.tsx
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
### 工作區狀態：✅ 乾淨
**最近 Commit:** `3ebaad3 chore: disable stage lighting system by default (54 seconds ago)`
### 最近變更統計
```
src/store/useStore.ts | 8 ++++----
 1 file changed, 4 insertions(+), 4 deletions(-)
```
### 最近 Commits
```
3ebaad3 chore: disable stage lighting system by default
8f8a5d6 fix: unignore preset models and push to repository
3b35ed0 feat: 實作快速新增面板、台板生成器、預設樂手模型庫與全域 LoadingBar
6bf9d00 feat: UI優化 (影片播放器改為綠色, 畫筆工具列移至側邊, 加入紙片小人模式提示, 修改紙片小人材質為非發光)
0b6364e feat: 主光源方向控制+陰影效能優化+材質修正
```

---

## 🧠 開發者認知 (Developer State)

| 項目 | 內容 |
|------|------|
| **當前進度** | 燈光系統（spotlight, arealight）已預設關閉，等待完善後再啟用 |
| **阻礙** | 燈光系統（StageLightRenderer）尚未建立足夠良好的效果，客戶端也無法顯示 spotlight/arealight |
| **下次首要 TODO** | 完善燈光系統的渲染品質後再重新啟用 |

### 近期開發歷程

| 日期 | 變更 | 相關檔案 |
|------|------|----------|
| 2026-03-27 | 預設關閉燈光系統（spotLights enabled→false, migration 也預設 disabled） | `useStore.ts` |
| 2026-03-26 | 實作 Quick Add 面板：台板生成器、預設樂手模型庫、全域 LoadingBar | `QuickAddPanel.tsx`, `presets.tsx` |
| 2026-03-25 | 動態舞台燈光系統 CRUD、Gizmo 控制、Tyndall 體積光 shader | `StageLightRenderer.tsx`, `StageLightingPanel.tsx` |
| 2026-03-25 | 主光源方向控制、陰影效能優化、材質修正 | `SceneGraph.tsx`, `LightingControls.tsx` |
| 2026-03-22 | 新增 prop/band 模型類別，ModelUploader 支援命名規範自動分類 | `ModelUploader.tsx`, `useStore.ts` |

### 架構要點

- **狀態管理**: Zustand (`useStore.ts`) — 中央 store，persist to localStorage
- **3D 渲染**: React Three Fiber + drei — `SceneGraph.tsx` 為場景入口
- **燈光系統**: `StageLightRenderer.tsx` 僅在 `perfectRenderEnabled` 時渲染，每盞燈有 `enabled` guard
- **客戶端頁面**: `share/[id]` (分享連結)、`free-test/[id]` (自由測試) — 載入專案資料但不渲染 stage lights
- **部署**: Vercel + Firebase Hosting，R2 用於影片存儲
- **預設模型**: `public/models/presets/` 下有 A_pose1/2、drum、guitar、program 等 GLB

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
