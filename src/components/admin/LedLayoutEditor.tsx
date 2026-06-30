'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { getObjectDisplayName } from '@/lib/object-utils';

/**
 * LED 排列編輯器(地圖 UI)。
 * 一塊畫布代表「大圖」,每塊 LED 是可拖放/可輸入數值的矩形;
 * 擺好一組存成具名排列(排列A/B/C)。切換 active 排列 → 所有 LED 按矩形讀大圖。
 */
export function LedLayoutEditor() {
    const stageObjects = useStore((s) => s.stageObjects);
    const ledLayouts = useStore((s) => s.ledLayouts);
    const activeLedLayoutId = useStore((s) => s.activeLedLayoutId);
    const addLedLayout = useStore((s) => s.addLedLayout);
    const updateLedLayout = useStore((s) => s.updateLedLayout);
    const removeLedLayout = useStore((s) => s.removeLedLayout);
    const setActiveLedLayout = useStore((s) => s.setActiveLedLayout);
    const setLedRect = useStore((s) => s.setLedRect);

    const [expanded, setExpanded] = useState(false);
    const [selObjId, setSelObjId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ objId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

    const leds = stageObjects.filter(o => o.type === 'static_LED' || o.type === 'moving_LED');
    const layout = ledLayouts.find(l => l.id === activeLedLayoutId) || null;

    // 新增排列表單
    const [newName, setNewName] = useState('');
    const [newW, setNewW] = useState(3328);
    const [newH, setNewH] = useState(896);

    const handleAdd = () => {
        addLedLayout(newName.trim() || `排列${ledLayouts.length + 1}`, newW, newH);
        setNewName('');
    };

    // 畫布顯示寬(等比縮放大圖)
    const DISPLAY_W = 280;
    const scale = layout ? DISPLAY_W / layout.canvasWidth : 1;
    const displayH = layout ? layout.canvasHeight * scale : 0;

    const onRectPointerDown = (e: React.PointerEvent, objId: string) => {
        if (!layout) return;
        e.stopPropagation();
        setSelObjId(objId);
        const rect = layout.rects.find(r => r.objectId === objId) || { x: 0, y: 0 };
        dragRef.current = { objId, startX: e.clientX, startY: e.clientY, origX: rect.x, origY: rect.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onRectPointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current || !layout) return;
        const d = dragRef.current;
        const dx = (e.clientX - d.startX) / scale;
        const dy = (e.clientY - d.startY) / scale;
        setLedRect(layout.id, d.objId, {
            x: Math.round(d.origX + dx),
            y: Math.round(d.origY + dy),
        });
    };
    const onRectPointerUp = (e: React.PointerEvent) => {
        dragRef.current = null;
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    };

    const selRect = layout && selObjId ? layout.rects.find(r => r.objectId === selObjId) : null;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 mb-3">
            <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2 text-left">
                <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    🧩 LED 排列
                    {ledLayouts.length > 0 && <span className="text-[10px] text-gray-500">({ledLayouts.length})</span>}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {expanded && (
                <div className="px-3 pb-3 space-y-2">
                    {/* 排列切換 tabs */}
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setActiveLedLayout(null)}
                            className={`px-2 py-1 rounded text-[11px] ${!activeLedLayoutId ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        >預設(關閉)</button>
                        {ledLayouts.map(l => (
                            <button
                                key={l.id}
                                onClick={() => setActiveLedLayout(l.id)}
                                className={`px-2 py-1 rounded text-[11px] ${activeLedLayoutId === l.id ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >{l.name}</button>
                        ))}
                    </div>

                    {/* 新增排列 */}
                    <div className="flex items-center gap-1 pb-1 border-b border-gray-700/50">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="排列名稱"
                            className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white focus:border-violet-500 focus:outline-none" />
                        <input type="number" value={newW} onChange={e => setNewW(parseInt(e.target.value) || 0)} title="大圖寬"
                            className="w-14 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-[11px] text-white text-center focus:border-violet-500 focus:outline-none" />
                        <span className="text-gray-600 text-[10px]">×</span>
                        <input type="number" value={newH} onChange={e => setNewH(parseInt(e.target.value) || 0)} title="大圖高"
                            className="w-14 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-[11px] text-white text-center focus:border-violet-500 focus:outline-none" />
                        <button onClick={handleAdd} className="bg-violet-600 hover:bg-violet-700 text-white rounded px-2 py-0.5 text-[11px] flex-shrink-0">+ 新增</button>
                    </div>

                    {layout && (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">{layout.name} · {layout.canvasWidth}×{layout.canvasHeight}</span>
                                <button onClick={() => { if (confirm(`刪除排列「${layout.name}」?`)) removeLedLayout(layout.id); }}
                                    className="text-[10px] text-gray-500 hover:text-red-400">刪除排列</button>
                            </div>

                            {/* 地圖畫布 */}
                            <div
                                ref={canvasRef}
                                className="relative bg-gray-950 border border-gray-700 rounded overflow-hidden mx-auto"
                                style={{ width: DISPLAY_W, height: displayH }}
                            >
                                {leds.map(led => {
                                    const r = layout.rects.find(x => x.objectId === led.id) || { objectId: led.id, x: 0, y: 0, w: layout.canvasWidth, h: layout.canvasHeight, enabled: true };
                                    const sel = selObjId === led.id;
                                    return (
                                        <div
                                            key={led.id}
                                            onPointerDown={(e) => onRectPointerDown(e, led.id)}
                                            onPointerMove={onRectPointerMove}
                                            onPointerUp={onRectPointerUp}
                                            className={`absolute flex items-center justify-center text-[8px] text-center leading-tight cursor-move select-none overflow-hidden ${sel ? 'ring-2 ring-violet-400 z-10' : 'ring-1 ring-white/20'} ${r.enabled ? '' : 'opacity-30'}`}
                                            style={{
                                                left: r.x * scale, top: r.y * scale,
                                                width: r.w * scale, height: r.h * scale,
                                                background: r.enabled ? 'rgba(139,122,246,0.35)' : 'rgba(80,80,80,0.4)',
                                            }}
                                            title={getObjectDisplayName(led)}
                                        >
                                            {getObjectDisplayName(led)}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 選中 LED 的精確數值 */}
                            {selRect ? (
                                <div className="bg-gray-900/60 rounded p-2 space-y-1.5">
                                    <div className="text-[11px] text-violet-300 font-medium">{getObjectDisplayName(leds.find(l => l.id === selObjId)!)}</div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {(['x', 'y', 'w', 'h'] as const).map(k => (
                                            <label key={k} className="text-[10px] text-gray-500">
                                                {k.toUpperCase()}
                                                <input type="number" value={selRect[k]}
                                                    onChange={e => setLedRect(layout.id, selObjId!, { [k]: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-white text-center focus:border-violet-500 focus:outline-none" />
                                            </label>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setLedRect(layout.id, selObjId!, { enabled: !selRect.enabled })}
                                        className={`w-full py-1 rounded text-[11px] ${selRect.enabled ? 'bg-green-600/70 text-white' : 'bg-gray-700 text-gray-400'}`}
                                    >
                                        {selRect.enabled ? '✓ 啟用中(此排列顯示)' : '✕ 不啟用(黑屏)'}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[10px] text-gray-600 text-center py-1">點選上方矩形以編輯位置與數值</p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
