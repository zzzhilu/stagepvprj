'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

/**
 * 後台模型懸停名稱提示:滑鼠移到模型上時,名稱標籤跟隨滑鼠顯示。
 * 只掛在後台(自由測試編輯模式),客戶端不顯示。
 */
export function ObjectHoverTooltip() {
    const hoveredObjectName = useStore((s) => s.hoveredObjectName);
    const ref = useRef<HTMLDivElement>(null);

    // [效能] mousemove 直接改 DOM transform,不走 setState(免每次移動 re-render)
    useEffect(() => {
        if (!hoveredObjectName) return;
        const onMove = (e: MouseEvent) => {
            if (ref.current) ref.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [hoveredObjectName]);

    if (!hoveredObjectName) return null;

    return (
        <div
            ref={ref}
            className="fixed left-0 top-0 z-[200] pointer-events-none select-none"
        >
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded border border-white/15 shadow-lg whitespace-nowrap">
                {hoveredObjectName}
            </div>
        </div>
    );
}
