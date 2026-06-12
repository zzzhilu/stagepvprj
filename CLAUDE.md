# StagePV — 3D 舞台視覺預覽系統 (AI Context)

> 本文件是給 AI 編碼助手的專案脈絡。修改程式前請先讀完「架構」與「慣例與地雷」兩節。

## 1. 專案是什麼

StagePV 是一個有後台的**舞台模擬系統**:

- **管理端 (Admin)**:上傳舞台 GLB 模型、指定材質、設定燈光、儲存攝影機視角、上傳 LED 螢幕內容(圖片/影片),最後把整個場景打包成分享連結。
- **客戶端 (Client / Share)**:透過分享連結載入雲端專案,在受限的介面中切換視角、上傳自己的影像內容投到 LED 螢幕上預覽、錄影輸出。

部署:GitHub (`zzzhilu/stagepvprj`) → Vercel 自動部署。本機開發 `npm run dev`。

## 2. 技術棧

| 層 | 技術 |
|---|---|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript |
| 3D | three.js 0.182 / @react-three/fiber 9 / drei 10 / postprocessing (Bloom + SMAA) |
| 狀態 | Zustand 5 + `persist` middleware(localStorage key: `stage-preview-storage`) |
| 雲端 | Firebase Storage(GLB 模型)、Firestore(分享專案 `projects` collection)、Cloudinary(管理端圖片/影片,含 HLS 串流) |
| 模型處理 | Draco 壓縮(server route `/api/compress-glb`,gltf-transform + draco3dgltf) |
| 影音 | hls.js、FFmpeg WASM(客戶端轉檔)、MediaRecorder(錄影) |
| 樣式 | Tailwind CSS 4 |

## 3. 路由與權限

| 路由 | 用途 | 權限 |
|---|---|---|
| `/` | 入口頁(自由測試 / 影像進度) | 公開;點「自由測試」需密碼 |
| `/free-test` | 管理端主頁面(可切 admin/client 模式) | 密碼 `0903`,sessionStorage key `stagepv_admin_auth`;`?share=1` 可繞過密碼進入分享檢視 |
| `/simulation?p={id}&name={n}` | 客戶端分享頁,從 Firestore 載入專案 `{id}` | 公開,永遠無 admin |
| `/video-progress` | 影像進度追蹤(stub) | 公開 |
| `/api/upload` | Cloudinary 上傳(image/video/model) | 無驗證 |
| `/api/compress-glb` | Draco 壓縮 GLB(POST 二進位) | 無驗證 |
| `/api/sign-cloudinary` | Cloudinary 簽名 | 無驗證 |

⚠️ 密碼是硬編碼在 client bundle 的前端閘門,僅防君子;API routes 與 Firestore/Storage 規則未做伺服器端驗證。改動安全相關功能時要意識到這點,但**不要**未經要求擅自重構驗證機制。

## 4. 核心資料模型(`src/store/useStore.ts`)

```ts
type ModelType = 'venues' | 'stage' | 'static_LED' | 'moving_LED' | 'basic_camera';

interface Instance {
    pos: [number, number, number];
    rot: [number, number, number];   // 弧度 (radians)
    scale: [number, number, number]; // 預設 [1, 1, -1] — 見「地雷」
}

interface StageObject {
    id: string;            // `obj_${type}_${Date.now()}`
    model_path: string;    // Firebase Storage 下載 URL(或本機 blob URL)
    material_id: MaterialId;
    instances: Instance[];
    type: ModelType;
    meshNames?: string[];  // 從 GLB 過濾出的 mesh 名單
}

interface ContentTexture { id; name; file_path; type: 'image'|'video'; thumbnail_url?; file_size? }
interface CameraView { id; name; camera: { position; target; fov }; thumbnail_url?; order }
```

**狀態流**:`useStore` 是唯一真相來源。所有 UI(admin 面板、client 控制、3D 場景)都直接訂閱 store。

