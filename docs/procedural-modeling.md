# 向量建模(程序化場館)慣例

> 目標:場館不再下載 GLB,而是由「一組數字」在瀏覽器即時生成 → 零下載、秒開、檔案可 diff。
> 參考對象:3dome.tw(臺北大巨蛋模擬)整個場館 0 個模型檔,3D 部分總傳輸約 215KB。

## 1. 架構

```
src/lib/procedural/
├── types.ts            # ProcVenueSpec / ProcPart 資料格式(純數字)
├── build.ts            # spec → 合併幾何(同材質一個 mesh)+ 座椅 InstancedMesh
├── index.ts            # PROC_PREFIX、isProceduralPath、getProceduralVenue
└── venues/
    ├── index.ts        # PROCEDURAL_VENUES 清單(新增場館要登記在這裡)
    └── <id>.ts         # 各場館 spec,例如 tmc.ts(北流)
src/components/canvas/
├── ProceduralVenueRenderer.tsx  # 渲染器(renderMode / 完美渲染 / 釋放資源)
└── pick-renderer.ts             # model_path → 渲染器(三處 SceneGraph 共用)
scripts/measure-glb.mjs          # 從參考 GLB 量尺寸
```

## 2. 儲存方式(不動同步系統)

- 物件存成一般的 `StageObject`:`model_path = '__proc__:<id>'`、`type = 'venues'`。
- 只有「參照」被同步到 Firestore,幾何永遠由程式產生 → **不需要改 auto-save/載入四處**。
- ⚠️ `id` 一經發布**不可改名**,否則舊專案找不到場館(會顯示橘色線框警示,不會崩潰)。
- 要改場館形狀 → 直接改 spec。所有使用該場館的專案下次開啟就會套用新形狀。

## 3. 座標與單位

- 公尺;Y 向上;`y = 0` 為場地地面。
- 平面座標 `Vec2 = [x, z]`(俯視),與世界座標一致。
- 程序化物件的 instance scale 為 `[1,1,1]`(**不套用** GLB 的 Z 反轉慣例)。
  用 `measure-glb.mjs --flip-z` 量參考 GLB,量到的座標即可直接寫進 spec。

## 4. 部件(ProcPart)

| kind | 用途 | 主要參數 |
|---|---|---|
| `box` | 柱子、控台、箱體 | `center`、`size`、`rotY` |
| `slab` | 地板、舞台面、樓板、屋頂 | `polygon`(俯視輪廓)、`y`、`thickness` |
| `wall` | 牆 | `path`、`closed`、`y`、`height`、`thickness` |
| `tiers` | 階梯看台(可含座椅);也可當「沿折線的一圈帶狀體」用(例:天花環帶) | `path`(第一排前緣)、`side`、`y`、`rows`、`rowDepth`、`riserHeight`、`baseY`、`clip`、`seats` |

輔助函式:`arc(center, r, a0, a1, segs)` 產生弧線、`rect(cx, cz, w, d)` 產生矩形、`offsetPolyline`。

`tiers.side`:看台往折線的哪一側延伸(1 = 行進方向左側)。弧形看台常用 `side: -1`,讓看台往外擴。
座椅會自動面向前緣方向(舞台)。

`tiers.baseY`:省略 = 每排只往下多一階(懸挑樓座);`0` = 實心落地;`[前, 後]` = 斜向底面(樓座下方的斜天花)。
`tiers.clip`:俯視**凸**多邊形,看台只保留範圍內的部分(弧形看台切齊側牆);座椅也只擺在範圍內。

## 7. 範例:北流表演廳(`venues/tmc.ts`)

原 GLB 1.2MB / 28,686 三角形 → 向量版 0 下載 / 約 15,500 三角形 + 3,858 張座椅(InstancedMesh),4 次 draw call,生成約 55ms。
量測方式:`measure-glb.mjs` 取高度分佈,再以 x=0、x=-15、y=1/5/10/15/20.3、z=5 切片取剖面,紅黑疊圖比對。

## 5. 效能規則

1. **同材質自動合併**:部件數量不影響 draw call,材質種類才會。一個場館控制在 **≤ 6 種材質**。
2. **座椅一律用 `tiers.seats`**(InstancedMesh):上萬張也只有 1 次 draw call。不要用 `box` 一張張擺。
3. 弧線 `segments` 夠用就好(24~48)。遠看的造型寧可少段數。
4. 生成在 `useMemo` 內只做一次;替換或卸載時自動 dispose(椅子幾何為全域共用單例)。

## 6. 從 GLB 復刻場館的流程

1. 取得參考 GLB,執行 `node scripts/measure-glb.mjs venue.glb --flip-z --json venue-measure.json`。
2. 從「水平面高度分佈」讀出地板、舞台、每階看台與樓座的高度;從 mesh 包圍盒讀出平面範圍。
3. 在 `venues/<id>.ts` 用部件描述,並把參考來源與誤差寫進 `reference` 欄位。
4. 在 `venues/index.ts` 登記,後台「快速新增 → 場館模板」就會出現。
5. 驗證:與原 GLB 疊在同一場景比對(原 GLB 用 wireframe),主要尺寸誤差目標 < 0.2m。
