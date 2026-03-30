'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export function LoadingOverlay() {
    const isLoading = useStore((state) => state.isLoading);
    const loadingMessage = useStore((state) => state.loadingMessage);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState<'idle' | 'loading' | 'completing' | 'fadeout' | 'done'>('idle');
    const rafRef = useRef<number | null>(null);

    // Phase: idle -> loading (when isLoading becomes true)
    useEffect(() => {
        if (isLoading && phase === 'idle') {
            setProgress(0);
            setPhase('loading');
        }
    }, [isLoading, phase]);

    // Phase: loading — animate progress from 0 to ~92%
    useEffect(() => {
        if (phase !== 'loading') return;

        let startTime: number | null = null;

        const tick = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            // Fast start, then decelerate — never exceeds 92%
            let target: number;
            if (elapsed < 300) {
                target = (elapsed / 300) * 25;           // 0→25% in 300ms
            } else if (elapsed < 1000) {
                target = 25 + ((elapsed - 300) / 700) * 35; // 25→60% in 700ms
            } else if (elapsed < 2500) {
                target = 60 + ((elapsed - 1000) / 1500) * 22; // 60→82% in 1500ms
            } else {
                target = 82 + ((elapsed - 2500) / 5000) * 10; // 82→92% slow crawl
            }

            target = Math.min(target, 92);
            setProgress(target);

            if (target < 92) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [phase]);

    // Phase: loading -> completing (when isLoading becomes false while still loading)
    useEffect(() => {
        if (!isLoading && phase === 'loading') {
            // Cancel the slow animation
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            setPhase('completing');
        }
    }, [isLoading, phase]);

    // Phase: completing — smoothly animate from current progress to 100%
    useEffect(() => {
        if (phase !== 'completing') return;

        const startProgress = progress;
        const startTime = performance.now();
        const duration = 500; // 500ms to reach 100%

        const tick = (timestamp: number) => {
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - t, 3);
            const current = startProgress + (100 - startProgress) * eased;
            setProgress(current);

            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                // Reached 100% — hold for a beat then start fadeout
                setProgress(100);
                setTimeout(() => {
                    setPhase('fadeout');
                }, 400); // Hold at 100% for 400ms so user sees completion
            }
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // Phase: fadeout -> done (1.5s fade)
    useEffect(() => {
        if (phase !== 'fadeout') return;

        const timer = setTimeout(() => {
            setPhase('done');
            // Reset for next time
            setProgress(0);
            setTimeout(() => setPhase('idle'), 50);
        }, 1500); // 1.5s fade-out duration

        return () => clearTimeout(timer);
    }, [phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // Don't render when idle or done
    if (phase === 'idle' || phase === 'done') return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
            style={{
                transition: 'opacity 1.5s ease-out',
                opacity: phase === 'fadeout' ? 0 : 1,
            }}
        >
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
                <div className="w-48 flex flex-col items-center gap-2">
                    <div className="w-full bg-white/5 rounded-full h-0.5 overflow-hidden">
                        <div
                            className="bg-white/40 h-full rounded-full"
                            style={{
                                width: `${progress}%`,
                                transition: phase === 'completing'
                                    ? 'none' // RAF handles the animation
                                    : 'width 200ms ease-out',
                            }}
                        ></div>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono tabular-nums select-none">
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