**持久化**(`partialize`):只持久化 `stageObjects / views / activeViewId / contentTextures / activeContentId` 到 localStorage。燈光、renderMode、影片播放狀態等 UI 狀態不持久化。

**分享流程**:`AdminControls.handleShare()` → `ProjectService.saveProject()` 把上述同一組欄位寫入 Firestore `projects` → 產生 `/simulation?p={docId}&share=true` 連結 → 客戶端 `loadState()` 整包還原。
👉 **任何想跨端同步的新欄位,必須同時加進:store state、`partialize`、`ProjectState` interface、`saveProject` payload、simulation 頁的 `loadState` 呼叫。**

## 5. 檔案地圖

```
src/
├── app/
│   ├── page.tsx                    # 入口頁 + 密碼 modal
│   ├── free-test/page.tsx          # 管理端(PasswordGate + AdminControls + Scene)
│   ├── simulation/page.tsx         # 客戶端分享頁(Firestore 載入)
│   ├── video-progress/page.tsx     # stub
│   └── api/{upload,compress-glb,sign-cloudinary}/route.ts
├── components/
│   ├── admin/
│   │   ├── AdminControls.tsx       # 右側 admin 面板骨架(分享、四個摺疊區塊)
│   │   ├── ModelUploader.tsx       # GLB 上傳 → Draco 壓縮 → mesh 名稱分類 → Firebase Storage
│   │   ├── TextureUploader.tsx     # 圖/影片 → Cloudinary(影片轉 HLS)
│   │   ├── LightingControls.tsx    # ambient/directional/bloom 滑桿
│   │   └── MaterialSelector.tsx    # 材質下拉
│   ├── client/
│   │   ├── ClientControls.tsx      # render mode 切換 + 隱藏 admin 入口
│   │   ├── ClientUploader.tsx      # 客戶端本機上傳內容(blob URL,不上雲)
│   │   ├── ViewSwitcher.tsx        # 左下視角縮圖列
│   │   ├── VideoControls.tsx       # 播放/音量/進度 + 錄影(MediaRecorder)
│   │   ├── TranscodeModal.tsx      # FFmpeg WASM 轉檔 UI
│   │   └── RenderModeSelector.tsx
│   ├── canvas/
│   │   ├── Scene.tsx               # <Canvas> 設定(動態 frameloop demand/always)
│   │   ├── SceneGraph.tsx          # 相機+OrbitControls+燈光+後製+物件迴圈
│   │   ├── StageObjectRenderer.tsx # GLB 載入(useGLTF+Draco)、材質、Instances 渲染
│   │   ├── VideoManager.tsx        # 全域 <video> 元素(hls.js),供 VideoTexture 取用
│   │   ├── CameraCapture.tsx       # 擷取當前相機 → CameraView
│   │   └── CameraTransition.tsx
│   ├── ui/{ErrorBoundary,LoadingOverlay}.tsx
│   └── ErrorBoundary.tsx
├── hooks/{useRecorder,useHlsTexture}.ts
├── lib/
│   ├── materials.ts                # MATERIAL_LIBRARY(4 種 PBR 材質)
│   ├── firebase.ts                 # env: NEXT_PUBLIC_FIREBASE_*
│   ├── project-service.ts          # Firestore save/load
│   ├── draco.ts                    # DRACOLoader 單例(gstatic CDN decoder)
│   └── transcode.ts                # FFmpeg WASM
└── store/useStore.ts               # ★ 全域狀態
```

## 6. 慣例與地雷(改 code 前必讀)

