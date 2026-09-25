import { NextRequest, NextResponse } from 'next/server';
import { isAdminPassword, isValidAdminToken, makeAdminToken } from '@/lib/admin-auth-server';

/**
 * 管理員密碼驗證(server 端)。
 *
 * 為何在 server 端:前端的任何密碼比對(即使 hash)都會把密碼或 hash
 * 暴露在瀏覽器可下載的 JS 裡,開發者工具即可看到甚至繞過。
 * 把比對放在 server,密碼只存於 Vercel 環境變數 ADMIN_PASSWORD,
 * 前端 bundle 完全不含密碼。
 *
 * 設定:Vercel 環境變數新增 ADMIN_PASSWORD = 你的新密碼(token 簽發/驗證見 lib/admin-auth-server.ts)
 */
export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        if (typeof password !== 'string') {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        // 簡易節流:錯誤時延遲回應,稍微拖慢暴力嘗試
        if (!isAdminPassword(password)) {
            await new Promise(r => setTimeout(r, 600));
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        return NextResponse.json({ ok: true, token: makeAdminToken() });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}

// 驗證 token 是否有效(前端重新載入時用,避免每次重打密碼)
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    return NextResponse.json({ ok: isValidAdminToken(token) });
}
