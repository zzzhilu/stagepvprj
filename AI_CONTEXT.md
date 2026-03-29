# 🤖 AI Context Index

> **生成時間:** 2026-03-29 13:49:00
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
├── 📁 .gemini
│   ├── 📁 diagnostics
│   └── implementation_plan.md
├── 📁 .vercel
├── 📁 public
│   ├── 📁 favicon-concepts
│   ├── 📁 models
│   │   └── 📁 presets
│   │       ├── A_pose1.glb / A_pose2.glb
│   │       ├── drum.glb / guitar.glb / program.glb
│   ├── file.svg / globe.svg / next.svg / vercel.svg / window.svg
├── 📁 src
│   ├── 📁 app
│   │   ├── 📁 api
│   │   │   ├── 📁 compress-glb
│   │   │   ├── 📁 r2-upload
│   │   │   ├── 📁 sign-cloudinary
│   │   │   └── 📁 upload
│   │   ├── 📁 free-test
│   │   │   ├── 📁 [id]         ← 自由測試（含管理面板）
│   │   │   └── page.tsx        ← 專案選擇頁
│   │   ├── 📁 share
│   │   │   └── 📁 [id]         ← 客戶分享連結（純瀏覽）
│   │   ├── 📁 simulation
│   │   ├── 📁 video-progress
│   │   │   ├── 📁 [id]
│   │   │   └── page.tsx
│   │   ├── favicon.ico / globals.css / layout.tsx / page.tsx
│   ├── 📁 components
│   │   ├── 📁 admin           ← 管理端 UI 控制面板
│   │   │   ├── AdminControls.tsx      (管理面板入口)
│   │   │   ├── CueManager.tsx         (場景/Cue 管理)
│   │   │   ├── FloorPlanUploader.tsx  (平面圖貼圖上傳)
│   │   │   ├── LightingControls.tsx   (全域照明控制)
│   │   │   ├── MaterialSelector.tsx   (材質選擇器)
│   │   │   ├── ModelUploader.tsx      (GLB 模型上傳/分類)
│   │   │   ├── ObjectInspector.tsx    (物件屬性面板)
│   │   │   ├── QuickAddPanel.tsx      (快速新增：台板/樂手)
│   │   │   ├── ReflectionControls.tsx (地面反射控制)
│   │   │   ├── StageLightingPanel.tsx (舞台燈光 CRUD)
│   │   │   └── TextureUploader.tsx    (材質紋理上傳)
│   │   ├── 📁 canvas          ← 3D 場景渲染元件
│   │   │   ├── BoxPrimitiveRenderer.tsx   (Box 台板渲染)
│   │   │   ├── CameraCapture.tsx          (相機視角截取)
│   │   │   ├── CameraTransition.tsx       (相機過渡動畫)
│   │   │   ├── PaperFigureRenderer.tsx    (紙片小人渲染)
│   │   │   ├── PerfectRenderEnvironment.tsx(完美渲染環境)
│   │   │   ├── Scene.tsx                  (Canvas 容器/frameloop)
│   │   │   ├── SceneGraph.tsx             (場景圖：模型+控制器)
│   │   │   ├── StageLightRenderer.tsx     (舞台燈光渲染)
│   │   │   ├── StageObjectRenderer.tsx    (物件渲染+Gizmo)
│   │   │   ├── VideoManager.tsx           (影片紋理管理)
│   │   │   └── WalkModeController.tsx     (漫遊模式控制器) [NEW]
│   │   ├── 📁 client          ← 客戶端 UI 元件
│   │   │   ├── BottomLeftPanel.tsx    (左下角面板：Cue選擇/視角)
│   │   │   ├── ClientControls.tsx     (客戶端控制入口)
│   │   │   ├── ClientToolbar.tsx      (左側工具列：漫遊/截圖/畫筆/小人/渲染)
│   │   │   ├── ClientUploader.tsx     (客戶端上傳)
│   │   │   ├── CueSelector.tsx        (Cue 切換)
│   │   │   ├── DrawingOverlay.tsx     (繪圖疊層)
│   │   │   ├── PerfectRenderToggle.tsx(完美渲染開關)
│   │   │   ├── R2VideoManager.tsx     (R2 影片管理)
│   │   │   ├── RenderModeSelector.tsx (渲染模式：Beauty/Wire/Clay)
│   │   │   ├── TouchJoystick.tsx      (手機虛擬搖桿) [NEW]
│   │   │   ├── TranscodeModal.tsx     (影片轉碼 Modal)
│   │   │   ├── VideoControls.tsx      (影片播放控制)
│   │   │   └── ViewSwitcher.tsx       (視角切換)
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
│   │   ├── draco.ts / firebase.ts / materials.ts
│   │   ├── presets.tsx / project-service.ts
│   │   ├── ratelimit.ts / thumbnail.ts / transcode.ts
│   └── 📁 store
│       └── useStore.ts        (Zustand 中央狀態管理)
├── 📁 test
│   └── *.glb                  (測試用預設模型)
├── .env.local / .firebaserc / firebase.json
├── next.config.ts / package.json / tsconfig.json
└── AI_CONTEXT.md
```

---

## 🔄 活躍工作區 (Active Workspace)

**當前分支:** `main`
### 工作區狀態：✅ 乾淨
**最近 Commit:** `7070128 feat: add walk mode (first-person terrain-following navigation)`
### 最近 Commits
```
7070128 feat: add walk mode (first-person terrain-following navigation)
550e140 chore: trigger Vercel redeploy after reconnecting private repo
15d764d feat: add StagePV favicon - isometric stage box with circular black background
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
| **當前進度** | 已完成漫遊模式（Walk Mode）— 第一人稱地形追蹤導航，含桌面 WASD + 手機虛擬搖桿 |
| **阻礙** | 燈光系統（StageLightRenderer）預設關閉，等待效果完善後再啟用 |
| **下次首要 TODO** | 實際場景中測試漫遊模式的地形追蹤效果，調整參數；考慮加入天花板碰撞偵測 |

