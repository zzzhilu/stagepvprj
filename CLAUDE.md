# StagePV — 3D 舞台視覺預覽系統 (AI Context)

> 給 AI 編碼助手的專案脈絡。改 code 前必讀「同步系統」與「慣例與地雷」。
> 商業定位:演唱會前期的「語境對齊工具」,對標 Syncronorm Depence / disguise d3 的網頁版前期工作流。已商業化(專案計費),使用者含付費同行。

## 1. 專案是什麼

- **管理端(後台)**:`/free-test/[id]` — 上傳 GLB、材質、燈光、機關(rigs)、LED 排列、Cue、攝影機視角(含焦距)、客戶編輯密碼,auto-save 到 Firestore。
- **客戶端**:`/share/[id]` 分享頁(唯讀+客戶編輯模式)與 free-test 的 client 視圖 — 切視角、上傳內容/攝影機訊號上 LED、切排列、調機關、輸入密碼後可編輯 cue/視角並儲存。
- 部署:GitHub `zzzhilu/stagepvprj` → Vercel 自動部署(**使用者 push 極頻繁,永遠先 clone 最新 main 再動工**)。

## 2. 技術棧

Next.js 16 App Router / React 19 / TS;three.js r182 + R3F v9 + drei v10 + @react-three/postprocessing;Zustand 5 + persist(localStorage `stage-preview-storage`);Firebase Storage(GLB)+ Firestore(`projects`)+ Cloudinary(HLS)+ R2 + Google Drive 影片;Draco(`/api/compress-glb`);hls.js / FFmpeg WASM / MediaRecorder;Tailwind 4。

## 3. 路由與權限

| 路由 | 用途 |
|---|---|
| `/free-test/[id]` | 後台主頁(admin/client 模式切換,`isShareMode`);auto-save 2s debounce |
| `/share/[id]` | 客戶分享頁(Firestore 載入;含客戶編輯模式) |
| `/video-progress/[id]` | 影像進度頁(cue/影片檢視,無 LED 排列) |
| `/simulation?p={id}` | 舊版客戶分享頁(仍存在,新專案用 `/share/[id]`) |
| `/api/admin-auth` | 後台密碼驗證(⚠️ 仍有 `'0903'` fallback 待移除,Vercel env `ADMIN_PASSWORD`) |
| `/api/{upload,compress-glb,sign-cloudinary}` | Cloudinary 上傳 / Draco 壓縮 / 簽名(無伺服器端驗證) |

⚠️ **安全現況**:Firestore 前端直寫、無 Security Rules;客戶編輯密碼為 SHA-256 雜湊(UI 層門檻)。商業化中,規則層是已知待辦——但**不要未經要求擅自重構驗證機制**。

## 4. 核心資料模型(`src/store/useStore.ts`,~1300 行)

```ts
type ModelType = 'venues'|'stage'|'static_LED'|'moving_LED'|'moving_prop'|'basic_camera'|'floor_plan'|'prop'|'band';
// StageObject: id, model_path, material_id, instances[], type, meshNames?, ledResolution?
// CameraView: id, name, camera:{position,target,fov,focalLength?}, thumbnail_url?, order
//   焦距 ↔ FOV(35mm full-frame): fov = 2·atan(12/f)·180/π;focalToFov/fovToFocal 在 useStore
// RigControl: id,name,targetType('null'|'object'),targetId,type(rotation|translation|visibility),axis,min,max,defaultValue,color?,group?
// NullNode: 場景層級節點(機關軸心),可巢狀
// Cue: id,name,order,transforms,lightStates,rigValues 快照;LedLayout: id,name,canvasW/H,rects{objectId:{x,y,w,h,enabled}}
```

### 🔥 同步系統(最大地雷區)— 三條路徑,缺一即 bug

