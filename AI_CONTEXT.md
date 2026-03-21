# 🤖 AI Context Index

> **生成時間:** 2026-03-21 20:30:00
> **專案路徑:** `E:\work\AI_Antigravity\stagepv_1`
> **掃描深度:** 4 層
>
> ⚠️ **此文件手動更新於本次開發對話，反映最新開發狀態。**

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
│   │   │   ├── LightingControls.tsx
│   │   │   ├── MaterialSelector.tsx
│   │   │   ├── ModelUploader.tsx
│   │   │   ├── ObjectInspector.tsx
│   │   │   ├── ReflectionControls.tsx
│   │   │   └── TextureUploader.tsx
│   │   ├── 📁 canvas
│   │   │   ├── CameraCapture.tsx
│   │   │   ├── CameraTransition.tsx
│   │   │   ├── PaperFigureRenderer.tsx
│   │   │   ├── PerfectRenderEnvironment.tsx  ← [NEW] 完美渲染環境
│   │   │   ├── Scene.tsx
│   │   │   ├── SceneGraph.tsx
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
│   │   │   └── LoadingOverlay.tsx
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
**最近 Commit:** `b01f5fe fix: video collapse 5s + touch support, remove old perfect render button (8 days ago)`
### 最近變更統計
```
src/components/client/ClientControls.tsx |  8 --------
 src/components/client/VideoControls.tsx  | 14 +++++++++-----
 2 files changed, 9 insertions(+), 13 deletions(-)
```
### 最近 Commits
```
b01f5fe fix: video collapse 5s + touch support, remove old perfect render button
97bc800 feat: perfect render toggle, mesh names, video auto-collapse, R2 tooltip
c22e174 feat: 新增紙片小人(Billboard)、截圖/繪圖工具、Emoji全面替換SVG、Cue+視角可收合面板
c56ab55 fix: reduce emissiveIntensity from 2.0 to 1.0
35fa964 chore: 調整 Bloom 輝光效果預設值
```

---

## 🏗️ 專案概覽 (Project Overview)

**StagePV** 是一個專業的 **3D 舞台視覺預覽系統**，專為演唱會、活動及展覽的 LED 牆面內容預覽而設計。用戶可以上傳 3D 舞台模型（GLB 格式），然後將影片/圖片投射到 LED 面上進行視覺化預覽。

### 核心功能

| 功能 | 說明 | 入口頁面 |
|------|------|----------|
| 🎮 **自由測試** | 上傳 3D 模型，在本地預覽影像/影片在 LED 上的呈現 | `/free-test` |
| 📹 **影像進度** | 雲端專案管理，支援 R2 影片上傳、進度追蹤與分享 | `/video-progress` |
| 🔗 **分享** | 生成唯讀分享連結供客戶/團隊檢視 | `/share/[id]` |
| 🎬 **模擬** | 含管理面板的完整 3D 場景編輯器 | `/simulation` |

### 技術棧 (Tech Stack)

| 層級 | 技術 |
|------|------|
| **框架** | Next.js 16.1.1 (App Router) |
| **語言** | TypeScript 5, React 19 |
| **3D 渲染** | Three.js 0.182 + @react-three/fiber 9.5 + @react-three/drei 10.7 |
| **後處理** | @react-three/postprocessing (Bloom 等效果) |
| **狀態管理** | Zustand 5.0.9 (persist middleware → localStorage) |
| **影片播放** | HLS.js 1.6.15 (支援 .m3u8 串流) |
| **影片轉碼** | @ffmpeg/ffmpeg (瀏覽器端 WebAssembly) |
| **3D 模型壓縮** | @gltf-transform + draco3dgltf + meshoptimizer |
| **雲端儲存** | Cloudflare R2 (via @aws-sdk/client-s3) |
| **影像處理** | Cloudinary (伺服器簽章上傳) |
| **資料庫** | Firebase Firestore (專案資料) |
| **部署** | Vercel |
| **CSS** | Tailwind CSS 4 |

---

## 🧩 關鍵模組 (Key Modules)

