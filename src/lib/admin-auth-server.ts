import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { ADMIN_TOKEN_HEADER } from './admin-client';

/**
 * 後台 token 的 server 端簽發與驗證(僅供 API route 使用)。
 *
 * 若 ADMIN_PASSWORD 未設定,fallback 到舊密碼以免鎖死(部署後請務必設定並移除 fallback)。
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0903';

/** 用密碼衍生的 token:密碼一改 token 即失效 */
export function makeAdminToken(): string {
    const secret = process.env.AUTH_SECRET || 'stagepv-default-secret';
    return createHash('sha256').update(ADMIN_PASSWORD + secret).digest('hex').slice(0, 32);
}

export function isAdminPassword(password: string): boolean {
    return password === ADMIN_PASSWORD;
}

export function isValidAdminToken(token: string | null | undefined): boolean {
    if (!token) return false;
    const expected = Buffer.from(makeAdminToken());
    const actual = Buffer.from(token);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 受保護 API 的守門:非後台請求回傳 401 response,通過則回傳 null */
export function requireAdmin(request: Request): NextResponse | null {
    if (isValidAdminToken(request.headers.get(ADMIN_TOKEN_HEADER))) return null;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