1. **localStorage persist(`partialize`)**:僅本機持久化白名單,**不等於**雲端同步。
2. **Firestore 同步**:`free-test/[id]` 的 auto-save payload(~264 行)+ 載入還原(~213 行)+ `share/[id]` 載入還原 + `ProjectState` interface(project-service.ts)。**新增跨端欄位四處都要加。**
3. **runtime-only(絕不同步)**:`rigValues`(當前機關值)、`objectBounds`、`clientLayoutOverride`、`screenCropOverride`、`cameraStreamMode/Active`、`showCameraModels`、`clientEditMode`、`hoveredObjectName`。

客戶編輯儲存走 `ProjectService.updateProject(id, {cues, views})` **部分更新白名單** — 絕不可讓客戶端全量覆蓋專案。

## 5. 檔案地圖(新增/關鍵)

```
lib/
├── rig-utils.ts          # rigDelta(略過 visibility)、rigVisibility(AND)、BOUNDS_FEATURES 27 特徵點
├── client-auth.ts        # sha256Hex(Web Crypto)— 客戶編輯密碼雜湊
├── parallax-envmap.ts    # parallax 校正反射:共享 uniforms + onBeforeCompile 注入(r182 chunk 字串敏感)
├── device.ts / quality.ts / ktx2.ts  # 行動偵測 / 品質分級 / KTX2(ENABLE_KTX2=1 才啟用)
components/canvas/
├── Scene.tsx             # 動態 frameloop:(影片播放)||攝影機直播||錄影||gizmo||完美渲染||紙片人擺放||walk ? always : demand
│                         # RigInvalidator:rigValues 變化 → invalidate(3D 端不訂閱 rigValues 的配套)
├── SceneGraph.tsx        # 相機(near.1/far5000)+OrbitControls(maxDist500)+CubeCamera(128,far300,每12幀)
│                         # 後製:完美渲染=N8AO+Bloom+SMAA+ToneMapping+Vignette;普通=bloomIntensity>0 才掛 Bloom composer
├── StageObjectRenderer.tsx # 材質/貼圖/UV/機關動畫核心(見地雷 11-14)
├── CameraMarkers.tsx     # 3D 機位模型(⚠️ Object3D.lookAt 是 +Z 朝目標,幾何畫在 +Z 側)
├── VideoManager.tsx      # 全域 <video>;cameraStreamMode: webcam(getUserMedia 4K ideal)|screen(getDisplayMedia,含 ended 自動關)
admin/
├── RigEditor.tsx         # 機關編輯(visibility 型/8色/群組/拖拉排序/Null 對齊 27 特徵點)
├── LedLayoutEditor.tsx   # 全螢幕排列編輯器(portal 需 mounted guard;背景對位圖 localStorage `led-layout-bg-{id}`,3MB)
├── CueManager.tsx        # cue 列表(雙擊改名 renameCue)
├── ClientEditPassword.tsx # 後台設客戶編輯密碼(掛在 videos 區塊)
├── ObjectHoverTooltip.tsx # hover 浮名(DOM transform 直改,不 setState)
client/
├── ClientEditGate.tsx    # 右上齒輪→密碼→編輯模式;儲存=部分更新;sessionStorage `stagepv_client_edit_{id}`
├── ClientLayoutSwitcher.tsx # 左上排列切換(runtime override)
├── ClientToolbar.tsx     # 攝影機訊號面板(webcam 清單+螢幕擷取)+裁切滑桿(step .005)
├── BottomLeftPanel.tsx   # 客戶 cue/視角列;編輯模式:改名/新增/更新 cue、擷取視角
├── RigPanel.tsx          # 客戶機關面板(群組聚合;數值雙擊鍵入,clamp min/max)
```

## 6. 慣例與地雷(改 code 前必讀)

