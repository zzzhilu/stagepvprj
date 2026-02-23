# R2 視頻無法播放問題 - 診斷和修復指南

## 🎯 問題確認

**症狀：**
- ✅ 影片成功上傳到 Cloudflare R2
- ✅ 影片顯示在內容管理列表中
- ❌ 點擊「播放」按鈕無作用
- ❌ 分享給客戶端時無法播放

**根本原因分析：**

這個問題有**3個可能的原因**：

### 原因 1：R2 Bucket 的 CORS 設置未配置（最可能）⭐

R2 需要設置 CORS 才能讓瀏覽器播放視頻。

### 原因 2：R2 Public Access 未啟用

Bucket 可能沒有啟用公開訪問。

### 原因 3：視頻 URL 不正確

生成的 R2 URL 格式可能有問題。

---

## 🔧 修復步驟

### 步驟 1：檢查瀏覽器 Console 錯誤

1. 打開開發者工具 (F12)
2. 進入 Console 標籤
3. 點擊播放按鈕
4. 查看是否有以下錯誤：

**CORS 錯誤（最常見）：**
```
Access to video at 'https://your-r2-url...' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

**404 錯誤：**
```
GET https://your-r2-url... 404 (Not Found)
```

**其他網絡錯誤：**
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

### 步驟 2：配置 R2 Bucket CORS（最重要）⚠️

#### 方法 A：使用 Cloudflare Dashboard

1. 登入 Cloudflare Dashboard
2. 進入 **R2 → 您的 Bucket**
3. 點擊 **Settings** 標籤
4. 找到 **CORS Policy** 區塊
5. 點擊 **Edit CORS Policy**
6. 添加以下配置：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**重要：** 替換 `yourdomain.com` 為您的實際域名！

#### 方法 B：使用 Wrangler CLI（推薦）

如果您使用 Wrangler CLI，可以創建一個 CORS 配置文件：

**`cors-config.json`**
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

然後執行：
```bash
wrangler r2 bucket cors put YOUR_BUCKET_NAME --config cors-config.json
```

### 步驟 3：啟用 R2 Public Access

1. Cloudflare Dashboard → **R2 → 您的 Bucket**
2. 點擊 **Settings** 標籤
3. 找到 **Public Access** 區塊
4. 選擇以下其中一種方式：

#### 選項 A：使用自定義域名（推薦）

1. 點擊 **Connect Custom Domain**
2. 輸入您的子域名，例如：`cdn.yourdomain.com`
3. 完成 DNS 設置
4. 更新環境變數：
   ```env
   NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.yourdomain.com
   ```

#### 選項 B：使用 R2.dev 子域名（開發用）

1. 點擊 **Allow Access**
2. 選擇 **r2.dev subdomain**
3. 記下生成的 URL，例如：`https://pub-xxxxx.r2.dev`
4. 更新環境變數：
   ```env
   NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
   ```

⚠️ **注意：** r2.dev 子域名有請求限制，不建議用於生產環境。

### 步驟 4：驗證環境變數

確認 `.env.local` 中的 `NEXT_PUBLIC_R2_PUBLIC_URL` 正確設置：

```env
# 確保這個 URL 與步驟 3 中設置的一致
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-domain.com
```

**重要：** 修改環境變數後，必須重啟開發服務器！

```bash
# 停止服務器 (Ctrl+C)
npm run dev  # 重新啟動
```

### 步驟 5：測試視頻 URL

在瀏覽器中直接訪問視頻 URL 進行測試：

1. 從診斷面板或 Console 複製視頻的 `r2_url`
2. 在新標籤頁中打開這個 URL
3. 應該能夠直接播放或下載視頻

**如果無法訪問：**
- 檢查 Public Access 是否正確啟用
- 確認 URL 格式正確
- 檢查 Bucket 名稱是否正確

---

## 🧪 完整測試流程

### 測試 1：本地測試

1. 確認 CORS 和 Public Access 已設置
2. 重啟開發服務器
3. 進入影像進度專案
4. 點擊「播放」按鈕
5. 開發者工具 Console 應該沒有 CORS 錯誤
6. 視頻應該開始播放

### 測試 2：分享連結測試

