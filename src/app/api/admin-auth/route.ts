import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * 管理員密碼驗證(server 端)。
 *
 * 為何在 server 端:前端的任何密碼比對(即使 hash)都會把密碼或 hash
 * 暴露在瀏覽器可下載的 JS 裡,開發者工具即可看到甚至繞過。
 * 把比對放在 server,密碼只存於 Vercel 環境變數 ADMIN_PASSWORD,
 * 前端 bundle 完全不含密碼。
 *
 * 設定:Vercel 環境變數新增 ADMIN_PASSWORD = 你的新密碼
 * 若未設定,fallback 到舊密碼以免鎖死(部署後請務必設定並移除 fallback)。
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0903';

// 簽發給通過驗證的 client 的 token(讓前端 sessionStorage 存這個,而非密碼)
// 用密碼衍生,密碼一改 token 即失效。非高安全等級,但足以防「扒前端看明文」。
function makeToken(pw: string): string {
    const secret = process.env.AUTH_SECRET || 'stagepv-default-secret';
    return createHash('sha256').update(pw + secret).digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        if (typeof password !== 'string') {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        // 簡易節流:錯誤時延遲回應,稍微拖慢暴力嘗試
        if (password !== ADMIN_PASSWORD) {
            await new Promise(r => setTimeout(r, 600));
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        return NextResponse.json({ ok: true, token: makeToken(ADMIN_PASSWORD) });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}

// 驗證 token 是否有效(前端重新載入時用,避免每次重打密碼)
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    return NextResponse.json({ ok: token === makeToken(ADMIN_PASSWORD) });
}
