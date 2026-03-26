# 🤖 AI Context Index

> **生成時間:** 2026-03-22 16:00:00
> **專案路徑:** `E:\work\AI_Antigravity\stagepv_1`
> **掃描深度:** 全層
>
> ⚠️ **此文件由 AI 助理全面 review 後生成，請勿手動編輯。**

---

## 📋 專案概述

**StagePV** 是一個基於 Next.js 16 + React 19 + Three.js 的 **3D 舞台預覽與影片制作協作平台**。

核心功能：
- 🎭 **3D 舞台場景管理** — 上傳 GLB 模型，分類為場館/舞台/LED/燈光/攝影機/平面圖，支援材質指定、位置/旋轉/縮放
- 🎬 **影片內容管理** — R2 影片上傳、HLS 播放、影片貼圖到 LED 牆面、錄影回放
- 📸 **客戶協作工具** — 分享連結、截圖、畫筆標記、紙片小人比例尺、鏡位管理、Cue 點系統
- ✨ **完美渲染模式** — 環境光照預設、Bloom、地板反射、接觸陰影、三點打光

**技術棧：** Next.js 16 · React 19 · Three.js 0.182 · R3F · Zustand 5 · Tailwind 4 · Firebase · Cloudflare R2 · Cloudinary

---

## 📁 專案結構 (Topology)

```
📁 stagepv_1/
├── 📁 public/models/              # 預載 GLB 模型
├── 📁 src/
│   ├── 📁 app/
│   │   ├── 📁 api/
│   │   │   ├── 📁 compress-glb/   # GLB 壓縮 API (draco/meshopt)
│   │   │   ├── 📁 r2-upload/      # Cloudflare R2 影片上傳 API
│   │   │   ├── 📁 sign-cloudinary/ # Cloudinary 簽署上傳 API
│   │   │   └── 📁 upload/         # 通用檔案上傳 API
│   │   ├── 📁 free-test/          # 免費測試頁面 (管理端)
│   │   │   └── 📁 [id]/           # 專案編輯頁（含管理+客戶模式切換）
│   │   ├── 📁 share/              # 客戶分享連結頁面
│   │   │   └── 📁 [id]/           # 客戶預覽頁（唯讀 + 協作工具）
│   │   ├── 📁 simulation/         # 場景模擬頁面
│   │   ├── 📁 video-progress/     # 影片進度管理頁面
│   │   │   └── 📁 [id]/           # 影片進度詳頁
│   │   ├── globals.css            # 全域 CSS（含 fade-in-down 動畫）
│   │   ├── layout.tsx             # 根 Layout
│   │   └── page.tsx               # 首頁（專案列表/入口）
│   │
│   ├── 📁 components/
│   │   ├── 📁 admin/              # 管理端元件
│   │   │   ├── AdminControls.tsx   # 主管理面板（模型上傳/材質選擇/光照等）
│   │   │   ├── CueManager.tsx      # Cue 點管理器（儲存/套用物件位置）
│   │   │   ├── FloorPlanUploader.tsx # 平面圖上傳
│   │   │   ├── LightingControls.tsx # 光照控制（環境光/方向光/Bloom/方向角度）
│   │   │   ├── MaterialSelector.tsx # 材質選擇器
│   │   │   ├── ModelUploader.tsx    # GLB 模型上傳（含壓縮/mesh 篩選）
│   │   │   ├── ObjectInspector.tsx  # 物件屬性檢查器（Transform/Material/Link）
│   │   │   ├── ReflectionControls.tsx # 反射/完美渲染控制
│   │   │   └── TextureUploader.tsx  # 貼圖/影片上傳（Cloudinary + R2）
│   │   │
│   │   ├── 📁 canvas/             # 3D 場景元件
│   │   │   ├── CameraCapture.tsx   # 相機視角捕捉
│   │   │   ├── CameraTransition.tsx # 相機過渡動畫
│   │   │   ├── PaperFigureRenderer.tsx # 紙片小人渲染（Billboard + MeshStandardMaterial）
│   │   │   ├── PerfectRenderEnvironment.tsx # 完美渲染環境（HDR/反射地板/陰影）
│   │   │   ├── Scene.tsx           # 主場景容器（Canvas + PostProcessing）
│   │   │   ├── SceneGraph.tsx      # 場景圖管理（物件樹/光照/TransformControls）
│   │   │   ├── StageObjectRenderer.tsx # 舞台物件渲染（GLB 載入/材質套用/LED 貼圖）
│   │   │   └── VideoManager.tsx    # 影片播放管理（HLS/直播/音量同步）
│   │   │
│   │   ├── 📁 client/             # 客戶端元件
│   │   │   ├── BottomLeftPanel.tsx  # 左下面板（鏡位/Cue 切換）
│   │   │   ├── ClientControls.tsx   # 基本導覽控制
│   │   │   ├── ClientToolbar.tsx    # 側邊欄工具列（截圖/畫筆/紙片小人/完美渲染）
│   │   │   ├── ClientUploader.tsx   # 客戶端上傳器
│   │   │   ├── CueSelector.tsx     # Cue 選擇器
│   │   │   ├── DrawingOverlay.tsx   # 畫筆覆蓋層（自由筆/方框/圓/三角/橡皮擦）
│   │   │   ├── PerfectRenderToggle.tsx # 完美渲染切換
│   │   │   ├── R2VideoManager.tsx   # R2 影片管理器
│   │   │   ├── RenderModeSelector.tsx # 渲染模式選擇（wireframe/beauty/clay）
│   │   │   ├── TranscodeModal.tsx   # 影片轉碼 Modal（FFmpeg WASM）
│   │   │   ├── VideoControls.tsx    # 影片播放控制（播放/暫停/進度/音量/錄影）
│   │   │   └── ViewSwitcher.tsx    # 鏡位切換器
│   │   │
│   │   ├── 📁 debug/              # 偵錯元件
│   │   │   └── R2VideoDebugPanel.tsx # R2 影片偵錯面板
│   │   │
│   │   ├── 📁 ui/                 # 通用 UI 元件
│   │   │   ├── ErrorBoundary.tsx   # 錯誤邊界
│   │   │   └── LoadingOverlay.tsx  # 載入覆蓋層
│   │   │
│   │   └── ErrorBoundary.tsx       # 根錯誤邊界
│   │
│   ├── 📁 hooks/
│   │   ├── useHlsTexture.ts       # HLS 影片貼圖 Hook（hls.js 整合）
│   │   └── useRecorder.ts         # 畫布錄影 Hook（MediaRecorder）
│   │
│   ├── 📁 lib/
│   │   ├── draco.ts               # Draco 解壓縮設定
│   │   ├── firebase.ts            # Firebase 初始化
│   │   ├── materials.ts           # 材質定義庫（25+ 材質：黑塑膠/金屬/鋁/木頭/LED/emissive 等）
│   │   ├── project-service.ts     # Firebase 專案 CRUD 服務
│   │   ├── ratelimit.ts           # API 速率限制
│   │   ├── thumbnail.ts           # 縮圖生成
│   │   └── transcode.ts           # 影片轉碼工具
│   │
│   └── 📁 store/
│       └── useStore.ts            # Zustand 全域狀態（548 行）
│                                  # 含：StageObject, CameraView, StageCue,
│                                  # ContentTexture, SpotLightConfig, R2Video,
│                                  # PaperFigure, 渲染設定, 編輯器狀態
├── .env.local                     # 環境變數（Firebase/R2/Cloudinary 金鑰）
├── firebase.json                  # Firebase 部署設定
├── next.config.ts                 # Next.js 設定
└── package.json                   # 依賴清單
```