### 狀態管理 — `src/store/useStore.ts`
全局 Zustand Store，包含：
- **StageObject**: 3D 模型物件（位置/旋轉/縮放/材質/parent 連結）
- **ContentTexture**: 圖片/影片/R2 影片紋理
- **CameraView**: 相機視角預設
- **StageCue**: 場景預設（保存所有物件的 transform 快照）
- **PaperFigure**: 紙片小人（比例尺參考）
- **R2Video**: 雲端 R2 影片管理
- **SpotLightConfig**: 可控聚光燈配置（position/intensity/angle/distance/color/enabled/castShadow/name）
- **渲染參數**: renderMode, bloom, ambient/directional light, FOV, reflection
- **完美渲染參數**: perfectRenderEnabled, envPreset, envIntensity, contactShadow, toneMapping, spotLights[], reflectionMirror/Blur/Metalness
- **持久化**: 使用 `zustand/persist` 存入 localStorage（key: `stage-preview-storage`）

### 3D 場景 — `src/components/canvas/`
- `Scene.tsx`: 主場景容器（Canvas, lights, postprocessing）
- `SceneGraph.tsx`: 場景物件圖管理（含 MeshReflectorMaterial 地板反射、EffectComposer 後處理分支）
- `StageObjectRenderer.tsx`: 單一舞台物件渲染（GLB 載入 + 材質套用 + 紋理投射，完美模式使用 `createPerfectMaterial()`）
- `PerfectRenderEnvironment.tsx`: **[NEW]** 完美渲染環境組件（HDR IBL、可控原生聚光燈、接觸陰影、ACES tone mapping）
- `VideoManager.tsx`: 影片紋理管理（本地影片）
- `CameraCapture.tsx` / `CameraTransition.tsx`: 相機控制與動畫
- `PaperFigureRenderer.tsx`: 紙片小人 Billboard 渲染

### 管理面板 — `src/components/admin/`
- `AdminControls.tsx`: 管理面板主容器
- `ModelUploader.tsx`: GLB 模型上傳（自動壓縮）
- `TextureUploader.tsx`: 紋理上傳
- `LightingControls.tsx`: 燈光參數調整
- `MaterialSelector.tsx`: 材質選擇器
- `ObjectInspector.tsx`: 物件屬性檢查器
- `ReflectionControls.tsx`: 完美渲染模式控制
- `CueManager.tsx`: 場景 Cue 管理

### 客戶端 UI — `src/components/client/`
- `ClientControls.tsx` / `ClientToolbar.tsx`: 客戶端控制工具列
- `VideoControls.tsx`: 影片播放控制（播放/暫停/進度/音量）
- `R2VideoManager.tsx`: R2 雲端影片管理 UI
- `ClientUploader.tsx`: 客戶端內容上傳
- `RenderModeSelector.tsx`: 渲染模式切換（wireframe/beauty/clay）
- `ViewSwitcher.tsx`: 視角切換器
- `DrawingOverlay.tsx`: 畫布繪圖覆蓋層
- `TranscodeModal.tsx`: 影片轉碼彈窗
- `BottomLeftPanel.tsx`: 底部左側面板

### API 路由 — `src/app/api/`
- `r2-upload/`: Cloudflare R2 上傳（presigned URL 模式）
- `upload/`: 一般上傳端點
- `sign-cloudinary/`: Cloudinary 簽章生成
- `compress-glb/`: GLB 模型伺服端壓縮

### 工具庫 — `src/lib/`
- `firebase.ts`: Firebase 初始化
- `project-service.ts`: 專案 CRUD 服務（Firestore），`ProjectState` 包含基礎燈光 + 完美渲染設定的完整持久化
- `materials.ts`: **[重大更新]** 材質定義與程序化紋理系統
  - 15 種 PBR 材質（全中文命名）：霧面深灰塑膠、拋光鋁合金、亮面黑塑料、水泥灰、淺灰漆面、烤漆紅、鏡面白、透明玻璃、自發光、拉絲不鏽鋼、碳纖維、橡木、清水混凝土、紅銅、霓虹光管
  - 6 個程序化紋理生成器：噪聲、拉絲金屬、碳纖維、木紋、混凝土、銅質
  - Sobel 法線貼圖推導器
  - `createMaterial()`: 預設模式（MeshStandardMaterial，效能優先）
  - `createPerfectMaterial()`: 完美渲染模式（MeshPhysicalMaterial + clearcoat/sheen/anisotropy/transmission/iridescence）