### 近期開發歷程

| 日期 | 變更 | 相關檔案 |
|------|------|----------|
| 2026-03-29 | **漫遊模式**：WASD 自動進入、地形追蹤 Raycast、手機 `nipplejs` 搖桿、低調灰色提示橫幅、可靠觸控偵測 | `WalkModeController.tsx`, `TouchJoystick.tsx`, `ClientToolbar.tsx`, `SceneGraph.tsx`, `Scene.tsx`, `useStore.ts` |
| 2026-03-28 | Favicon 設計、Vercel 自動部署修復、GitHub 倉庫轉為 private | `favicon.ico`, `.github/workflows/` |
| 2026-03-27 | 預設關閉燈光系統（spotLights enabled→false, migration 也預設 disabled） | `useStore.ts` |
| 2026-03-26 | 實作 Quick Add 面板：台板生成器、預設樂手模型庫、全域 LoadingBar | `QuickAddPanel.tsx`, `presets.tsx` |
| 2026-03-25 | 動態舞台燈光系統 CRUD、Gizmo 控制、Tyndall 體積光 shader | `StageLightRenderer.tsx`, `StageLightingPanel.tsx` |
| 2026-03-25 | 主光源方向控制、陰影效能優化、材質修正 | `SceneGraph.tsx`, `LightingControls.tsx` |
| 2026-03-22 | 新增 prop/band 模型類別，ModelUploader 支援命名規範自動分類 | `ModelUploader.tsx`, `useStore.ts` |

### 架構要點

- **狀態管理**: Zustand (`useStore.ts`) — 中央 store，persist to localStorage
- **3D 渲染**: React Three Fiber + drei — `SceneGraph.tsx` 為場景入口
- **漫遊模式**: `WalkModeController.tsx` — 地形追蹤（Raycast Down → 找地面 → 相機高度 = 地面 + 1.7m），WASD 自動進入、中鍵/右鍵退出
  - 手機端: `TouchJoystick.tsx` (nipplejs)，觸控拖拽旋轉
  - `ClientToolbar.tsx` 使用本地 `isTouchDevice` 而非 store `isMobile`（後者從未被初始化）
  - `Scene.tsx` frameloop 在漫遊模式下設為 `'always'`
- **燈光系統**: `StageLightRenderer.tsx` 僅在 `perfectRenderEnabled` 時渲染，每盞燈有 `enabled` guard（當前預設關閉）
- **客戶端頁面**: `share/[id]` (分享連結)、`free-test/[id]` (自由測試) — 均渲染 `ClientToolbar` 含漫遊按鈕
- **部署**: GitHub → Vercel 自動部署，R2 用於影片存儲，Firebase Hosting 為備用
- **預設模型**: `public/models/presets/` 下有 A_pose1/2、drum、guitar、program 等 GLB

### 依賴清單（關鍵）

| 套件 | 用途 |
|------|------|
| `@react-three/fiber` | React Three.js 渲染引擎 |
| `@react-three/drei` | OrbitControls、KeyboardControls 等 |
| `@react-three/postprocessing` | Bloom、SMAA、ToneMapping |
| `nipplejs` | 手機端虛擬搖桿（漫遊模式） |
| `zustand` | 全域狀態管理 |
| `firebase` / `firebase-admin` | Firestore 專案數據 |
| `hls.js` | 影片串流播放 |
| `draco3dgltf` | GLB 模型壓縮 |

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
