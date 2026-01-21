'use client';

import { useStore } from '@/store/useStore';
import { useSearchParams } from 'next/navigation';
import { RenderModeSelector } from './RenderModeSelector';

export default function ClientControls() {
    const mode = useStore((state) => state.mode);
    const views = useStore((state) => state.views);
    const activeViewId = useStore((state) => state.activeViewId);
    const setActiveView = useStore((state) => state.setActiveView);
    const setMode = useStore((state) => state.setMode);

    const searchParams = useSearchParams();
    const isShareMode = searchParams.get('share') === '1';

    return (
        <>
            {/* Render Mode Selector - Top Left (Hidden in share mode) */}
            {!isShareMode && (
                <div className="absolute top-4 left-4 pointer-events-auto z-40">
                    <RenderModeSelector />
                </div>
            )}

            {/* Client Mode Controls - Hidden in share mode */}
            {mode === 'client' && !isShareMode && (
                <div className="absolute bottom-0 left-0 w-full p-4 pointer-events-none z-40">
                    {/* Hidden Admin Trigger for Demo */}
                    <button
                        onClick={() => setMode('admin')}
                        className="pointer-events-auto absolute top-[-100px] left-4 bg-transparent text-white/10 hover:text-white/50 text-xs p-2"
                    >
                        Admin
                    </button>
                </div>
            )}
        </>
    );
}
