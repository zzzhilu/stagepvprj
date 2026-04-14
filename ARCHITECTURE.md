### 核心系統定位
這是一個基於 Next.js (App Router) + React Three Fiber (R3F) 打造的「3D 舞台視覺預覽與專案管理系統」。平台允許使用者上傳影片或圖片內容，並將其即時對應到多個 3D 舞台的螢幕上，同時具備「模擬器(Editor)」、「分享頁面」及「後台管理」等功能。

### 核心技術棧
- **前端框架**：Next.js 15 (React 19) + TailwindCSS
- **3D 引擎**：React Three Fiber (R3F), Three.js, @react-three/drei
- **狀態管理**：Zustand (`src/store/useStore.ts`)
- **服務與儲存**：Google Drive API (轉發/存取影片)、Cloudflare R2 (上傳與播放影片)、Firebase (身份驗證、Firestore 資料庫)

### 重點路徑與功能模組對照

#### 1. 前台分享頁面 (`src/app/share/[id]`)
- **定位**：提供給客戶或外部人員的唯獨展示頁面，透過專屬 Token (如 `/share/stagepv_preview_xxx`) 存取。
- **畫面區域**：
  - `<Canvas>`: 分享用的純展示 3D 畫布。
  - `ClientPlaylistSidebar`: 右側播放清單面板，可以切換目前觀看影片/圖片內容。
  - 右下角動態浮水印：即時顯示專案名稱 - 目前播放檔案名稱。
- **資料流**：透過 `ProjectService.getProjectByShareToken` 向 Firestore 取得關聯的專案內容與媒體陣列。

#### 2. 後台與模擬器 (`src/app/simulation` & `src/app/admin`)
- **`/simulation`**：負責 3D 編輯與環境模擬的主要編輯器，包含左側工具欄（攝影機視角切換等），與右側控制列。
- **`/admin`**：後台，負責媒體上傳、專案參數管理。使用了多個子元件，如 `ContentInspector` 處理檔案的上傳 (Cloudflare R2) 與加入播放清單。

#### 3. 3D 渲染核心 (`src/components/canvas/`)
- 包裝所有 R3F 組件。
- **`Stage.tsx`**：主場景，導入場景模型（如鼓、吉他、主螢幕 `screen_main`、側螢幕等）。
- **`VideoScreen.tsx`**：處理影音或圖片作為材質，貼在 3D Mesh 上的核心元件。內部處理 `meshBasicMaterial` 綁定 `videoTexture`。

#### 4. 全域狀態庫 (`src/store/useStore.ts`)
所有跨元件溝通的腦袋：
- `activeContentId` / `contentTextures`：管理當前哪一部影片或圖片應該被當作 Texture 貼到螢幕上。
- `stageObjects`：保存所有場景佈景 / 螢幕的定義跟位置。
- `views` / `activeViewId`：存放攝影機的不同視角定義（Director、FOH、Stage等）。

#### 5. 資源供應 (`src/lib/`)
- `firebase.ts` / `project-service.ts`：專案與場景存檔的讀寫橋樑。
- `drive.ts`：處理如何將 Google Drive 的連結藉由 API 轉成前端能使用的串流並產生縮圖。
- `/api/drive/stream/[fileId]/route.ts`：Proxy API，處理跨域與 Header 轉換，讓 GDrive 影片能在 R3F 安全當作 Texture 播放。
