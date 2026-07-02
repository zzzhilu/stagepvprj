'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';

/**
 * 後台模型懸停名稱提示:滑鼠移到模型上時,名稱標籤跟隨滑鼠顯示。
 * 只掛在後台(自由測試編輯模式),客戶端不顯示。
 */
export function ObjectHoverTooltip() {
    const hoveredObjectName = useStore((s) => s.hoveredObjectName);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!hoveredObjectName) return;
        const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [hoveredObjectName]);

    if (!hoveredObjectName) return null;

    return (
        <div
            className="fixed z-[200] pointer-events-none select-none"
            style={{ left: pos.x + 14, top: pos.y + 12 }}
        >
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded border border-white/15 shadow-lg whitespace-nowrap">
                {hoveredObjectName}
            </div>
        </div>
    );
}
