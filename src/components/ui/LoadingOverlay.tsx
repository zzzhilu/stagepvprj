'use client';

import { useStore } from '@/store/useStore';

export function LoadingOverlay() {
    const isLoading = useStore((state) => state.isLoading);
    const loadingMessage = useStore((state) => state.loadingMessage);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-900/90 border border-white/10 shadow-2xl">
                {/* Spinner */}
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-violet-500/30 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>

                {/* Message */}
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-1">Processing</h3>
                    {loadingMessage && (
                        <p className="text-sm text-gray-400 animate-pulse">{loadingMessage}</p>
                    )}
                </div>

                {/* Progress Bar (Indeterminate) */}
                <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-violet-500 animate-progress-indeterminate"></div>
                </div>
            </div>
        </div>
    );
}
