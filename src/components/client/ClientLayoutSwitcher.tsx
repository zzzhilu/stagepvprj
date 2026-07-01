'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';

/**
 * 客戶端 LED 排列切換器(左上角,上傳 icon 右側)。
 * 讓客戶端臨時切換不同排列預覽自己的視覺,不影響後台存檔。
 * - 「跟隨後台」= 用後台存檔的排列設定(預設)
 * - 「預設 UV」= 強制關閉排列,用模型原始 UV
 * - 各排列 = 臨時套用該排列
 */
export function ClientLayoutSwitcher() {
    const ledLayouts = useStore((s) => s.ledLayouts);
    const activeLedLayoutId = useStore((s) => s.activeLedLayoutId);
    const clientLayoutOverride = useStore((s) => s.clientLayoutOverride);
    const setClientLayoutOverride = useStore((s) => s.setClientLayoutOverride);

    const [expanded, setExpanded] = useState(false);

    // 沒有任何排列時不顯示此切換器
    if (ledLayouts.length === 0) return null;

    // 當前生效的排列 id
    const effectiveId = clientLayoutOverride !== undefined ? clientLayoutOverride : activeLedLayoutId;
    const currentName =
        clientLayoutOverride === undefined ? '跟隨後台'
        : effectiveId === null ? '預設 UV'
        : (ledLayouts.find(l => l.id === effectiveId)?.name ?? '排列');

    return (
        <div className="absolute top-4 left-[72px] z-40 pointer-events-auto">
            <div className="flex items-center gap-2">
                {/* Icon 按鈕 */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    title="切換 LED 排列(僅預覽,不影響存檔)"
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md ${expanded ? 'bg-violet-600' : 'bg-black/60 hover:bg-violet-600'}`}
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h5v6H4V5zM14 4h5a1 1 0 011 1v4h-6V4zM4 12h6v7H5a1 1 0 01-1-1v-6zM14 11h6v7a1 1 0 01-1 1h-5v-8z" />
                    </svg>
                </button>

                {/* 展開列 */}
                {expanded && (
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-2 py-1.5 animate-fade-in">
                        <button
                            onClick={() => setClientLayoutOverride(undefined)}
                            className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap ${clientLayoutOverride === undefined ? 'bg-violet-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                        >跟隨後台</button>
                        <button
                            onClick={() => setClientLayoutOverride(null)}
                            className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap ${clientLayoutOverride === null ? 'bg-violet-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                        >預設 UV</button>
                        {ledLayouts.map((l) => (
                            <button
                                key={l.id}
                                onClick={() => setClientLayoutOverride(l.id)}
                                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap ${clientLayoutOverride === l.id ? 'bg-violet-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                            >{l.name}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
