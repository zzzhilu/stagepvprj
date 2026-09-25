/**
 * 後台 token 的前端工具(不含任何 Node 依賴,client/server 都可 import)。
 * token 由 /api/admin-auth 簽發、存在 sessionStorage;呼叫受保護 API 時放在 header。
 */
export const ADMIN_AUTH_KEY = 'stagepv_admin_auth';
export const ADMIN_TOKEN_HEADER = 'x-admin-token';

/** 附帶後台 token 的 header(未登入時回傳空物件,由 server 回 401) */
export function adminAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
    return token ? { [ADMIN_TOKEN_HEADER]: token } : {};
}