1. **Z 軸反轉**:每個 instance 預設 `scale: [1, 1, -1]`。處理位移/旋轉時要記得 Z 是鏡像的,世界座標 +Z 方向上的位移在模型本地座標是反的。負 scale 也會反轉面法線(目前靠 `THREE.DoubleSide` 掩蓋)。
2. **GLB node transform 被丟棄**:`StageObjectRenderer` 只取每個 mesh 的 `geometry`,用 `<Instances>` 渲染在 instance 的 transform 上;GLB 內 node 自身的 position/rotation/scale **不會被套用**。多部件模型必須在 DCC(Blender)裡 apply transform、把 pivot 烘到 geometry 上,否則部件會疊在原點。**旋轉類機關的軸心 = geometry 原點**,因此可動部件在建模時就要把 origin 放在樞紐處。
3. **mesh 命名即分類**:上傳的 GLB 依 mesh 名稱(含 `moving led` / `static led` / `stage` / `venue`,不分大小寫)拆成多個 `StageObject`;不符合命名規則的 mesh 會被忽略。
4. **角度單位**:Three.js / `Instance.rot` 用弧度;任何面向使用者的 UI 用「度」,寫入 store 前轉換。
5. **frameloop**:`Scene.tsx` 在 `demand` 與 `always` 間動態切換(影片播放或錄影時 always)。靜態互動(如拖滑桿改 transform)依賴 React 重渲染觸發 invalidate,通常 OK;若做 useFrame 動畫要記得 `invalidate()`。
6. **COOP/COEP headers**(`next.config.ts`):為 FFmpeg WASM 的 SharedArrayBuffer 開啟 `require-corp`,所有跨域資源(Firebase/Cloudinary/gstatic)必須支援 CORS;新增外部資源來源時注意。
7. **持久化白名單**:見第 4 節;新增需同步的欄位有五個地方要改。
8. **材質**:`emissive` 材質會吃 `activeContentId` 對應的貼圖當 emissiveMap(LED 螢幕原理);影片貼圖來自 `VideoManager` 的全域 `<video>` 元素。
9. **刪除互動慣例**:UI 中刪除採「長按」模式(`handleLongPressStart/End`),新刪除按鈕請沿用。
10. **語言**:UI 文案為繁體中文,程式註解中英混用。新 UI 文案用繁中。

---

## 7. 🚧 下一個功能:機關系統 (Rig System) — Null Parent 架構

### 目標

管理員在後台為模型定義「機關」(可動自由度):每個機關指定**旋轉或位移**、作用軸、**數值上下限**,並**自訂名稱**(如「升降台高度」「翼幕旋轉角」)。客戶端(分享頁)依設定自動生成控制面板,使用者只能在限制範圍內即時調整,變化直接反映在 3D 場景。

**核心架構決策:後台可建立 Null 空物件作為 parent。** Null 的位置即旋轉軸心,管理員可在引擎內自由設定軸心,不必回 DCC 修改模型 pivot 再重新上傳。這把系統從「對 instance 加偏移」升級為**場景層級 (scene hierarchy)**:Null 可巢狀、可同時掛多個子物件(例如一根 truss null 帶動整排 LED 板)。

### 資料模型(加入 `useStore.ts`)

```ts
// ===== Null 空物件(場景層級節點)=====
export interface NullNode {
    id: string;                    // `null_${Date.now()}`
    name: string;                  // 使用者命名,如「主升降軸」
    parentId: string | null;       // 掛在另一個 Null 底下(巢狀);null = 場景根
    pos: [number, number, number]; // 相對於 parent 的位置 = 旋轉軸心
    rot: [number, number, number]; // 基底旋轉(弧度)
}

// StageObject 新增欄位:
parentId?: string | null;          // 掛在哪個 Null 底下;undefined/null = 場景根
                                   // ⚠️ 一旦有 parent,instances[].pos/rot 即為「相對 parent 的本地座標」

// ===== 機關 =====
export type RigType = 'rotation' | 'translation';
export type RigAxis = 'x' | 'y' | 'z';

export interface RigControl {
    id: string;                    // `rig_${Date.now()}`
    name: string;                  // 「升降台高度」
    targetType: 'null' | 'object';
    targetId: string;              // NullNode.id 或 StageObject.id
    instanceIndex?: number;        // targetType === 'object' 時指定 instance
    type: RigType;
    axis: RigAxis;
    min: number;                   // translation: scene units(沿 parent 本地軸);rotation: 度
    max: number;
    step?: number;                 // 預設 translation 0.01 / rotation 1
    defaultValue: number;          // 須在 [min, max] 內
}

// store 新增 state / actions:
nulls: NullNode[];
rigs: RigControl[];
rigValues: Record<string, number>;   // rigId → 當前值(runtime)
addNull / updateNull / removeNull / setObjectParent
addRig / updateRig / removeRig / setRigValue / resetRigValues
```

