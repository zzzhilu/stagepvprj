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
            <span className="text-xl">✨</span>
        </button>
    );
}