- `draco.ts`: Draco 壓縮設定
- `ratelimit.ts`: API 速率限制
- `thumbnail.ts`: 縮圖生成
- `transcode.ts`: 影片轉碼邏輯

### 自訂 Hooks — `src/hooks/`
- `useHlsTexture.ts`: HLS 影片紋理 hook
- `useRecorder.ts`: 場景錄製 hook

---

## 🔀 資料流 (Data Flow)

```
用戶上傳 GLB 模型
    → compress-glb API (伺服端壓縮)
    → Cloudinary 上傳 (持久化儲存)
    → Zustand Store (stageObjects)
    → Three.js Scene 渲染

用戶上傳影片/圖片
    → 本地 Blob URL 或 Cloudinary URL
    → Zustand Store (contentTextures)
    → Three.js 材質紋理投射到 LED mesh

R2 影片上傳 (影像進度模式)
    → presigned URL 簽章 (r2-upload API)
    → 直接上傳至 Cloudflare R2
    → Firestore 記錄 metadata
    → Zustand Store (r2Videos)

專案分享
    → Firestore 保存完整場景狀態（含完美渲染設定）
    → 生成 /free-test/[id]?share=1 分享連結 或 /share/[id] 唯讀連結
    → 客戶端自動還原：stageObjects, views, cues, lighting, 完美渲染（spotLights, envPreset, reflection 等）
```

---

## 🧠 開發者認知 (Developer State)

| 項目 | 內容 |
|------|------|
| **當前進度** | 核心功能已完成。本次新增：(1) 完美渲染環境組件 (HDR IBL + 可控聚光燈 + 接觸陰影)；(2) 材質庫擴充至 15 種含中文命名 + 程序化紋理系統；(3) 完美渲染設定 Firestore 同步（admin 設定自動分享給客戶端）；(4) 聚光燈 UI 控制面板（XYZ 位置/強度/角度/距離/顏色/陰影） |
| **最近修復** | drei SpotLight 改為原生 spotLight（修復體積光錐遮擋畫面）；移除 EffectComposer 重複 ToneMapping（修復雙重 ACES 黑塊閃爍）；matteMetal 改為簡單霧面塑膠 |
| **當前阻礙** | 🔴 **完美渲染模式下仍有黑塊閃爍問題** — 已排除：(a) 材質法線貼圖 (b) drei SpotLight 體積錐 (c) 雙重 ToneMapping。可能殘留原因：MeshReflectorMaterial 反射相機衝突、drei Instances 元件與 MeshPhysicalMaterial 不完全相容、或 EffectComposer multisampling 與反射材質交互問題。需進一步排查 |
| **已知技術債** | `.gemini/diagnostics/` 中有多份 R2 影片播放問題的診斷報告（已解決）；`generateBrushedMetalTexture()` 和 `generateNormalMapFromCanvas()` 在深色金屬上可能產生閃爍，目前已從 matteMetal/brushedSteel 移除使用 |
| **部署** | 已設定 Vercel 部署，Firebase hosting 也有配置 |
| **下次 TODO** | (1) 徹底排查完美渲染黑塊閃爍根因（建議逐一關閉 MeshReflectorMaterial / EffectComposer / spotLight 測試）；(2) 驗證新材質在完美渲染模式下的視覺效果；(3) 考慮 MaterialSelector UI 更新以展示新材質預覽 |

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
6. **狀態管理核心** — `useStore.ts` 是整個應用的核心，修改前務必理解其持久化邏輯。
7. **API 安全** — 所有 API 端點都有速率限制，secrets 僅在伺服端使用。
8. **3D 渲染** — Three.js 場景使用 @react-three/fiber 宣告式 API，不直接操作 Three.js 原生物件。