1. 點擊影片的「分享」按鈕
2. 複製分享連結
3. 在**無痕模式**或新瀏覽器中打開連結
4. 視頻應該自動播放
5. 浮水印應該顯示：`專案名稱 - 影片檔名`

### 測試 3：跨域測試

如果您有部署的版本：

1. 從生產環境訪問分享連結
2. 確認視頻可以播放
3. 確認沒有 CORS 錯誤

---

## 🐛 常見問題排查

### 問題 A：CORS 錯誤仍然存在

**檢查項目：**

1. **CORS 配置是否生效？**
   - 在 R2 Dashboard 確認 CORS Policy 已保存
   - 可能需要等待幾分鐘才會生效

2. **AllowedOrigins 是否包含當前域名？**
   - 確認開發環境的 `http://localhost:3000` 已添加
   - 確認生產環境的實際域名已添加

3. **是否重啟了開發服務器？**
   - CORS 設置修改後，必須清除瀏覽器緩存或重啟

**解決方法：**
```bash
# 清除瀏覽器緩存
# 重啟開發服務器
ctrl+c
npm run dev
```

### 問題 B：視頻 URL 返回 404

**檢查項目：**

1. **URL 格式是否正確？**
   ```
   正確：https://cdn.yourdomain.com/videos/vid_xxxxx/filename.mp4
   錯誤：https://cdn.yourdomain.com//videos/vid_xxxxx/filename.mp4 (雙斜線)
   ```

2. **Bucket 名稱是否正確？**
   - 確認環境變數 `R2_BUCKET_NAME` 正確

3. **文件是否真的存在？**
   - 在 R2 Dashboard 查看 Bucket 內容
   - 確認文件路徑：`videos/vid_xxxxx/filename.mp4`

**調試方法：**

打開瀏覽器 Console，執行：
```javascript
// 查看當前活動視頻的 URL
console.log(useStore.getState().contentTextures);
```

### 問題 C：視頻加載但無法播放

**可能原因：**

1. **視頻格式不支持**
   - 確保是 MP4、WebM 等瀏覽器支持的格式
   - H.264 編碼的 MP4 兼容性最好

2. **視頻文件損壞**
   - 嘗試重新上傳

3. **視頻太大**
   - 建議視頻大小 < 100MB
   - 可以壓縮後再上傳

**測試方法：**

在 Console 執行：
```javascript
// 創建測試視頻元素
const video = document.createElement('video');
video.src = 'YOUR_R2_VIDEO_URL';
video.crossOrigin = 'anonymous';
video.play().then(() => {
    console.log('✅ 視頻可以播放');
}).catch(err => {
    console.error('❌ 播放失敗:', err);
});
```

---

## 📝 CORS 配置範例詳解

### 最寬鬆配置（開發環境）

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 生產環境配置（推薦）

```json
[
  {
    "AllowedOrigins": [
      "https://yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": [
      "Range",
      "Content-Type"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type",
      "Accept-Ranges"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

### 同時支持開發和生產

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## ✅ 成功檢查清單

完成以下所有項目後，視頻應該可以正常播放：

- [ ] R2 Bucket CORS 已配置
- [ ] R2 Public Access 已啟用
- [ ] `NEXT_PUBLIC_R2_PUBLIC_URL` 環境變數正確
- [ ] 開發服務器已重啟
- [ ] 可以直接訪問視頻 URL
- [ ] Console 沒有 CORS 錯誤
- [ ] 點擊播放按鈕有反應
- [ ] 分享連結可以播放視頻

---

## 🆘 仍然無法解決？

請提供以下信息：

1. **Console 錯誤截圖**
   - 點擊播放按鈕時的 Console 輸出

2. **Network 請求**
   - 開發者工具 → Network
   - 過濾視頻 URL
   - 截圖 Request/Response Headers

3. **環境變數**
   ```bash
   # 確認值已設置（不要分享實際的密鑰）
   echo $NEXT_PUBLIC_R2_PUBLIC_URL
   ```

4. **R2 設置截圖**
   - CORS Policy
   - Public Access 設置

---

**最後更新：** 2026-02-03  
**關鍵修復：** CORS 配置 + Public Access  
**預計修復時間：** 5-10 分鐘  
