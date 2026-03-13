'use client';

import { useStore } from '@/store/useStore';

export function PerfectRenderToggle() {
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const setPerfectRenderEnabled = useStore((state) => state.setPerfectRenderEnabled);

    return (
        <button
            onClick={() => setPerfectRenderEnabled(!perfectRenderEnabled)}
            className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all backdrop-blur-sm
                ${perfectRenderEnabled
                    ? 'bg-amber-500/90 shadow-lg shadow-amber-500/50 ring-2 ring-amber-400/70'
                    : 'bg-black/50 hover:bg-black/70'
                }
            `}
            title="完美渲染模式"
        >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
        </button>
    );
}
