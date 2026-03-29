'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * PageLoadingBar — handles two scenarios:
 * 1. Initial full page load: full overlay with brand + progress bar, 1s delay before fade
 * 2. SPA route transitions: slim top bar only, fast animation
 */
export function PageLoadingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'complete' | 'fadeout' | 'done'>('loading');
  const [mode, setMode] = useState<'initial' | 'route'>('initial');
  const prevPathname = useRef(pathname);
  const isFirstLoad = useRef(true);
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial page load ──
  const animateProgress = useCallback(() => {
    let raf: number;
    let start: number | null = null;

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;

      let target: number;
      if (elapsed < 400) {
        target = (elapsed / 400) * 30;
      } else if (elapsed < 1200) {
        target = 30 + ((elapsed - 400) / 800) * 40;
      } else {
        target = 70 + ((elapsed - 1200) / 3000) * 20;
      }

      target = Math.min(target, 92);
      setProgress(target);

      if (target < 92) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Initial load effect
  useEffect(() => {
    if (!isFirstLoad.current) return;

    const cancelAnim = animateProgress();

    const finish = () => {
      setProgress(100);
      setPhase('complete');
      setTimeout(() => {
        setPhase('fadeout');
        setTimeout(() => {
          setPhase('done');
          isFirstLoad.current = false;
        }, 500);
      }, 1000);
    };

    if (document.readyState === 'complete') {
      setTimeout(finish, 300);
    } else {
      window.addEventListener('load', finish);
      return () => {
        cancelAnim();
        window.removeEventListener('load', finish);
      };
    }

    return cancelAnim;
  }, [animateProgress]);

  // ── SPA route change detection ──
  useEffect(() => {
    // Skip on first mount (initial load handles it)
    if (isFirstLoad.current) {
      prevPathname.current = pathname;
      return;
    }

    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;

      // Clear any existing route timer
      if (routeTimerRef.current) {
        clearTimeout(routeTimerRef.current);
      }

      // Start route loading bar
      setMode('route');
      setProgress(0);
      setPhase('loading');

      // Animate: quickly to 40%, then slower
      let raf: number;
      let start: number | null = null;
      const tick = (timestamp: number) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;

        let target: number;
        if (elapsed < 200) {
          target = (elapsed / 200) * 40;
        } else if (elapsed < 600) {
          target = 40 + ((elapsed - 200) / 400) * 40;
        } else {
          target = 80 + ((elapsed - 600) / 2000) * 15;
        }
        target = Math.min(target, 95);
        setProgress(target);

        if (target < 95) {
          raf = requestAnimationFrame(tick);
        }
      };

      raf = requestAnimationFrame(tick);

      // Complete after a short delay (page content should be rendered)
      routeTimerRef.current = setTimeout(() => {
        cancelAnimationFrame(raf);
        setProgress(100);
        setPhase('complete');

        // 1s delay then fade out
        routeTimerRef.current = setTimeout(() => {
          setPhase('fadeout');
          routeTimerRef.current = setTimeout(() => {
            setPhase('done');
          }, 400);
        }, 1000);
      }, 500);

      return () => {
        cancelAnimationFrame(raf);
        if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      };
    }
  }, [pathname]);

  if (phase === 'done') return null;

  // ── Route transition mode: slim top bar only ──
  if (mode === 'route') {
    return (
      <div
        className={`fixed inset-0 z-[200] pointer-events-none transition-opacity duration-400 ${
          phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Scrim overlay — subtle */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ${
          phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
        }`} />

        {/* Center brand (smaller) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-white/80 tracking-tight select-none loading-brand-fade-in">
            Stage<span className="bg-gradient-to-r from-gray-300 via-white to-gray-400 bg-clip-text text-transparent">PV</span>
          </h1>
          <div className="w-48 mt-6 flex flex-col items-center gap-2">
            <div className="w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full loading-bar-gradient transition-all duration-200 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 loading-bar-shimmer" />
              </div>
            </div>
            <span className="text-[10px] text-gray-600 font-mono tabular-nums select-none">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Initial load mode: full overlay ──
  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        phase === 'fadeout' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Central brand */}
      <div className="flex flex-col items-center gap-4 mb-16">
        {/* StagePV Icon */}
        <div className="w-16 h-16 animate-pulse loading-brand-fade-in" style={{ animationDuration: '2.5s' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="30" fill="#111" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
            <polygon points="32,18 50,28 32,38 14,28" fill="#fff" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
            <polygon points="14,28 32,38 32,46 14,36" fill="#ccc" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
            <polygon points="50,28 32,38 32,46 50,36" fill="#999" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
            <circle cx="32" cy="23" r="1.8" fill="#000"/>
            <line x1="32" y1="24.8" x2="32" y2="29.5" stroke="#000" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight select-none loading-brand-fade-in">
          Stage<span className="bg-gradient-to-r from-gray-300 via-white to-gray-400 bg-clip-text text-transparent">PV</span>
        </h1>
        <p className="text-sm text-gray-500 tracking-widest uppercase loading-brand-fade-in"
           style={{ animationDelay: '150ms' }}>
          3D Stage Preview
        </p>
      </div>

      {/* Loading bar container */}
      <div className="w-64 flex flex-col items-center gap-3">
        <div className="w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full loading-bar-gradient transition-all duration-300 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 loading-bar-shimmer" />
          </div>
        </div>
        <span className="text-[11px] text-gray-600 font-mono tabular-nums select-none">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
