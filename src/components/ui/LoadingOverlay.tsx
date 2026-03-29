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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300">
            <div className="flex flex-col items-center gap-5 p-8 min-w-[280px]">
                {/* StagePV Icon — isometric stage box with breathing animation */}
                <div className="w-20 h-20 animate-pulse" style={{ animationDuration: '2s' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="80" height="80">
                        <circle cx="32" cy="32" r="30" fill="#111" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                        {/* Top face */}
                        <polygon points="32,18 50,28 32,38 14,28" fill="#fff" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
                        {/* Left face */}
                        <polygon points="14,28 32,38 32,46 14,36" fill="#ccc" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
                        {/* Right face */}
                        <polygon points="50,28 32,38 32,46 50,36" fill="#999" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
                        {/* Figure on stage */}
                        <circle cx="32" cy="23" r="1.8" fill="#000"/>
                        <line x1="32" y1="24.8" x2="32" y2="29.5" stroke="#000" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                </div>

                {/* Brand name */}
                <div className="text-center">
                    <h3 className="text-base font-medium text-white/70 tracking-widest uppercase">StagePV</h3>
                    {loadingMessage && (
                        <p className="text-xs text-white/30 mt-1.5 animate-pulse">{loadingMessage}</p>
                    )}
                </div>

                {/* Thin progress bar */}
                <div className="w-48 bg-white/5 rounded-full h-0.5 overflow-hidden">
                    <div
                        className="bg-white/40 h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
