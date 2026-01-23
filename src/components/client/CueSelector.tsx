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
        <div className="fixed bottom-40 left-4 z-40">
            {/* Label */}
            <div className="text-xs text-gray-500 mb-1 ml-1 font-medium">Cues</div>

            <div className="flex gap-1">
                {cues.map((cue) => (
                    <button
                        key={cue.id}
                        onClick={() => applyCue(cue.id)}
                        className={`
                            min-w-[32px] h-8 px-2 rounded 
                            text-xs font-medium transition-all duration-200
                            backdrop-blur-sm
                            ${activeCueId === cue.id
                                ? 'bg-gray-500/80 text-white ring-1 ring-white/20'
                                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
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
