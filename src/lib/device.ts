/**
 * 行動裝置偵測（保守版）。
 *
 * 目的：只讓「手機 / 平板」吃到行動端的畫質降載（較低 dpr、關閉 MSAA），
 * 桌機（包含帶觸控螢幕的桌機）一律維持原本完整畫質。
 *
 * 因此刻意「只用 User-Agent 判斷」，不採用 `(pointer: coarse)` 之類的
 * 觸控偵測——那會把觸控筆電 / 觸控螢幕的桌機誤判成手機而被降載。
 *
 * 偵測失敗或無法判斷時一律回傳 false（= 視為桌機，給完整畫質），
 * 確保偏誤方向是「寧可不降載，也絕不誤降桌機」。
 *
 * 注意：只在 client 端呼叫（Scene 以 ssr:false 動態載入），SSR 期間回傳 false。
 */
export function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

    const ua = navigator.userAgent || '';

    // 手機 / 平板的典型 UA 關鍵字
    const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

    // iPadOS 13+ 預設會偽裝成桌面 Safari（UA 顯示 Macintosh），用觸控點數補抓
    const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;

    return uaMobile || iPadOS;
}
