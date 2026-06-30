'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store/useStore';
import { getObjectDisplayName } from '@/lib/object-utils';

/**
 * LED 排列編輯器。
 * 側欄為精簡入口(排列切換 + 開啟全螢幕編輯);實際排版在全螢幕浮動視窗中進行:
 * 左側列出所有 LED(含原生解析度輸入 + 加入畫布鈕),右側大畫布拖放排版。
 * 未加進畫布的 LED = 此排列黑屏不參與。
 */
export function LedLayoutEditor() {
    const stageObjects = useStore((s) => s.stageObjects);
    const ledLayouts = useStore((s) => s.ledLayouts);
    const activeLedLayoutId = useStore((s) => s.activeLedLayoutId);
    const addLedLayout = useStore((s) => s.addLedLayout);
    const removeLedLayout = useStore((s) => s.removeLedLayout);
    const updateLedLayout = useStore((s) => s.updateLedLayout);
    const setActiveLedLayout = useStore((s) => s.setActiveLedLayout);
    const setLedRect = useStore((s) => s.setLedRect);
    const setLedResolution = useStore((s) => s.setLedResolution);
    const addLedToLayout = useStore((s) => s.addLedToLayout);
    const removeLedFromLayout = useStore((s) => s.removeLedFromLayout);

    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    const leds = stageObjects.filter(o => o.type === 'static_LED' || o.type === 'moving_LED');
    const layout = ledLayouts.find(l => l.id === activeLedLayoutId) || null;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 mb-3 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    🧩 LED 排列 {ledLayouts.length > 0 && <span className="text-[10px] text-gray-500">({ledLayouts.length})</span>}
                </span>
            </div>

            {/* 排列切換 */}
            <div className="flex flex-wrap gap-1">
                <button onClick={() => setActiveLedLayout(null)}
                    className={`px-2 py-1 rounded text-[11px] ${!activeLedLayoutId ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>預設(關閉)</button>
                {ledLayouts.map(l => (
                    <button key={l.id} onClick={() => setActiveLedLayout(l.id)}
                        className={`px-2 py-1 rounded text-[11px] ${activeLedLayoutId === l.id ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{l.name}</button>
                ))}
            </div>

            <button onClick={() => setOpen(true)}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                開啟排列編輯器
            </button>

            {open && mounted && createPortal(
                <LayoutEditorModal
                    leds={leds}
                    onClose={() => setOpen(false)}
                    {...{ ledLayouts, activeLedLayoutId, layout, addLedLayout, removeLedLayout, updateLedLayout, setActiveLedLayout, setLedRect, setLedResolution, addLedToLayout, removeLedFromLayout }}
                />,
                document.body
            )}
        </div>
    );
}

