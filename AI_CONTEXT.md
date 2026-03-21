# 🤖 AI Context Index

> **生成時間:** 2026-03-22 00:38:36
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
│   ├── 📁 models
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
│   │   ├── favicon.ico
│   │   ├── globals.css
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
│   │   ├── project-service.ts
│   │   ├── ratelimit.ts
│   │   ├── thumbnail.ts
│   │   └── transcode.ts
│   └── 📁 store
│       └── useStore.ts
├── 📁 test
│   └── 123.glb
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
**最近 Commit:** `6eea9d7 feat: 新增平面圖上傳功能 + emissive單面渲染 - PLANE mesh自動識別為floor_plan類型 - FloorPlanUploader元件(上傳/預覽/替換/移除) - 平面圖材質半透明(opacity 0.7) - emissive材質改為FrontSide單面顯示 (26 seconds ago)`
### 最近變更統計
```
src/components/admin/AdminControls.tsx        |   6 +
 src/components/admin/FloorPlanUploader.tsx    | 156 ++++++++++++++++++++++++++
 src/components/admin/ModelUploader.tsx        |   6 +-
 src/components/admin/ObjectInspector.tsx      |   3 +-
 src/components/canvas/StageObjectRenderer.tsx |  48 +++++++-
 src/store/useStore.ts                         |  13 ++-
 6 files changed, 226 insertions(+), 6 deletions(-)
```
### 最近 Commits
```
6eea9d7 feat: 新增平面圖上傳功能 + emissive單面渲染 - PLANE mesh自動識別為floor_plan類型 - FloorPlanUploader元件(上傳/預覽/替換/移除) - 平面圖材質半透明(opacity 0.7) - emissive材質改為FrontSide單面顯示
1a43f60 fix: 修復物件名稱顯示 + 拉絲金屬黑塊問題 - ObjectInspector使用type標籤 - 移除brushedSteel anisotropy改用roughnessMap
b01f5fe fix: video collapse 5s + touch support, remove old perfect render button
97bc800 feat: perfect render toggle, mesh names, video auto-collapse, R2 tooltip
c22e174 feat: 新增紙片小人(Billboard)、截圖/繪圖工具、Emoji全面替換SVG、Cue+視角可收合面板
```

---

## 🧠 開發者認知 (Developer State)

| 項目 | 內容 |
|------|------|
| **當前進度/阻礙** | 待確認 |
| **下次首要 TODO** | 待確認 |

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
