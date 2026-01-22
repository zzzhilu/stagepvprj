'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function LoadingOverlay() {
    const isLoading = useStore((state) => state.isLoading);
    const loadingMessage = useStore((state) => state.loadingMessage);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            setProgress(0);
            return;
        }

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev;
                // Random increment between 1 and 5
                const diff = Math.random() * 10;
                return Math.min(prev + diff, 95);
            });
        }, 200);

        return () => clearInterval(interval);
    }, [isLoading]);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-900/90 border border-white/10 shadow-2xl min-w-[280px]">
                {/* Spinner */}
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-violet-500/30 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {Math.round(progress)}%
                    </div>
                </div>

                {/* Message */}
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-1">Processing</h3>
                    {loadingMessage && (
                        <p className="text-sm text-gray-400 animate-pulse">{loadingMessage}</p>
                    )}
                </div>

                {/* Progress Bar (Determinate) */}
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden mt-2">
                    <div
                        className="bg-violet-500 h-full transition-all duration-200 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
