# R2 視頻管理 - 環境變數檢查清單

## 📋 必需的環境變數

為了讓 R2 視頻上傳功能正常工作，需要設置以下環境變數：

### 1. Cloudflare R2 配置

在 `.env.local` 或部署環境中設置以下變數：

```env
# Cloudflare R2 Account ID
R2_ACCOUNT_ID=your_account_id_here

# R2 API Token (訪問密鑰)
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here

# R2 Bucket Name (貯體名稱)
R2_BUCKET_NAME=your_bucket_name_here

# R2 Public URL (公開 URL - 需要配置自定義域名)
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-domain.com
```

## 🔍 如何獲取這些值

### R2_ACCOUNT_ID
1. 登入 Cloudflare Dashboard
2. 進入 R2 → Overview
3. 在右側欄看到 "Account ID"

### R2_ACCESS_KEY_ID 和 R2_SECRET_ACCESS_KEY
1. Cloudflare Dashboard → R2
2. 點擊 "Manage R2 API Tokens"
3. 創建新的 API Token
4. 選擇權限：
   - ✅ Object Read & Write
   - ✅ Object Delete (如果需要刪除功能)
5. 記錄 Access Key ID 和 Secret Access Key

### R2_BUCKET_NAME
1. Cloudflare Dashboard → R2
2. 查看或創建 Bucket
3. 使用 Bucket 的名稱

### NEXT_PUBLIC_R2_PUBLIC_URL
1. Cloudflare Dashboard → R2 → 您的 Bucket
2. Settings → Public Access
3. 配置自定義域名
4. 使用配置的域名，例如：`https://r2.yourdomain.com`

**注意：** 如果沒有自定義域名，也可以使用 R2 的自動生成 URL，但不推薦用於生產環境。

## ✅ 驗證環境變數

### 在開發環境中檢查

創建一個臨時的 API 路由來檢查環境變數是否正確設置：

**`src/app/api/check-env/route.ts`**
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
    const envCheck = {
        R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
        R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
        R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
        NEXT_PUBLIC_R2_PUBLIC_URL: !!process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    };

    const allSet = Object.values(envCheck).every(v => v === true);

    return NextResponse.json({
        status: allSet ? 'OK' : 'MISSING',
        variables: envCheck,
    });
}
```

訪問 `http://localhost:3000/api/check-env` 查看結果。

## ⚠️ 常見問題

### 問題 1：上傳失敗 - "Failed to get upload URL"

**可能原因：**
- R2 API Token 錯誤
- R2_ACCOUNT_ID 不正確

**解決方法：**
1. 重新生成 R2 API Token
2. 確認 Account ID 正確
3. 檢查 API Token 權限

### 問題 2：上傳成功但無法訪問影片

**可能原因：**
- NEXT_PUBLIC_R2_PUBLIC_URL 不正確
- Bucket 未配置公開訪問

**解決方法：**
1. 確認 R2 Bucket 的公開訪問設置
2. 檢查自定義域名是否正確配置
3. 測試 Public URL 是否可以訪問

### 問題 3：環境變數在生產環境中不生效

**可能原因：**
- 部署平台未設置環境變數
- 環境變數名稱拼寫錯誤

**解決方法：**

#### Vercel
1. Project Settings → Environment Variables
2. 添加所有必需的變數
3. 重新部署

#### 其他平台
查看對應平台的環境變數配置方法

## 🔒 安全建議

### 1. 永遠不要提交 .env.local 到 Git
```gitignore
# .gitignore
.env.local
.env*.local
```

### 2. 使用最小權限原則
- R2 API Token 只給必要的權限
- 定期輪換 API Token

### 3. 分離開發和生產環境
- 開發環境使用 `.env.local`
- 生產環境使用平台的環境變數管理

## 📝 環境變數範例

創建 `.env.local.example` 文件作為範本：

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_R2_PUBLIC_URL=

# Firebase Configuration (如果使用)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

團隊成員可以複製此文件為 `.env.local` 並填入實際值。

## 🔄 重啟開發服務器

**重要：** 修改環境變數後，必須重啟開發服務器才能生效！

```bash
# 停止當前服務器 (Ctrl+C)
# 重新啟動
npm run dev
```

## ✅ 檢查清單

在部署前，確認：

- [ ] 所有 R2 環境變數已設置
- [ ] API Token 權限正確
- [ ] Bucket 存在且可訪問
- [ ] Public URL 已配置
- [ ] 測試上傳功能正常
- [ ] 測試刪除功能正常
- [ ] 測試分享連結可訪問

---

**最後更新：** 2026-02-03  
**相關文件：** `src/app/api/r2-upload/route.ts`  