**設計決策(重要):**

- **機關值是基底 transform 之上的偏移量 (delta)**。渲染時 `最終值 = 節點基底 pos/rot + 該節點所有機關偏移總和`。Admin 擺好的佈局不被客戶端污染,min/max 語意 = 相對行程。
- **典型用法**:旋轉機關掛在 Null 上(軸心 = Null 位置);簡單位移機關可以直接掛在物件 instance 上,不一定要建 Null。
- **同步範圍**:`nulls` + `rigs`(定義)要跨端同步 → 五個同步點全部要加(persist `partialize`、`ProjectState`、`saveProject` payload、simulation `loadState`,見第 4 節)。`rigValues` 不同步、不持久化,客戶端載入時以各 rig 的 `defaultValue` 初始化。
- **單位**:rotation 在 store/UI 全程用**度**,渲染時 `THREE.MathUtils.degToRad` 轉換;translation 用 scene units。Null 與機關的座標軸是 **parent 的本地軸**(根層 = 世界軸)。
- **Z 反轉**:`scale: [1,1,-1]` 只存在於 instance 葉節點,Null 層級不帶 scale,因此 Null 上的旋轉/位移數學是乾淨的——這也是優先把機關掛在 Null 上的理由之一。

### 世界座標 ↔ 本地座標轉換(UX 關鍵)

管理員把既有物件掛到 Null 底下時,**物件不能在畫面上跳動**。`setObjectParent` 必須做座標轉換:

```
掛載:   localPos = inverse(parentWorldMatrix) × worldPos(rot 同理,用四元數運算)
解除掛載: worldPos = parentWorldMatrix × localPos
```

由於 Null 只有 pos/rot(無 scale),用 `THREE.Object3D` 暫存節點 + `attach()` 語意實作即可(three.js 的 `Object3D.attach(child)` 原生就是「換 parent 但保持世界 transform」)。Null 巢狀時沿 parent 鏈累乘。

### 渲染整合

`SceneGraph.tsx` 從平面迴圈改為**樹狀遞迴渲染**:

```tsx
// 計算節點(Null 或 object instance)套用機關後的本地 transform
function rigOffset(targetType, targetId, instanceIndex?) {
    let dPos = [0,0,0], dRot = [0,0,0];
    for (const rig of rigs.filter(r => r.targetType === targetType && r.targetId === targetId
                                    && (targetType !== 'object' || r.instanceIndex === instanceIndex))) {
        const v = rigValues[rig.id] ?? rig.defaultValue;
        const a = { x:0, y:1, z:2 }[rig.axis];
        if (rig.type === 'translation') dPos[a] += v;
        else dRot[a] += THREE.MathUtils.degToRad(v);
    }
    return { dPos, dRot };
}

// 遞迴:每個 Null 渲染為 <group>,內含子 Null 與子 StageObject
function NullGroup({ node }: { node: NullNode }) {
    const { dPos, dRot } = rigOffset('null', node.id);
    return (
        <group position={add(node.pos, dPos)} rotation={add(node.rot, dRot)}>
            {nulls.filter(n => n.parentId === node.id).map(n => <NullGroup key={n.id} node={n} />)}
            {stageObjects.filter(o => o.parentId === node.id).map(o => <StageObjectRenderer key={o.id} object={o} />)}
            {isAdminMode && <axesHelper args={[1]} />}  {/* admin 模式顯示軸心輔助線 */}
        </group>
    );
}
```

