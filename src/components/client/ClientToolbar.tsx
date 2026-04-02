'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { TouchJoystick } from './TouchJoystick';
import { MeasurementPanel } from './MeasurementOverlay';

interface ClientToolbarProps {
    projectId?: string;
}

export function ClientToolbar({ projectId }: ClientToolbarProps) {
    const [expanded, setExpanded] = useState(false);
    const drawingMode = useStore(s => s.drawingMode);
    const setDrawingMode = useStore(s => s.setDrawingMode);
    const showScreenshotToast = useStore(s => s.showScreenshotToast);
    const screenshotToast = useStore(s => s.screenshotToast);
    const paperFigureMode = useStore(s => s.paperFigureMode);
    const setPaperFigureMode = useStore(s => s.setPaperFigureMode);
    const paperFigures = useStore(s => s.paperFigures);
    const clearAllPaperFigures = useStore(s => s.clearAllPaperFigures);
    const perfectRenderEnabled = useStore(s => s.perfectRenderEnabled);
    const setPerfectRenderEnabled = useStore(s => s.setPerfectRenderEnabled);
    const setBloomIntensity = useStore(s => s.setBloomIntensity);
    const walkMode = useStore(s => s.walkMode);
    const setWalkMode = useStore(s => s.setWalkMode);
    const measureMode = useStore(s => s.measureMode);
    const setMeasureMode = useStore(s => s.setMeasureMode);

    // Detect touch device (mobile/tablet) — robust multi-signal detection
    const setIsMobile = useStore(s => s.setIsMobile);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    useEffect(() => {
        const update = (val: boolean) => {
            setIsTouchDevice(val);
            setIsMobile(val);
        };

        const check = () => {
            const hasTouch = navigator.maxTouchPoints > 0 ||
                'ontouchstart' in window ||
                window.matchMedia('(pointer: coarse)').matches;
            // Fallback: if screen is narrow, very likely a mobile device
            const isNarrowScreen = window.innerWidth <= 1024;
            update(hasTouch || isNarrowScreen);
        };
        check();

        // One-shot: if we ever receive a real touch event, we are definitely touch
        const onFirstTouch = () => {
            update(true);
            window.removeEventListener('touchstart', onFirstTouch);
        };
        window.addEventListener('touchstart', onFirstTouch, { passive: true });

        // Re-check on resize (some 2-in-1 devices switch modes)
        window.addEventListener('resize', check);
        return () => {
            window.removeEventListener('resize', check);
            window.removeEventListener('touchstart', onFirstTouch);
        };
    }, [setIsMobile]);

    const takeScreenshot = useCallback(async () => {
        try {
            // 1. Hide all UI elements
            const uiElements = document.querySelectorAll('[data-ui-element]');
            uiElements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');

            // Wait two frames for UI to hide and renderer to flush
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            // 2. Get the Three.js canvas
            const threeCanvas = document.querySelector('canvas') as HTMLCanvasElement;
            if (!threeCanvas) {
                throw new Error('Canvas not found');
            }

            // 3. Create composite canvas
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = threeCanvas.width;
            compositeCanvas.height = threeCanvas.height;
            const ctx = compositeCanvas.getContext('2d')!;

            // Draw 3D scene
            ctx.drawImage(threeCanvas, 0, 0);

            // 4. If drawing layer exists, composite it on top
            const drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement;
            if (drawingCanvas && drawingCanvas.width > 0) {
                ctx.drawImage(drawingCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);
            }

            // 5. Copy to clipboard with fallbacks
            const blob = await new Promise<Blob>((resolve, reject) => {
                compositeCanvas.toBlob(b => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to create blob'));
                }, 'image/png');
            });

            let copied = false;

            // Method 1: Modern Clipboard API (requires secure context)
            if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    copied = true;
                } catch (clipErr) {
                    console.warn('ClipboardItem write failed, trying fallback:', clipErr);
                }
            }

            // Method 2: Fallback — download as file
            if (!copied) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `stagepv_screenshot_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                copied = true; // Treat download as success
            }

            // 6. Show toast
            showScreenshotToast();

        } catch (error) {
            console.error('Screenshot failed:', error);
            alert('截圖失敗：' + (error as Error).message);
        } finally {
            // 7. Restore UI
            const uiElements = document.querySelectorAll('[data-ui-element]');
            uiElements.forEach(el => (el as HTMLElement).style.visibility = '');
        }
    }, [showScreenshotToast]);

    return (
        <>
            {/* Sidebar */}
            <div
                data-ui-element
                className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center transition-transform duration-300 ${expanded ? 'translate-x-0' : '-translate-x-[52px]'
                    }`}
            >
                {/* Tool buttons */}
                <div className="bg-black/60 backdrop-blur-md rounded-r-xl border border-white/10 border-l-0 py-3 px-2 flex flex-col gap-2 shadow-2xl">
                    {/* Walk Mode Toggle */}
                    <button
                        onClick={() => setWalkMode(!walkMode)}
                        className={`group w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${walkMode
                            ? 'bg-cyan-500/30 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/20'
                            : 'hover:bg-white/15'
                            }`}
                        title={walkMode ? '退出漫遊模式' : '進入漫遊模式（WASD移動）'}
                    >
                        {/* Walking person icon */}
                        <svg className={`w-5 h-5 ${walkMode ? 'text-cyan-400' : 'text-white/80 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
                            {/* Head */}
                            <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
                            {/* Body + legs in walking pose */}
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 8.5L12 14l-3 7M13.5 8.5L12 14l3 7" />
                            {/* Arms swinging */}
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11l4 2 4-2" />
                            {/* Torso */}
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v7" />
                        </svg>
                    </button>

                    {/* Screenshot */}
                    <button
                        onClick={takeScreenshot}
                        className="group w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-white/15 active:scale-90"
                        title="截圖到剪貼簿"
                    >
                        <svg className="w-5 h-5 text-white/80 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <circle cx="12" cy="13" r="3" strokeWidth={1.8} />
                        </svg>
                    </button>

                    {/* Drawing Toggle */}
                    <button
                        onClick={() => setDrawingMode(!drawingMode)}
                        className={`group w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${drawingMode
                            ? 'bg-red-500/30 ring-1 ring-red-400/50'
                            : 'hover:bg-white/15'
                            }`}
                        title={drawingMode ? '關閉繪圖模式' : '開啟繪圖模式'}
                    >
                        <svg className={`w-5 h-5 ${drawingMode ? 'text-red-400' : 'text-white/80 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>

                    {/* Measurement Toggle */}
                    <button
                        onClick={() => setMeasureMode(!measureMode)}
                        className={`group w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${measureMode
                            ? 'bg-emerald-500/30 ring-1 ring-emerald-400/50 shadow-lg shadow-emerald-500/20'
                            : 'hover:bg-white/15'
                            }`}
                        title={measureMode ? '關閉測量模式' : '開啟測量模式'}
                    >
                        <svg className={`w-5 h-5 ${measureMode ? 'text-emerald-400' : 'text-white/80 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                            {/* Ruler icon */}
                            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/>
                            <path d="m14.5 12.5 2-2"/>
                            <path d="m11.5 9.5 2-2"/>
                            <path d="m8.5 6.5 2-2"/>
                            <path d="m17.5 15.5 2-2"/>
                        </svg>
                    </button>

                    {/* Paper Figure Toggle */}
                    <button
                        onClick={() => setPaperFigureMode(!paperFigureMode)}
                        className={`group w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 relative ${paperFigureMode
                            ? 'bg-amber-500/30 ring-1 ring-amber-400/50'
                            : 'hover:bg-white/15'
                            }`}
                        title={paperFigureMode ? '關閉紙片小人模式' : '放置紙片小人'}
                    >
                        <svg className={`w-5 h-5 ${paperFigureMode ? 'text-amber-400' : 'text-white/80 group-hover:text-white'}`} fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="4.5" r="2.5" />
                            <path d="M15 8H9a1 1 0 00-1 1v5h2v8h4v-8h2V9a1 1 0 00-1-1z" />
                        </svg>
                        {paperFigures.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {paperFigures.length}
                            </span>
                        )}
                    </button>

                    {/* Clear All Paper Figures */}
                    {paperFigureMode && paperFigures.length > 0 && (
                        <button
                            onClick={() => clearAllPaperFigures()}
                            className="group w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 hover:bg-red-500/20"
                            title={`清除全部小人 (${paperFigures.length})`}
                        >
                            <svg className="w-5 h-5 text-red-400/80 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}

                    {/* Divider */}
                    <div className="w-6 h-px bg-white/10 mx-auto" />

                    {/* Perfect Render Toggle */}
                    <button
                        onClick={() => {
                            const next = !perfectRenderEnabled;
                            setPerfectRenderEnabled(next);
                            setBloomIntensity(next ? 0.5 : 0);
                        }}
                        className={`group w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${perfectRenderEnabled
                            ? 'bg-amber-500/30 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                            : 'hover:bg-white/15'
                            }`}
                        title={perfectRenderEnabled ? '關閉完美渲染' : '開啟完美渲染'}
                    >
                        <svg className={`w-5 h-5 ${perfectRenderEnabled ? 'text-amber-400' : 'text-white/80 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    </button>
                </div>

                {/* Expand/Collapse Tab */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="bg-black/50 backdrop-blur-md rounded-r-lg border border-white/10 border-l-0 w-5 h-12 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                    <svg
                        className={`w-3 h-3 text-white/60 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Mobile Touch Joystick (bottom-left, only when walkMode active on mobile/touch) */}
            {walkMode && isTouchDevice && (
                <div
                    data-ui-element
                    className="fixed bottom-6 left-4 z-[100] pointer-events-auto animate-fade-in"
                >
                    <TouchJoystick />
                </div>
            )}

            {/* Screenshot Toast */}
            {screenshotToast && (
                <div
                    className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-down"
                >
                    <div className="bg-emerald-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        已截圖到剪貼簿
                    </div>
                </div>
            )}

            {/* Walk Mode Tip Banner — subtle, low-key */}
            {walkMode && (
                <div
                    data-ui-element
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down pointer-events-auto"
                >
                    <div className="bg-white/10 backdrop-blur-sm text-white/50 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs border border-white/5">
                        <span>漫遊模式</span>
                        {!isTouchDevice && (
                            <span className="text-white/30">WASD移動 · 按住滑鼠旋轉 · 中鍵/右鍵退出</span>
                        )}
                        <button
                            onClick={() => setWalkMode(false)}
                            className="ml-1 w-4 h-4 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
                            title="退出漫遊模式"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Paper Figure Mode Banner */}
            {paperFigureMode && (
                <div
                    data-ui-element
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down"
                >
                    <div className="bg-amber-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 font-medium border border-amber-400/50">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="4.5" r="2.5" />
                                <path d="M15 8H9a1 1 0 00-1 1v5h2v8h4v-8h2V9a1 1 0 00-1-1z" />
                            </svg>
                            <span className="text-sm">紙片小人模式啟動中</span>
                            <span className="text-amber-200/80 text-xs">（點擊場景放置小人）</span>
                        </div>
                        <button
                            onClick={() => setPaperFigureMode(false)}
                            className="ml-1 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            title="關閉紙片小人模式"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Measurement Panel */}
            <MeasurementPanel projectId={projectId} />

            {/* Measurement Mode Banner */}
            {measureMode && (
                <div
                    data-ui-element
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down pointer-events-auto"
                >
                    <div className="bg-emerald-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 font-medium border border-emerald-400/50">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21L21 3M3 21l4-1 1-3M21 3l-4 1-1 3" />
                            </svg>
                            <span className="text-sm">測量模式啟動中</span>
                            <span className="text-emerald-200/80 text-xs">（點擊模型表面放置測量點）</span>
                        </div>
                        <button
                            onClick={() => setMeasureMode(false)}
                            className="ml-1 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            title="關閉測量模式"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

