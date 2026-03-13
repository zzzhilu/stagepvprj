import { useStore, type RenderMode } from '@/store/useStore';

const RENDER_MODES: Array<{ id: RenderMode; label: string; icon: React.ReactNode }> = [
    {
        id: 'beauty', label: 'Beauty', icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        )
    },
    {
        id: 'wireframe', label: 'Wireframe', icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )
    },
    {
        id: 'clay', label: 'Clay', icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )
    }
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
                    {mode.icon}
                    <span>{mode.label}</span>
                </button>
            ))}
        </div>
    );
}
