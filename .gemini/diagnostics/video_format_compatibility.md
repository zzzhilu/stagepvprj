# 視頻格式兼容性指南

## 🎬 問題確認

**用戶報告：** MP4 壓縮格式導致視頻無法播放

這是一個常見問題！不是所有的 MP4 文件都能在瀏覽器中播放。瀏覽器對視頻編碼格式有特定要求。

---

## 📊 瀏覽器支持的視頻格式

### 最佳兼容性（推薦）✅

**容器格式：** MP4  
**視頻編碼：** H.264 (AVC)  
**音頻編碼：** AAC  

**兼容性：** 
- ✅ Chrome/Edge/Safari/Firefox
- ✅ iOS/Android
- ✅ 所有現代瀏覽器

### 其他支持的格式

| 格式 | 編碼 | 兼容性 | 推薦 |
|------|------|--------|------|
| **MP4** | H.264 (AVC) | 最佳 | ⭐⭐⭐⭐⭐ |
| **WebM** | VP8/VP9 | 良好（Safari 較差） | ⭐⭐⭐⭐ |
| **WebM** | AV1 | 新格式（部分支持） | ⭐⭐⭐ |
| **MP4** | H.265 (HEVC) | 僅部分瀏覽器 | ⭐⭐ |
| **OGG** | Theora | 舊格式（不推薦） | ⭐ |

### ❌ 常見不兼容的編碼

- **H.265/HEVC** - 需要授權，大多數瀏覽器不支持
- **MPEG-2** - 舊格式，不支持
- **ProRes** - 專業格式，不支持
- **AV1** - 新格式，支持有限
- **自定義編碼** - 不支持

---

## 🔍 如何檢查視頻編碼格式

### 方法 1：使用 VLC Media Player

