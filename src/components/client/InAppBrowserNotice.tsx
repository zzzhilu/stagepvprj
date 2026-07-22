'use client';

import { useEffect, useState } from 'react';

/**
 * in-app 瀏覽器偵測提示。
 *
 * 微信 / FB / IG / LINE 等 app 的內建 WebView 對 WebGL、影片解碼、記憶體的支援
 * 都遠差於系統瀏覽器,3D 場景經常直接開不起來 —— 與其讓客戶看到壞掉的頁面,
 * 不如第一時間引導改用 Safari / Chrome / Edge 開啟。
 *
 * 微信特例:WebView 無法程式化跳轉外部瀏覽器,唯一正解是引導「右上角 ⋯ → 在瀏覽器開啟」。
 * 其餘 in-app 瀏覽器提供「複製連結」讓用戶貼到瀏覽器。
 * 提示可關閉(仍要繼續),不強制擋人。
 */

type InAppKind = 'wechat' | 'generic' | null;

function detectInApp(): InAppKind {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent;
    if (/MicroMessenger/i.test(ua)) return 'wechat';
    const generic = [
        /FBAN|FBAV|FB_IAB/i,        // Facebook / Messenger
        /Instagram/i,
        / Line\//i,                  // LINE(避免誤中 Outline 等字樣)
        /BytedanceWebview|musical_ly|Aweme/i, // 抖音 / TikTok
        / QQ\//i,                    // QQ(內建,非 QQBrowser)
        /Twitter/i,
        /XHS|xiaohongshu/i,          // 小紅書
        /WeiBo/i,
    ];
    if (generic.some((r) => r.test(ua))) return 'generic';
    return null;
}

export function InAppBrowserNotice() {
    const [kind, setKind] = useState<InAppKind>(null);
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => { setKind(detectInApp()); }, []);

    if (!kind || dismissed) return null;

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard API 在部分 WebView 不可用 → 提示手動複製
            window.prompt('請長按選取並複製網址:', window.location.href);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
                <svg className="w-12 h-12 mx-auto text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21M12 3c-2.5 2.6-3.9 5.7-3.9 9s1.4 6.4 3.9 9" />
                </svg>
                <h3 className="text-white font-bold text-base">請改用瀏覽器開啟</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                    偵測到目前在 App 內建瀏覽器中,3D 舞台預覽可能無法正常顯示。
                    請使用 <span className="text-white font-semibold">Safari / Chrome / Edge</span> 開啟本頁。
                </p>

                {kind === 'wechat' ? (
                    <div className="bg-gray-800 rounded-xl p-3 text-left text-sm text-gray-200 space-y-1">
                        <p>1. 點右上角「<span className="font-bold text-white">⋯</span>」</p>
                        <p>2. 選「<span className="font-bold text-white">在瀏覽器開啟</span>」</p>
                    </div>
                ) : (
                    <button
                        onClick={copyUrl}
                        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
                    >
                        {copied ? '已複製,請貼到瀏覽器開啟' : '複製連結'}
                    </button>
                )}

                <button
                    onClick={() => setDismissed(true)}
                    className="text-gray-500 text-xs underline hover:text-gray-300"
                >
                    我知道了,仍要繼續
                </button>
            </div>
        </div>
    );
}