1. **Z 軸反轉**:instance 預設 `scale:[1,1,-1]`,Z 鏡像、法線靠 DoubleSide 掩蓋。
2. **GLB node transform 被丟棄**:只取 geometry;pivot 必須在 DCC 烘進 geometry。旋轉機關軸心 = geometry 原點或用 Null。
3. **mesh 命名即分類**;`moving_LED` **與 `static_LED`** 上傳時均逐 mesh 拆成獨立物件(舊聚合 static LED 需重新上傳)。
4. 角度:store 弧度、UI 度。UI 文案繁中。刪除用長按。
5. **frameloop demand**:useFrame 動畫要確保有 invalidate 來源(機關靠 RigInvalidator;新增高頻動畫先想這條)。
6. COOP/COEP(FFmpeg WASM):新外部資源必須支援 CORS。
7. **LED 排列 UV**:`rectToUv` **Y 不翻轉**(`oy = rect.y/canvasH`,實測畫布上=貼圖上)。排列中未加入的 LED = 真黑屏(MeshBasicMaterial #000000,emissive 與 emissiveMesh 兩分支都處理),非橘色待機色。
8. **攝影機訊號 = 單純線路**:與內容共用同一 UV 路徑(排列優先→預設),無鏡像無鋪滿;`cameraStreamActive` 僅選紋理來源+跳過 targetNodeId。螢幕擷取裁切是**前置預處理**(cropScale/cropBase 與排列/預設 UV 組合,保留底部比例、左下對齊)。
9. **texture UV 用 mutate**:repeat/offset 是 uniform — clone 一次(換源時)+ dispose 舊 + effect 內 mutate;**絕不**因 UV 參數變化 clone/needsUpdate(GPU 重傳風暴)。
10. **CubeCamera 成本**:update = 全場景×6 面。128 解析度/far 300/每 12 幀是調校結果;**far 放大會爆炸**(4090 翻車實例)。
11. **零分配 useFrame**:模組級 `_tmp*` 臨時物件(單執行緒共享安全)+ `hasObjectRig` 快路徑 + 收斂跳過(distSq<1e-8)。新 useFrame 動畫遵循。
12. **訂閱瘦身模式**:高頻狀態(rigValues)3D 端用 useFrame+getState(transient)或「指紋字串 selector」(僅相關值變化才 re-render);全量訂閱陣列是效能反模式(stageObjects 目前仍全量,已知債)。
13. **lookAt 陷阱**:非 Camera 的 Object3D.lookAt 讓 **+Z** 朝目標。
14. **parallax-envmap**:注入點對 r182 chunk 字串 `reflectVec = inverseTransformDirection(...)`;three 升版要重驗。包圍盒每 60 幀自動算(venues 聯集)。
15. **getObjectDisplayName(undefined) 會 crash** — `leds.find()` 結果先 guard。

## 7. 開發工作流(與 AI 協作慣例)

- 交付形式:`git apply` patch → `/mnt/user-data/outputs/`;基於**最新 main** 生成並在乾淨 clone `git apply --check` 驗證。
- 建置驗證:`NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npx next build`。**複製來的 node_modules 會壞**("couldn't find next/package.json")→ 重新 `npm install`。
- **腳本改檔後必 grep 驗證落盤**(Python replace 靜默失敗與磁碟滿截斷都發生過);磁碟滿(ENOSPC)會截斷寫入 — 定期清舊 clone、檢查檔案尾部。
- 使用者 push 極頻繁:打包前先確認哪些改動已在 main,避免 patch 混入已上線內容。

## 8. 已知技術債 / 待辦

- Firebase Security Rules(商業化安全,最高優先)+ admin-auth `'0903'` fallback 移除
- stageObjects 全量訂閱(拖物件全場 re-render;修復需 parent 鏈追蹤,風險中)
- AdminControls 512 行單體(低優先)
- 資料版本化(客戶編輯回滾)、資產 30 天銷毀機制、動態浮水印
- 戰略方向:Depence 相機參數導出(Y-up→Z-up + Euler 順序 + CSV/JSON/MVR)、sightline 觀眾視點、LED pixel map 導出、陀螺儀 VCam — 見 stagepv-strategy-2026.md
