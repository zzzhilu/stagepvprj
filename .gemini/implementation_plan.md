# IMPLEMENTATION PLAN - StagePV 渲染增強與材質系統

## Goal Description
增強 StagePV 平台的 3D 渲染品質與素材管理能力。

---

## Phase 1: AO 渲染與效能優化 [3/3] ✅ 已完成

- [x] 整合 N8AO 後處理效果（aoRadius=2, intensity=3, quality=medium）
- [x] 移除預設 MeshReflectorMaterial 地面，改用 meshStandardMaterial 優化效能
- [x] 調整 ContactShadows opacity (0.75→0.35) 避免與 AO 疊加過重

### 技術決策
- multisampling 從 4→0，因 N8AO 已包含自身抗鋸齒
- 保留 ContactShadows 與 N8AO 並存，提供多層次陰影效果
- 移除 reflectionMirror/Blur/Metalness store 狀態

---

## Phase 2: 擴充媒體格式支持 [2/2] ✅ 已完成

- [x] ClientUploader 新增圖片格式：WebP/AVIF/GIF/SVG/BMP；影片新增 MOV
- [x] R2VideoManager 更新錯誤提示包含 MOV 格式

---

## Phase 3: 自訂材質球系統架構 [0/5] 🔲 待開發

目標：允許用戶上傳材質貼圖並調整 PBR 參數，替換或增強模型表面效果。

### 3.1 材質資料模型
- [ ] 在 `useStore.ts` 中定義 `MaterialSlot` 介面
  - diffuseMap, normalMap, roughnessMap, metalnessMap (Optional Blob URLs)
  - roughness, metalness, emissive, emissiveIntensity (PBR 浮點參數)
  - color (hex string)
  - name (用戶自訂名稱)

### 3.2 材質上傳器 UI
- [ ] 建立 `MaterialEditor.tsx` 組件
  - 貼圖上傳區（拖放 + 點擊，支持 PNG/JPG/WebP）
  - PBR 參數滑桿（roughness 0-1, metalness 0-1, emissive intensity 0-5）
  - 色彩選擇器（diffuse color）
  - 即時預覽球

### 3.3 材質應用引擎
- [ ] 更新 `materials.ts` 或建立 `materialEngine.ts`
  - BlobURL → TextureLoader → MeshStandardMaterial
  - 支持對單一 mesh 或整個模型套用材質
  - 記憶體管理：dispose textures on material swap

### 3.4 材質持久化
- [ ] Firestore 存儲材質配置（不含貼圖二進位）
  - 貼圖可選上傳至 R2（可擴展，非首階段必要）

### 3.5 預設材質庫
- [ ] 內建 5-10 組常用材質預設
  - 金屬、木紋、布料、磨砂、亮面等

---

## Image Progress & R2 Sharing（既有功能規劃）

### R2 Upload Flow
1. Frontend calls `/api/r2-upload` with filename
2. API generates presigned PUT URL (valid 10 min)
3. Frontend uploads directly to R2
4. Frontend saves video metadata (URL, name) to Firestore

### Share Link Format
`/share/[projectId]?video=[videoId]`

---

## Verification Plan

### 自動測試
- `npm run build` 確認無 TypeScript 錯誤
- 瀏覽器測試 AO 效果：載入測試模型確認陰影正確顯示

### 手動驗證
- 上傳各種格式檔案（WebP, AVIF, GIF, SVG, BMP, MOV）確認顯示
- 對比 AO 開啟/關閉效果差異
- 檢查效能：FPS 在 AO 開啟時不應大幅下降
