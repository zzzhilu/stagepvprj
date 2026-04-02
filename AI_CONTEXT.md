# 🤖 AI Context Index

> **生成時間:** 2026-03-30 11:55:00
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
│   ├── 📁 favicon-concepts
│   │   ├── concept-1-spotlight.svg
│   │   ├── concept-2-stage-box.svg
│   │   ├── concept-3-sp-monogram.svg
│   │   ├── concept-4-curtain.svg
│   │   ├── concept-5-eye-stage.svg
│   │   └── preview.html
│   ├── 📁 models
│   │   └── 📁 presets
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
│   │   ├── icon.svg
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

### 最近 Commits
```
feat: AO rendering, expanded media formats, ground optimization
d502655 feat: free-fly walk mode with wall collision (LED passthrough)
453a6f7 fix: read walkMoveInput via getState() in useFrame to fix stale closure on mobile joystick
c3047ac fix: robust touch detection for walk mode joystick on mobile
280058c style: replace all violet/purple with silver gradient across client UI
```

### 本次變更摘要

| 檔案 | 變更內容 |
|------|---------|
| `SceneGraph.tsx` | ✅ 加入 N8AO 後處理 (aoRadius=2, intensity=3, quality=medium)；移除預設反射地面 (MeshReflectorMaterial)，改用簡單 meshStandardMaterial 提高效能；移除 reflectionMirror/Blur/Metalness 狀態；multisampling 從 4→0 (避免與 N8AO 衝突) |
| `PerfectRenderEnvironment.tsx` | ✅ ContactShadows opacity 從 0.75→0.35 (避免與 AO 疊加過重) |
| `ClientUploader.tsx` | ✅ 擴充支持格式：圖片新增 WebP/AVIF/GIF/SVG/BMP；影片新增 MOV；更新 tooltip 與 accept 屬性 |
| `R2VideoManager.tsx` | ✅ 錯誤提示新增 MOV 格式說明 |

---

## 🏗️ 架構筆記

### 渲染管線 (Post-Processing)
```
EffectComposer (multisampling=0)
├── N8AO (aoRadius=2, intensity=3, quality=medium, halfRes=false)
├── Bloom (luminanceThreshold, intensity, radius)
├── SMAA
└── ToneMapping (ACES_FILMIC)
```

### 支持的上傳格式
- **圖片**: PNG, JPG, WebP, AVIF, GIF, SVG, BMP
- **影片**: MP4, MOV, WebM, M4V

### 關鍵技術決策
- N8AO 取代 baked AO map，提供即時環境遮蔽
- 移除 MeshReflectorMaterial 預設地面，減少 GPU draw calls 與 render target 開銷
- ContactShadows 與 N8AO 並存，降低 ContactShadows opacity 避免陰影過重
- multisampling 設為 0 因 N8AO 已包含自身的抗鋸齒處理

---

## 🧠 開發者認知 (Developer State)

| 項目 | 內容 |
|------|------|
| **當前進度** | AO 渲染已完成，擴充媒體格式已完成，地面渲染優化已完成 |
| **下次首要 TODO** | 建立自訂材質球系統架構（支援 diffuse/normal/roughness 貼圖上傳及 PBR 參數調整） |
| **未來開發事項** | 支援 Arena (Resolume) 透過 HLS 即時串流至 3D 空間 (OBS -> NGINX RTMP -> HLS)。線上環境需使用 Cloudflare Tunnel 或 Ngrok 提供 HTTPS 穿透以解決 Mixed Content 問題 (解法B)。 |
| **已解決問題** | AO 陰影顯示異常（透過調整 ContactShadows opacity + N8AO 參數解決）|

---

## 📌 AI 閱讀指南

> **你正在接手這個專案。** 請遵循以下規範：

1. **活躍工作區優先** — 只關注「🔄 活躍工作區」標示的檔案，不要越界掃描無關模組。
2. **開發者認知對齊** — 閱讀「🧠 開發者認知」了解當前暫停點與下次目標，以此為起點。
3. **結構僅供尋址** — 「📁 專案結構」用於定位檔案，而非逐一閱讀。優先閱讀 README 和入口檔。
4. **避免全局重構** — 除非明確要求，否則不要對專案進行大規模重構或修改無關文件。
5. **增量更新** — 完成開發後，重新執行此腳本更新上下文。