---

## 🔑 核心資料模型 (Data Model)

| 模型 | 定義位置 | 說明 |
|------|----------|------|
| `StageObject` | `useStore.ts:29-37` | 舞台物件（GLB 模型 + 材質 + 位置 + 父子關聯） |
| `ContentTexture` | `useStore.ts:42-49` | 貼圖/影片內容（image / video / r2_video） |
| `CameraView` | `useStore.ts:78-88` | 鏡位視角（position + target + fov） |
| `StageCue` | `useStore.ts:21-27` | Cue 點（記錄所有物件的 transform 快照） |
| `SpotLightConfig` | `useStore.ts:51-60` | 聚光燈設定（三點打光系統） |
| `R2Video` | `useStore.ts:63-68` | R2 影片記錄（分享連結用） |
| `PaperFigure` | `useStore.ts:71-76` | 紙片小人（位置 + 縮放 + 顏色） |
| `ModelType` | `useStore.ts:6` | 模型分類：venues / stage / static_LED / moving_LED / moving_prop / basic_camera / floor_plan |
| `RenderMode` | `useStore.ts:90` | 渲染模式：wireframe / beauty / clay |

---

## 🎨 材質系統 (`lib/materials.ts`)

25+ 預定義材質，分類包含：
- **塑膠類：** 亮面黑膠、霧面黑膠、白色塑膠
- **金屬類：** 鋁、不鏽鋼、黑鐵、銅
- **木材類：** 淺木、深木
- **特殊類：** LED 面板（emissive + alphaMap 柵欄）、平面圖
- **程序化材質：** 支援 normalMap + roughnessMap 生成

---

## 🔄 活躍工作區 (Active Workspace)