根層渲染:`parentId == null` 的 Null 走 `NullGroup`,無 parent 的 StageObject 維持現狀。`StageObjectRenderer` 內的 `<Instance>` 同樣套用 `rigOffset('object', obj.id, i)`(物件級位移機關)。滑桿 → `setRigValue` → React 重渲染 → demand frameloop 自動重繪,不需手動 `invalidate()`。

### Admin UI

**`RigEditor.tsx`** — `AdminControls` 新增摺疊區塊「🎛️ 機關設定」(expandedSection union 加 `'rigs'`),內含三個子區:

1. **Null 管理**:
   - 「+ 新增 Null」→ 命名、設定 pos(數字輸入)、選 parent(下拉,排除自身與後代防循環)。
   - 便利功能:「對齊物件中心」按鈕(取目標物件 bounding box center 填入 pos)。
   - admin 模式下場景中以 `axesHelper` 顯示每個 Null 的位置與軸向,所選 Null 高亮。
2. **掛載關係**:每個 StageObject 一個 parent 下拉(無 / 各 Null);切換時呼叫 `setObjectParent` 做座標轉換。
3. **機關列表**:「+ 新增機關」→ 名稱、目標(Null 或物件 instance)、類型(旋轉/位移)、軸向、min/max/預設值;每筆附**即時預覽滑桿**(拖動直接驅動場景驗證行程);長按刪除(沿用慣例)。驗證:`min < max`、`defaultValue ∈ [min,max]`、名稱非空。

### Client UI:`RigPanel.tsx`

- 顯示條件:`rigs.length > 0`;掛進 `simulation/page.tsx` 與 `free-test` 的 share 分支。
- 每個機關一行:名稱 + 滑桿(min/max/step 來自定義)+ 數值(位移 `m` / 旋轉 `°`)+ 個別重置;頂部「全部重置」→ `resetRigValues`。
- 樣式沿用 client 語彙(`bg-black/40 backdrop-blur-sm rounded-lg`),建議右下角,行動裝置可摺疊。客戶端**看不到** Null 的 axesHelper。

### 實作順序

1. `useStore.ts`:`NullNode`/`RigControl` 型別、state、actions;`partialize` 加 `nulls`、`rigs`;`StageObject.parentId`。
2. `setObjectParent` 的世界↔本地座標轉換(用 `THREE.Object3D.attach` 語意,先寫單元可驗證的純函式)。
3. `SceneGraph.tsx` 樹狀渲染 + `rigOffset` + admin 模式 axesHelper。
4. 同步四件套:`ProjectState`、`saveProject`、simulation `loadState`(`nulls`/`rigs` fallback `[]`)、`rigValues` 初始化。
5. `RigEditor.tsx`(Null 管理 → 掛載 → 機關)掛進 `AdminControls`。
6. `RigPanel.tsx` 掛進 simulation / share 頁。
7. 測試:建 Null → 設軸心 → 掛物件(確認畫面不跳)→ 建旋轉機關 → 預覽滑桿 → 分享 → 無痕視窗驗證客戶端受限調整、重置、重新整理回預設值。

### 邊界情況

- **刪除 Null**:子物件與子 Null 重新掛回其 parent(座標轉換保持世界位置不變),指向它的 rigs 一併刪除;UI 要先 confirm。
- **刪除 StageObject**:`removeObject` 同步清除指向它的 rigs。
- **循環防護**:parent 下拉排除自身與全部後代。
- **舊專案**:Firestore 無 `nulls`/`rigs` 欄位 → `loadState` fallback `[]`,行為與現狀完全相同。
- **同一節點同軸多機關**:偏移相加(允許,RigEditor 可提示)。
- **效能**:Null 數量通常 < 20,遞迴 `<group>` 成本可忽略;rigOffset 在每次 store 更新時重算即可,不需 memo 過度優化。
