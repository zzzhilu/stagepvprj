import { useStore, type RenderMode } from '@/store/useStore';

const RENDER_MODES: Array<{ id: RenderMode; label: string; icon: string }> = [
    { id: 'beauty', label: 'Beauty', icon: '✨' },
    { id: 'wireframe', label: 'Wireframe', icon: '🔲' },
    { id: 'clay', label: 'Clay', icon: '🎨' }
];

export function RenderModeSelector() {
    const renderMode = useStore((state) => state.renderMode);
    const setRenderMode = useStore((state) => state.setRenderMode);

    return (
        <div className="flex gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
            {RENDER_MODES.map((mode) => (
                <button
                    key={mode.id}
                    onClick={() => setRenderMode(mode.id)}
                    className={`
                        px-3 py-1.5 rounded-md text-xs font-medium transition-all
                        flex items-center gap-1.5
                        ${renderMode === mode.id
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/50'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }
                    `}
                >
                    <span>{mode.icon}</span>
                    <span>{mode.label}</span>
                </button>
            ))}
        </div>
    );
}
