/**
 * 客戶編輯密碼:SHA-256 雜湊工具。
 * 專案只儲存雜湊值,程式碼與資料庫皆無明文密碼。
 * 注意:此為 UI 層門檻(前端直寫 Firestore 架構下的合理取捨),非硬性伺服器端安全。
 */
export async function sha256Hex(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
