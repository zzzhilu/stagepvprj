'use client';

import { useStore } from '@/store/useStore';

export function CueSelector() {
    const cues = useStore((state) => state.cues);
    const activeCueId = useStore((state) => state.activeCueId);
    const applyCue = useStore((state) => state.applyCue);

    // Don't render if no cues
    if (cues.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="flex gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                {cues.map((cue) => (
                    <button
                        key={cue.id}
                        onClick={() => applyCue(cue.id)}
                        className={`
                            min-w-[40px] h-10 px-3 rounded-full 
                            text-sm font-medium transition-all duration-200
                            ${activeCueId === cue.id
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                            }
                        `}
                        title={`Cue ${cue.order}: ${cue.name}`}
                    >
                        {cue.order}
                    </button>
                ))}
            </div>
        </div>
    );
}
