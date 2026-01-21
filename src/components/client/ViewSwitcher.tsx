'use client';

import { useStore } from '@/store/useStore';
import { useEffect } from 'react';

export function ViewSwitcher() {
    const views = useStore((state) => state.views);
    const activeViewId = useStore((state) => state.activeViewId);
    const setActiveView = useStore((state) => state.setActiveView);

    // Auto-select first view when views are loaded (client default)
    useEffect(() => {
        if (views.length > 0 && activeViewId === null) {
            setActiveView(views[0].id);
        }
    }, [views, activeViewId, setActiveView]);

    if (views.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-4 z-40 pointer-events-auto">
            <div className="flex flex-col gap-2">
                <span className="text-xs text-gray-400 mb-1">📷 視角</span>
                <div className="flex gap-2">
                    {views.map((view, index) => (
                        <button
                            key={view.id}
                            onClick={() => setActiveView(view.id)}
                            className={`
                                relative w-12 h-12 rounded-lg overflow-hidden
                                transition-all duration-200
                                ${activeViewId === view.id
                                    ? 'ring-2 ring-violet-500 scale-110'
                                    : 'ring-1 ring-gray-600 hover:ring-gray-400'}
                                bg-gray-800 hover:bg-gray-700
                            `}
                        >
                            {/* Thumbnail or view number */}
                            {view.thumbnail_url ? (
                                <img
                                    src={view.thumbnail_url}
                                    alt={view.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                </span>
                            )}

                            {/* Active indicator */}
                            {activeViewId === view.id && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-violet-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
                <span className="text-[10px] text-gray-500">點擊切換視角</span>
            </div>
        </div>
    );
}