// ===== 全螢幕編輯 Modal =====
function LayoutEditorModal({ leds, onClose, ledLayouts, activeLedLayoutId, layout, addLedLayout, removeLedLayout, updateLedLayout, setActiveLedLayout, setLedRect, setLedResolution, addLedToLayout, removeLedFromLayout }: any) {
    const [selObjId, setSelObjId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newW, setNewW] = useState(9344);
    const [newH, setNewH] = useState(3584);

    // 背景對位參考圖:每個排列各自一張,存 localStorage(純本地對位輔助,不進專案/不同步)。
    const bgKey = layout ? `led-layout-bg-${layout.id}` : null;
    const bgAlphaKey = layout ? `led-layout-bg-alpha-${layout.id}` : null;
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [bgAlpha, setBgAlpha] = useState(0.4);
    const bgFileRef = useRef<HTMLInputElement>(null);

    // 切換排列時載入該排列的背景圖
    useEffect(() => {
        if (!bgKey) { setBgImage(null); return; }
        try {
            setBgImage(localStorage.getItem(bgKey));
            const a = bgAlphaKey ? localStorage.getItem(bgAlphaKey) : null;
            setBgAlpha(a ? parseFloat(a) : 0.4);
        } catch { setBgImage(null); }
    }, [bgKey, bgAlphaKey]);

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !bgKey) return;
        if (file.size > 3 * 1024 * 1024) {
            alert('參考圖請小於 3MB(localStorage 容量限制)。對位線框圖通常很小,可先壓縮。');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            try {
                localStorage.setItem(bgKey, dataUrl);
                setBgImage(dataUrl);
            } catch {
                alert('儲存失敗:圖檔太大超過瀏覽器容量限制,請用更小的圖。');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleBgClear = () => {
        if (!bgKey) return;
        try { localStorage.removeItem(bgKey); } catch {}
        setBgImage(null);
    };

    const handleAlphaChange = (a: number) => {
        setBgAlpha(a);
        if (bgAlphaKey) { try { localStorage.setItem(bgAlphaKey, String(a)); } catch {} }
    };
    const dragRef = useRef<{ objId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

    const inLayout = (id: string) => !!layout?.rects.find((r: any) => r.objectId === id);
    const selRect = layout && selObjId ? layout.rects.find((r: any) => r.objectId === selObjId) : null;

    // 畫布顯示:等比縮放至最大寬 720(防護:canvas 尺寸異常時不產生 Infinity/NaN)
    const MAXW = 720;
    const cw = layout && layout.canvasWidth > 0 ? layout.canvasWidth : 1920;
    const ch = layout && layout.canvasHeight > 0 ? layout.canvasHeight : 1080;
    const scale = layout ? Math.min(MAXW / cw, 460 / ch) : 1;
    const dispW = layout ? cw * scale : 0;
    const dispH = layout ? ch * scale : 0;

    const onDown = (e: React.PointerEvent, objId: string) => {
        if (!layout) return;
        e.stopPropagation();
        setSelObjId(objId);
        const r = layout.rects.find((x: any) => x.objectId === objId);
        if (!r) return;
        dragRef.current = { objId, startX: e.clientX, startY: e.clientY, origX: r.x, origY: r.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onMove = (e: React.PointerEvent) => {
        if (!dragRef.current || !layout) return;
        const d = dragRef.current;
        setLedRect(layout.id, d.objId, {
            x: Math.round(d.origX + (e.clientX - d.startX) / scale),
            y: Math.round(d.origY + (e.clientY - d.startY) / scale),
        });
    };
    const onUp = (e: React.PointerEvent) => { dragRef.current = null; (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onPointerDown={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl" onPointerDown={e => e.stopPropagation()}>
                {/* 標題列 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">🧩 LED 排列編輯器</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
                </div>

                {/* 排列 tabs + 新增 */}
                <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2 flex-wrap">
                    <button onClick={() => setActiveLedLayout(null)}
                        className={`px-2 py-1 rounded text-[11px] ${!activeLedLayoutId ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400'}`}>預設(關閉)</button>
                    {ledLayouts.map((l: any) => (
                        <button key={l.id} onClick={() => setActiveLedLayout(l.id)}
                            className={`px-2 py-1 rounded text-[11px] ${activeLedLayoutId === l.id ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{l.name}</button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="排列名稱"
                            className="w-24 bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white focus:border-violet-500 focus:outline-none" />
                        <input type="number" value={newW} onChange={e => setNewW(parseInt(e.target.value) || 0)} title="大圖寬"
                            className="w-16 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-[11px] text-white text-center focus:border-violet-500 focus:outline-none" />
                        <span className="text-gray-600 text-[10px]">×</span>
                        <input type="number" value={newH} onChange={e => setNewH(parseInt(e.target.value) || 0)} title="大圖高"
                            className="w-16 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-[11px] text-white text-center focus:border-violet-500 focus:outline-none" />
                        <button onClick={() => { addLedLayout(newName.trim() || `排列${ledLayouts.length + 1}`, newW, newH); setNewName(''); }}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded px-2 py-0.5 text-[11px]">+ 新增排列</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* 左側:LED 清單 + 解析度 */}
                    <div className="w-72 border-r border-gray-800 overflow-y-auto p-3 space-y-2 flex-shrink-0">
                        <p className="text-[10px] text-gray-500 mb-1">所有 LED({leds.length}) · 設定各自解析度,點「加入」放進排列</p>
                        {leds.length === 0 && <p className="text-[11px] text-gray-600">場景中尚無 LED 物件</p>}
                        {leds.map((led: any) => {
                            const added = inLayout(led.id);
                            const res = led.ledResolution;
                            return (
                                <div key={led.id} className={`rounded p-2 border ${added ? 'border-violet-500/40 bg-violet-500/5' : 'border-gray-700 bg-gray-800/40'}`}>
                                    <div className="text-[11px] text-gray-200 truncate mb-1">{getObjectDisplayName(led)}</div>
                                    <div className="flex items-center gap-1 mb-1.5">
                                        <span className="text-[9px] text-gray-500">解析度</span>
                                        <input type="number" value={res?.w ?? ''} placeholder="寬"
                                            onChange={e => setLedResolution(led.id, parseInt(e.target.value) || 0, res?.h ?? 0)}
                                            className="w-14 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-[10px] text-white text-center focus:border-violet-500 focus:outline-none" />
                                        <span className="text-gray-600 text-[9px]">×</span>
                                        <input type="number" value={res?.h ?? ''} placeholder="高"
                                            onChange={e => setLedResolution(led.id, res?.w ?? 0, parseInt(e.target.value) || 0)}
                                            className="w-14 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-[10px] text-white text-center focus:border-violet-500 focus:outline-none" />
                                    </div>
                                    {layout && (added ? (
                                        <button onClick={() => removeLedFromLayout(layout.id, led.id)}
                                            className="w-full text-[10px] bg-gray-700 hover:bg-red-600/70 text-gray-300 rounded py-0.5">✓ 已加入(點擊移除)</button>
                                    ) : (
                                        <button onClick={() => addLedToLayout(layout.id, led.id)}
                                            className="w-full text-[10px] bg-violet-600/80 hover:bg-violet-600 text-white rounded py-0.5">+ 加入此排列</button>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* 右側:畫布 + 選中數值 */}
                    <div className="flex-1 overflow-auto p-4 flex flex-col items-center">
                        {!layout ? (
                            <div className="text-gray-500 text-sm mt-20">尚未選擇排列。請在上方新增或選擇一個排列。</div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between w-full max-w-3xl mb-2">
                                    <span className="text-[11px] text-gray-400">{layout.name} · 大圖 {layout.canvasWidth}×{layout.canvasHeight} · 未加入的 LED 在此排列為黑屏</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { if (confirm(`清空「${layout.name}」畫布上所有 LED?\\n(LED 會回到左側清單,可重新加入)`)) updateLedLayout(layout.id, { rects: [] }); }}
                                            className="text-[10px] text-gray-500 hover:text-amber-400">清空畫布</button>
                                        <button onClick={() => { if (confirm(`刪除排列「${layout.name}」?`)) removeLedLayout(layout.id); }}
                                            className="text-[10px] text-gray-500 hover:text-red-400">刪除排列</button>
                                    </div>
                                </div>

                                {/* 背景對位參考圖(本地輔助,不同步) */}
                                <div className="flex items-center gap-2 w-full max-w-3xl mb-2 text-[10px] text-gray-400">
                                    <input ref={bgFileRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                                    <button onClick={() => bgFileRef.current?.click()}
                                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-2 py-1">
                                        {bgImage ? '更換對位圖' : '上傳對位圖'}
                                    </button>
                                    {bgImage && (
                                        <>
                                            <button onClick={handleBgClear} className="text-gray-500 hover:text-red-400">清除</button>
                                            <span className="text-gray-500">透明度</span>
                                            <input type="range" min={0.05} max={1} step={0.05} value={bgAlpha}
                                                onChange={e => handleAlphaChange(parseFloat(e.target.value))}
                                                className="flex-1 max-w-[160px] accent-violet-500" />
                                            <span className="font-mono w-8">{Math.round(bgAlpha * 100)}%</span>
                                        </>
                                    )}
                                    <span className="text-gray-600 ml-auto">參考圖僅存於本機,不上傳/不同步</span>
                                </div>

                                <div className="relative bg-gray-950 border border-gray-700" style={{ width: dispW, height: dispH }}>
                                    {bgImage && (
                                        <img
                                            src={bgImage}
                                            alt="對位參考圖"
                                            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                                            style={{ opacity: bgAlpha }}
                                            draggable={false}
                                        />
                                    )}
                                    {layout.rects.map((r: any) => {
                                        const led = leds.find((l: any) => l.id === r.objectId);
                                        const sel = selObjId === r.objectId;
                                        return (
                                            <div key={r.objectId}
                                                onPointerDown={(e) => onDown(e, r.objectId)} onPointerMove={onMove} onPointerUp={onUp}
                                                className={`absolute flex items-center justify-center text-[9px] text-center leading-tight cursor-move select-none overflow-hidden ${sel ? 'ring-2 ring-violet-400 z-10' : 'ring-1 ring-white/25'}`}
                                                style={{ left: r.x * scale, top: r.y * scale, width: r.w * scale, height: r.h * scale, background: 'rgba(139,122,246,0.35)' }}
                                                title={led ? getObjectDisplayName(led) : r.objectId}>
                                                {led ? getObjectDisplayName(led) : ''}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 選中 LED 數值 */}
                                {selRect && leds.find((l: any) => l.id === selObjId) ? (
                                    <div className="mt-3 bg-gray-800/60 rounded-lg p-3 w-full max-w-3xl">
                                        <div className="text-[12px] text-violet-300 font-medium mb-2">{getObjectDisplayName(leds.find((l: any) => l.id === selObjId))}</div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['x', 'y', 'w', 'h'] as const).map(k => (
                                                <label key={k} className="text-[10px] text-gray-500">{k.toUpperCase()}
                                                    <input type="number" value={selRect[k]}
                                                        onChange={e => setLedRect(layout.id, selObjId, { [k]: parseInt(e.target.value) || 0 })}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-[12px] text-white text-center focus:border-violet-500 focus:outline-none" />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-gray-600 mt-3">點選畫布上的 LED 區塊以編輯位置與大小</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
