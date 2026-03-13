'use client';

import { useState, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';

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
        </>
    );
}