1. 下載安裝 [VLC Player](https://www.videolan.org/)
2. 打開您的視頻文件
3. 工具 → 媒體資訊 (Ctrl+I)
4. 查看「編碼器」欄位

**應該看到：**
```
視頻編解碼器: H264 - MPEG-4 AVC (part 10) (h264)
音頻編解碼器: MPEG AAC Audio (mp4a)
```

### 方法 2：使用 MediaInfo

1. 下載安裝 [MediaInfo](https://mediaarea.net/en/MediaInfo)
2. 打開您的視頻文件
3. 查看詳細信息

**範例輸出：**
```
格式: MPEG-4
格式設定檔: Base Media
編解碼器ID: isom (isom/iso2/avc1/mp41)
...
視頻
ID: 1
格式: AVC
格式/資訊: Advanced Video Codec
格式設定檔: High@L4
```

### 方法 3：使用 FFprobe (命令行)

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 video.mp4
```

**應該輸出：** `h264`

---

## 🔧 視頻轉換方法

如果您的視頻格式不兼容，需要轉換為瀏覽器支持的格式。

### 方法 1：使用 FFmpeg（推薦）

**安裝 FFmpeg：**
- Windows: `winget install ffmpeg` 或從 [ffmpeg.org](https://ffmpeg.org/) 下載
- Mac: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

**轉換命令：**

#### 標準轉換（推薦）
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k output.mp4
```

#### 高質量
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k output.mp4
```

#### 壓縮更小（適合網頁）
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 96k output.mp4
```

#### 轉換為 WebM
```bash
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus output.webm
```

**參數說明：**
- `-c:v libx264` - 使用 H.264 編碼器
- `-preset medium` - 編碼速度（fast/medium/slow）
- `-crf 23` - 質量（18=高質量，28=低質量）
- `-c:a aac` - 使用 AAC 音頻編碼器
- `-b:a 128k` - 音頻比特率

### 方法 2：使用 HandBrake（GUI 工具）

1. 下載安裝 [HandBrake](https://handbrake.fr/)
2. 打開視頻文件
3. 選擇預設：**Web → Gmail Large 3 Minutes 720p30**
4. 點擊「開始編碼」

**推薦設置：**
- 容器：MP4
- 視頻編碼器：H.264 (x264)
- 幀率：Same as source (VFR)
- 質量：RF 23（或更低以獲得更好質量）
- 音頻編碼器：AAC (CoreAudio)

### 方法 3：線上轉換工具

**推薦工具：**
- [CloudConvert](https://cloudconvert.com/mp4-converter) - 免費，高質量
- [FreeConvert](https://www.freeconvert.com/video-converter) - 簡單易用

**設置：**
1. 上傳視頻
2. 選擇輸出格式：MP4
3. 高級設置：
   - 視頻編碼器：H.264
   - 音頻編碼器：AAC
4. 轉換並下載

---

## 📋 推薦的視頻設置（用於 Web）

### 標準設置
```
容器: MP4
視頻編碼: H.264 (AVC)
音頻編碼: AAC
解析度: 1920x1080 或 1280x720
幀率: 30fps 或 60fps
比特率: 5-10 Mbps (1080p) / 2.5-5 Mbps (720p)
音頻比特率: 128-192 kbps
```

### 高質量設置（舞台預覽）
```
容器: MP4
視頻編碼: H.264 High Profile
解析度: 1920x1080
幀率: 60fps
比特率: 10-15 Mbps
CRF: 18-20
音頻: AAC 192kbps
```

### 壓縮設置（節省空間）
```
容器: MP4
視頻編碼: H.264 Main Profile
解析度: 1280x720
幀率: 30fps
比特率: 2-4 Mbps
CRF: 25-28
音頻: AAC 96-128kbps
```

---

## 🎯 最佳實踐

### 1. 使用 H.264 編碼

這是**唯一可以保證跨平台兼容**的編碼格式。

### 2. 避免使用 H.265/HEVC

雖然壓縮效率更高，但瀏覽器支持有限，不適合 Web 使用。

### 3. 控制檔案大小

**建議上傳限制：**
- 最大檔案大小：100 MB
- 最大解析度：1920x1080
- 最大長度：5 分鐘

**優化方法：**
- 降低解析度（720p 通常足夠）
- 降低幀率（30fps 對大多數內容足夠）
- 調整 CRF 值（23-28）

### 4. 測試兼容性

轉換後，在以下瀏覽器測試：
- ✅ Chrome
- ✅ Safari (iOS)
- ✅ Firefox
- ✅ Edge

### 5. 提供後備格式（可選）

如果需要最佳兼容性，可以同時提供 MP4 和 WebM：

```html
<video controls>
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  您的瀏覽器不支持視頻播放。
</video>
```

---

## 🔍 快速診斷視頻問題

### 問題：視頻無法播放

**檢查步驟：**

1. **檢查編碼格式**
   ```bash
   ffprobe video.mp4
   ```
   確認顯示 `h264` 或 `avc1`

2. **測試視頻**
   - 在瀏覽器中直接打開視頻文件
   - 如果可以播放 → 應用代碼問題
   - 如果無法播放 → 格式問題

3. **檢查控制台錯誤**
   - F12 → Console
   - 查找視頻相關錯誤

4. **嘗試轉換**
   ```bash
   ffmpeg -i problematic.mp4 -c:v libx264 -c:a aac fixed.mp4
   ```

---

## 📦 FFmpeg 轉換腳本範例

### Windows 批次處理（.bat）

```batch
@echo off
echo 視頻格式轉換工具
echo.

set /p input="輸入來源視頻檔名: "
set output=%~n1_converted.mp4

echo.
echo 正在轉換...
ffmpeg -i "%input%" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k "%output%"

echo.
echo 轉換完成！輸出檔案: %output%
pause
```

### macOS/Linux 腳本（.sh）

```bash
#!/bin/bash

echo "視頻格式轉換工具"
echo ""

read -p "輸入來源視頻檔名: " input
output="${input%.*}_converted.mp4"

echo ""
echo "正在轉換..."
ffmpeg -i "$input" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k "$output"

echo ""
echo "轉換完成！輸出檔案: $output"
```

使用方法：
```bash
chmod +x convert.sh
./convert.sh
```

---

## ✅ 驗證清單

轉換後，確認以下項目：

- [ ] 使用 VLC 或 MediaInfo 確認編碼為 H.264
- [ ] 音頻編碼為 AAC
- [ ] 在 Chrome 瀏覽器中可以直接播放
- [ ] 在 Safari/iOS 中可以播放
- [ ] 檔案大小合理（< 100 MB）
- [ ] 上傳到 R2 後可以在應用中播放

---

## 💡 常見問題

### Q: 為什麼我的 MP4 無法播放？

A: MP4 只是容器格式，內部的視頻編碼才是關鍵。確保使用 H.264 編碼。

### Q: H.265 不是壓縮更好嗎？

A: 是的，但瀏覽器支持有限。Web 應用建議使用 H.264。

### Q: WebM 和 MP4 哪個更好？

A: MP4 + H.264 兼容性最好。WebM 在 Safari 支持較差。

### Q: 如何減小視頻檔案大小？

A: 
1. 降低解析度（720p 而不是 1080p）
2. 降低幀率（30fps 而不是 60fps）
3. 增加 CRF 值（23 → 28）
4. 降低音頻比特率（128kbps → 96kbps）

### Q: 轉換會損失質量嗎？

A: 重新編碼會有輕微質量損失。使用 CRF 18-23 可以保持良好質量。

---

**最後更新：** 2026-02-03  
**關鍵發現：** MP4 編碼格式導致播放失敗  
**解決方案：** 轉換為 H.264 編碼的 MP4  
**推薦工具：** FFmpeg, HandBrake  
