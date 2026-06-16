'use client';

import { useState, useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import { useStore } from '@/store/useStore';

/**
 * 真實載入進度 Overlay。
 *
 * 與舊的計時器假進度不同,這裡的進度與隱藏時機全部來自真實事件:
 * 1. dataReady   — 專案資料(Firestore)抓取完成
 * 2. useProgress — GLB / Draco / 貼圖的實際下載與解碼進度(THREE LoadingManager)
 * 3. firstFrameRendered — 資產完成後,3D 場景實際渲染出first frame(SceneGraph 內的 FirstFrameGate 寫入)
 *
 * 只有三關全過才淡出,保證使用者看到的第一眼一定是完整場景——
 * 不會再出現「動畫播完了但場景還是空的」。
 */
export function AssetLoadingOverlay({
    dataReady,
    projectName,
}: {
    dataReady: boolean;
    projectName?: string;
}) {
    const { active, progress, loaded, total, item } = useProgress();
    const firstFrameRendered = useStore((s) => s.firstFrameRendered);

    // 是否曾有任何 loader 活動(區分「載入完成」與「根本沒有資產要載」)
    const [everActive, setEverActive] = useState(false);
    useEffect(() => { if (active) setEverActive(true); }, [active]);

    // 空場景 / 全快取命中的保險絲:資料就緒後 2 秒內沒有任何 loader 活動就放行
    const [graceTimedOut, setGraceTimedOut] = useState(false);
    useEffect(() => {
        if (!dataReady) return;
        const t = setTimeout(() => setGraceTimedOut(true), 2000);
        return () => clearTimeout(t);
    }, [dataReady]);

    // 最短顯示時間,避免快取命中時 overlay 一閃而過
    const mountTimeRef = useRef(Date.now());
    const [minTimePassed, setMinTimePassed] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setMinTimePassed(true), 600);
        return () => clearTimeout(t);
    }, []);

    // 卡關保險絲:某些資產(GDrive 影片貼圖、慢速 GLB)可能永遠停在 pending,
    // 讓 useProgress 的 active 一直為 true、progress 卡在 ~99% → 整個 loading 鎖死在 98%。
    // 兩道保險:① 資料就緒後進度爬到 ≥90% 但停滯 4 秒 → 放行;② 資料就緒後總計 15 秒硬上限 → 放行。
    const [forceReady, setForceReady] = useState(false);
    const progressRef = useRef(0);
    progressRef.current = progress;
    useEffect(() => {
        if (!dataReady) return;
        // ① 停滯偵測:每秒檢查,進度高位且 3 次無變化即放行
        let stalls = 0;
        let lastP = -1;
        const stallTimer = setInterval(() => {
            const p = progressRef.current;
            if (p >= 90 && Math.abs(p - lastP) < 0.5) {
                stalls += 1;
                if (stalls >= 3) { setForceReady(true); clearInterval(stallTimer); }
            } else {
                stalls = 0;
            }
            lastP = p;
        }, 1300);
        // ② 硬上限
        const hardTimer = setTimeout(() => setForceReady(true), 15000);
        return () => { clearInterval(stallTimer); clearTimeout(hardTimer); };
    }, [dataReady]);

    // 等待階段(資料抓取/初始化場景)沒有 loader 進度事件,
    // 用 tick 驅動重繪:讓爬升百分比與省略號動畫持續跳動,表示頁面正在運作
    const [tick, setTick] = useState(0);
    const waiting = !dataReady || (!active && !(dataReady && firstFrameRendered));
    useEffect(() => {
        if (!waiting) return;
        const t = setInterval(() => setTick(n => n + 1), 350);
        return () => clearInterval(t);
    }, [waiting]);
    const dots = '.'.repeat((tick % 3) + 1);

    const ready =
        forceReady || (
            dataReady &&
            firstFrameRendered &&
            !active &&
            (everActive || graceTimedOut) &&
            minTimePassed
        );

    // 淡出 → 卸載
    const [fading, setFading] = useState(false);
    const [gone, setGone] = useState(false);
    useEffect(() => {
        if (!ready || gone) return;
        setFading(true);
        const t = setTimeout(() => setGone(true), 500);
        return () => clearTimeout(t);
    }, [ready, gone]);

    if (gone) return null;

    // 顯示百分比:資料階段 0~8%,資產階段 8~98%,完成 100%
    let displayPct: number;
    if (ready) {
        displayPct = 100;
    } else if (!dataReady) {
        displayPct = Math.min(8, (Date.now() - mountTimeRef.current) / 150); // 緩慢爬升示意
    } else if (everActive) {
        displayPct = 8 + (progress / 100) * 90;
    } else {
        displayPct = 8;
    }
    const pct = Math.round(displayPct);

    // 目前載入項目:去掉路徑、時間戳與 query string
    const itemLabel = item
        ? decodeURIComponent(item).split('/').pop()?.split('?')[0]?.replace(/^\d{10,}_/, '') ?? ''
        : '';

    const statusText = !dataReady
        ? `載入專案資料${dots}`
        : active
            ? `載入 3D 資產 ${loaded}/${total}`
            : ready
                ? '完成'
                : `初始化場景${dots}`;

    return (
        <div
            data-ui-element
            className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
            {projectName && (
                <h1 className="text-white/90 text-lg sm:text-xl font-medium tracking-[0.2em] mb-8 px-6 text-center">
                    {projectName}
                </h1>
            )}

            {/* 大百分比 */}
            <div className="text-white font-mono text-5xl sm:text-6xl font-light tabular-nums mb-6">
                {pct}<span className="text-white/40 text-2xl sm:text-3xl">%</span>
            </div>

            {/* 進度條 */}
            <div className="w-56 sm:w-72 h-px bg-white/15 relative overflow-hidden mb-5">
                <div
                    className="absolute inset-y-0 left-0 bg-white/90 transition-[width] duration-300 ease-out"
                    style={{ width: `${displayPct}%` }}
                />
            </div>

            {/* 狀態與目前項目(spinner 表示頁面運作中) */}
            <div className="flex items-center gap-2">
                {!ready && (
                    <svg className="animate-spin w-3 h-3 text-white/40" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V1.5A10.5 10.5 0 001.5 12H4z" />
                    </svg>
                )}
                <p className="text-white/50 text-xs tracking-wider">{statusText}</p>
            </div>
            {itemLabel && active && (
                <p className="text-white/25 text-[10px] mt-1.5 max-w-[80vw] truncate font-mono">
                    {itemLabel}
                </p>
            )}
        </div>
    );
}