**當前分支:** `main`

### 工作區狀態：✅ 已完成（待提交）

**準備 Commit:** `feat: 實作快速新增面板、台板生成器、預設樂手模型庫與全域 LoadingBar`

### 最近 Commits
```
[Pending] feat: 實作快速新增面板、台板生成器、預設樂手模型庫與全域 LoadingBar
6bf9d00 feat: UI優化 (影片播放器改為綠色, 畫筆工具列移至側邊, 加入紙片小人模式提示, 修改紙片小人材質為非發光)
0b6364e feat: 主光源方向控制+陰影效能優化+材質修正
a6b1dbe feat: 新增網格LED材質+旋轉限制
2c0a04d feat: LED反射+emissive色準優化
```

### 本次變更統計
```
AI_CONTEXT.md                                      |  內容更新
src/app/globals.css                                |  新增載入動畫
src/app/layout.tsx                                 |  套用載入條
src/components/admin/AdminControls.tsx             |  新增 QuickAdd 區塊與 SVG 更換
src/components/admin/QuickAddPanel.tsx             |  (新增) 台板與預設模型控制
src/components/canvas/BoxPrimitiveRenderer.tsx     |  (新增) R3F 原生台板生成
src/components/canvas/SceneGraph.tsx               |  加入 Box 渲染分流
src/components/ui/PageLoadingBar.tsx               |  (新增) 路由載入條
src/lib/materials.ts                               |  LED Alpha 網格直向改版
src/lib/presets.tsx                                |  (新增) 預設模型資料庫
```

---

## 🏗️ 架構要點

### 頁面路由
| 路由 | 用途 | 模式 |
|------|------|------|
| `/` | 首頁 / 專案列表 | 公開 |
| `/free-test/[id]` | 舞台編輯器（管理端） | 管理 + 客戶切換 |
| `/share/[id]` | 客戶預覽分享連結 | 唯讀客戶端 |
| `/simulation` | 場景模擬 | 獨立 |
| `/video-progress` | 影片進度管理列表 | 管理 |
| `/video-progress/[id]` | 影片進度詳頁 | 管理 |

### API 路由
| 路由 | 用途 |
|------|------|
| `/api/compress-glb` | Draco/Meshopt 壓縮 GLB |
| `/api/r2-upload` | Cloudflare R2 影片上傳（presigned URL） |
| `/api/sign-cloudinary` | Cloudinary 圖片簽署上傳 |
| `/api/upload` | 通用檔案上傳 |

### 狀態管理
- **Zustand 5** 全域 store，含 `persist` 中間件（localStorage）
- 持久化欄位：stageObjects, views, cues, contentTextures, r2Videos, paperFigures, floorPlanTextureUrl, fov
- 非持久化：renderMode, lighting, bloom, perfectRender 等渲染設定

### 3D 渲染管線
```
Scene.tsx (Canvas + PostProcessing)
├── SceneGraph.tsx (光照 + 物件樹 + TransformControls)
│   ├── StageObjectRenderer.tsx × N (GLB 載入 + 材質 + LED 貼圖)
│   ├── BoxPrimitiveRenderer.tsx (程序化生成台板)
│   └── PaperFigureRenderer.tsx (紙片小人 Billboard)
├── PerfectRenderEnvironment.tsx (環境 HDR + 反射地板 + 陰影)
├── VideoManager.tsx (HLS 影片 → texture 同步)
└── CameraCapture.tsx / CameraTransition.tsx
```

---

## 🧠 開發者認知 (Developer State)

| 項目 | 內容 |
|------|------|
| **當前進度** | 完成 快速新增面板、Box 台板生成器、預設樂手模型庫 (含父子物件跟隨)、全域路由 Loading Bar、UI 圖示全面 SVG 化 |
| **近期開發焦點** | 舞台搭建效率優化（程序化物件生成取代全手動 GLB）、介面一致性與載入體驗強化 |
| **下次首要 TODO** | 待用戶指定新的功能或修復要求 |

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
6. **Store 是核心** — `useStore.ts` 是專案的中樞神經系統，所有狀態都在這裡。修改前務必理解相關 actions。
7. **材質庫集中管理** — 所有材質定義在 `lib/materials.ts`，嚴禁在元件中硬編碼材質。
8. **圖示統一使用 SVG** — 所有前端 UI（包含 Admin Panel、QuickAddPanel 等面板）的圖示必須使用 inline SVG（`<svg>` 標籤），**嚴禁使用 Emoji** 作為介面圖示。參考 `AdminControls.tsx` 中現有的 SVG icon 風格（`w-4 h-4`, `strokeWidth={1.8}`, `fill="none" stroke="currentColor"`）。
