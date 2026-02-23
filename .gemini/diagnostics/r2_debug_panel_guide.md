# R2 視頻診斷工具使用指南

## 📌 概述

為了幫助診斷影像進度功能中的 R2 視頻管理問題，我創建了一個診斷面板組件。

## 🔧 如何啟用診斷面板

### 方法 1：臨時添加到頁面（推薦用於調試）

1. 打開文件：`src/app/video-progress/[id]/page.tsx`

2. 在文件頂部添加導入：
```typescript
import { R2VideoDebugPanel } from '@/components/debug/R2VideoDebugPanel';
```

3. 在 `return` 語句中添加組件（建議放在最後）：
```typescript
return (
    <main className="relative w-full h-full">
        {/* Admin Controls with video-progress mode */}
        <AdminControls ... />
        
        {/* Client Controls */}
        <ClientControls />
        
        {/* ... 其他組件 ... */}
        
        {/* Debug Panel - 僅在開發模式下顯示 */}
        {process.env.NODE_ENV === 'development' && <R2VideoDebugPanel />}
    </main>
);
```

4. 重啟開發服務器後，在頁面右下角會看到一個黃色的「🔧 診斷」按鈕

## 📊 診斷面板功能

點擊「🔧 診斷」按鈕後，會看到一個診斷面板，顯示：

### 1. R2Videos 狀態
- 顯示所有上傳的 R2 視頻
- 包含：檔案名、ID、URL、上傳時間

### 2. ContentTextures 狀態
- 顯示所有內容紋理
- 區分 R2 視頻和其他類型

### 3. 當前播放內容
- 顯示正在播放的內容 ID

### 4. 數據同步檢查
- ✅ R2Videos 有數據
- ✅ R2 ContentTextures 存在
- ✅ 數據同步狀態（兩者數量應該一致）

### 5. 操作按鈕
- **📋 輸出到 Console**：將診斷數據輸出到瀏覽器控制台
- **📄 複製 JSON**：將診斷數據複製為 JSON 格式

## 🐛 診斷步驟

### 第一步：開啟診斷面板
1. 進入影像進度專案編輯頁面
2. 點擊右下角的「🔧 診斷」按鈕

### 第二步：上傳影片前的狀態檢查
- 檢查 R2Videos 數量（應該顯示已有的視頻）
- 檢查數據同步狀態

### 第三步：上傳影片
1. 上傳一個測試影片
2. 觀察診斷面板的變化

### 第四步：驗證數據更新
上傳成功後，診斷面板應該顯示：
- ✅ R2Videos 數量增加 1
- ✅ R2 ContentTextures 數量增加 1
- ✅ 數據同步：正常
- 新視頻的詳細信息（檔案名、ID、URL、時間）

### 第五步：檢查 Console 輸出
1. 點擊「📋 輸出到 Console」
2. 打開瀏覽器開發者工具 (F12) → Console
3. 查看詳細的數據結構

## ⚠️ 問題排查

### 問題 A：上傳後 R2Videos 數量沒有變化
**可能原因：**
- Zustand store 更新失敗
- `addR2Video()` 沒有被調用

**排查步驟：**
1. 檢查瀏覽器 Console 是否有錯誤
2. 點擊「📋 輸出到 Console」查看當前狀態
3. 刷新頁面後再次檢查

### 問題 B：R2Videos 有數據但 ContentTextures 沒有
**可能原因：**
- `addContentTexture()` 調用失敗
- ContentTexture 創建邏輯有問題

**排查步驟：**
1. 查看 R2VideoManager.tsx 的 handleFileSelect 函數
2. 確認 addContentTexture 是否被正確調用

### 問題 C：數據同步不一致
**可能原因：**
- R2Videos 和 ContentTextures 數量不匹配
- 某些視頻只有一邊的數據

**排查步驟：**
1. 點擊「📄 複製 JSON」
2. 比對兩個陣列的內容
3. 找出缺失的數據項

## 🔄 重置測試環境

如果需要從頭開始測試：

1. 打開瀏覽器 Console (F12)
2. 執行：
```javascript
localStorage.clear()
```
3. 刷新頁面
4. 重新進入專案

## 📝 記錄問題

如果問題仍然存在，請記錄以下信息：

1. **診斷面板截圖**（上傳前後對比）
2. **Console 輸出**（點擊「📋 輸出到 Console」後的數據）
3. **Network 請求**（開發者工具 → Network → 過濾 "r2-upload"）
4. **Firestore 數據**（Firebase Console 中的專案文檔）

## 🗑️ 移除診斷面板

測試完成後，記得移除診斷組件：

1. 刪除導入語句：
```typescript
import { R2VideoDebugPanel } from '@/components/debug/R2VideoDebugPanel';
```

2. 刪除組件渲染：
```typescript
{process.env.NODE_ENV === 'development' && <R2VideoDebugPanel />}
```

---
*創建時間: 2026-02-03*
*用途: 診斷 R2 視頻管理問題*
