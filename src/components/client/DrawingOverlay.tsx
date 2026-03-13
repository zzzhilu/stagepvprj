'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';

type DrawingTool = 'pen' | 'rectangle' | 'circle' | 'triangle' | 'eraser';

interface Point {
    x: number;
    y: number;
}

const PRESET_COLORS = [
    '#EF4444', // red (default)
    '#22C55E', // green
    '#3B82F6', // blue
];

const STORAGE_KEY_PREFIX = 'stagepv_drawing_';

interface DrawingOverlayProps {
    projectId?: string;
}

export function DrawingOverlay({ projectId }: DrawingOverlayProps) {
    const drawingMode = useStore(s => s.drawingMode);
    const setDrawingMode = useStore(s => s.setDrawingMode);

    // Main canvas (committed strokes)
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Preview canvas (shape rubber-band preview)
    const previewRef = useRef<HTMLCanvasElement>(null);

    const [tool, setTool] = useState<DrawingTool>('pen');
    const [color, setColor] = useState('#EF4444');
    const [lineWidth, setLineWidth] = useState(3);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Drawing state
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<Point | null>(null);
    const startPointRef = useRef<Point | null>(null);
    // Track current tool/color/width in refs so event handlers always see latest values
    const toolRef = useRef<DrawingTool>(tool);
    const colorRef = useRef(color);
    const lineWidthRef = useRef(lineWidth);

    // Keep refs in sync
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { lineWidthRef.current = lineWidth; }, [lineWidth]);

    const storageKey = `${STORAGE_KEY_PREFIX}${projectId || 'default'}`;

    // Setup canvas size (no DPR scaling — simpler, works on all devices)
    const setupCanvas = useCallback((canvas: HTMLCanvasElement) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (canvas.width !== w || canvas.height !== h) {
            // Save content before resize
            const temp = document.createElement('canvas');
            temp.width = canvas.width;
            temp.height = canvas.height;
            temp.getContext('2d')!.drawImage(canvas, 0, 0);

            canvas.width = w;
            canvas.height = h;

            // Restore content
            canvas.getContext('2d')!.drawImage(temp, 0, 0);
        }
    }, []);

    // Initialize canvases and load saved data
    useEffect(() => {
        if (!drawingMode) return;

        const canvas = canvasRef.current;
        const preview = previewRef.current;
        if (!canvas || !preview) return;

        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
        preview.width = w;
        preview.height = h;

        // Load saved drawing
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
            };
            img.src = savedData;
        }

        // Resize handler
        const handleResize = () => {
            setupCanvas(canvas);
            preview.width = window.innerWidth;
            preview.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawingMode, storageKey, setupCanvas]);

    // Save to localStorage
    const saveToStorage = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            const dataUrl = canvas.toDataURL('image/png');
            localStorage.setItem(storageKey, dataUrl);
        } catch (e) {
            console.warn('Failed to save drawing:', e);
        }
    }, [storageKey]);

    // Get pointer coords relative to viewport
    const getPoint = useCallback((e: React.PointerEvent): Point => {
        return { x: e.clientX, y: e.clientY };
    }, []);

    // ====== Native event handlers (using refs for latest tool/color/width) ======

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        isDrawingRef.current = true;
        const pt = getPoint(e);
        lastPointRef.current = pt;
        startPointRef.current = pt;

        // For pen/eraser: draw a dot at start position
        if (toolRef.current === 'pen' || toolRef.current === 'eraser') {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;

            if (toolRef.current === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = lineWidthRef.current * 4;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = colorRef.current;
                ctx.lineWidth = lineWidthRef.current;
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw a dot
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fillStyle = toolRef.current === 'eraser' ? '#000' : colorRef.current;
            ctx.fill();
        }
    }, [getPoint]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const pt = getPoint(e);
        const currentTool = toolRef.current;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            // Freehand drawing: draw line segment from last point to current
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx || !lastPointRef.current) return;

            ctx.beginPath();
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            ctx.lineTo(pt.x, pt.y);

            if (currentTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = lineWidthRef.current * 4;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = colorRef.current;
                ctx.lineWidth = lineWidthRef.current;
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            lastPointRef.current = pt;
        } else {
            // Shape tools: rubber-band preview on the preview canvas
            const preview = previewRef.current;
            if (!preview || !startPointRef.current) return;
            const pCtx = preview.getContext('2d')!;

            // Clear preview
            pCtx.clearRect(0, 0, preview.width, preview.height);

            pCtx.strokeStyle = colorRef.current;
            pCtx.lineWidth = lineWidthRef.current;
            pCtx.lineCap = 'round';
            pCtx.lineJoin = 'round';
            pCtx.globalCompositeOperation = 'source-over';

            const start = startPointRef.current;

            pCtx.beginPath();
            if (currentTool === 'rectangle') {
                pCtx.rect(start.x, start.y, pt.x - start.x, pt.y - start.y);
            } else if (currentTool === 'circle') {
                const rx = Math.abs(pt.x - start.x) / 2;
                const ry = Math.abs(pt.y - start.y) / 2;
                const cx = start.x + (pt.x - start.x) / 2;
                const cy = start.y + (pt.y - start.y) / 2;
                pCtx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
            } else if (currentTool === 'triangle') {
                const midX = (start.x + pt.x) / 2;
                pCtx.moveTo(midX, start.y);
                pCtx.lineTo(pt.x, pt.y);
                pCtx.lineTo(start.x, pt.y);
                pCtx.closePath();
            }
            pCtx.stroke();
        }
    }, [getPoint]);

    const handlePointerUp = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        const currentTool = toolRef.current;

        // For shape tools: commit preview to main canvas
        if (currentTool !== 'pen' && currentTool !== 'eraser') {
            const canvas = canvasRef.current;
            const preview = previewRef.current;
            if (canvas && preview) {
                const ctx = canvas.getContext('2d')!;
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(preview, 0, 0);
                // Clear preview
                preview.getContext('2d')!.clearRect(0, 0, preview.width, preview.height);
            }
        }

        lastPointRef.current = null;
        startPointRef.current = null;

        // Persist
        saveToStorage();
    }, [saveToStorage]);

    const clearAll = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);

        const preview = previewRef.current;
        if (preview) preview.getContext('2d')!.clearRect(0, 0, preview.width, preview.height);

        localStorage.removeItem(storageKey);
    }, [storageKey]);

    if (!drawingMode) return null;

    const toolIcons: Record<DrawingTool, React.ReactNode> = {
        pen: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        ),
        rectangle: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <rect x="3" y="5" width="18" height="14" rx="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        circle: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
            </svg>
        ),
        triangle: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L22 21H2L12 3z" />
            </svg>
        ),
        eraser: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 20H7.5L2.7 15.2a1 1 0 010-1.4L14.3 2.3a1 1 0 011.4 0l6 6a1 1 0 010 1.4L12 19.5" />
                <path strokeLinecap="round" d="M6 12l6 6" />
            </svg>
        ),
    };

    const tools: { id: DrawingTool; label: string }[] = [
        { id: 'pen', label: '自由筆' },
        { id: 'rectangle', label: '方框' },
        { id: 'circle', label: '圓框' },
        { id: 'triangle', label: '三角形' },
        { id: 'eraser', label: '橡皮擦' },
    ];

    return (
        <>
            {/* Main drawing canvas (committed strokes) */}
            <canvas
                ref={canvasRef}
                id="drawing-canvas"
                className="fixed inset-0 z-[60]"
                style={{ touchAction: 'none', pointerEvents: 'auto', cursor: 'crosshair', width: '100vw', height: '100vh' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />

            {/* Preview canvas (shape rubber-band) — stacked on top */}
            <canvas
                ref={previewRef}
                className="fixed inset-0 z-[61] pointer-events-none"
                style={{ width: '100vw', height: '100vh' }}
            />

            {/* Drawing Toolbar */}
            <div
                data-ui-element
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1.5 bg-gray-900/90 backdrop-blur-xl rounded-2xl px-3 py-2 border border-white/15 shadow-2xl"
            >
                {/* Tools */}
                {tools.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTool(t.id)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 ${tool === t.id
                            ? 'bg-white/20 ring-1 ring-white/30 scale-110 text-white'
                            : 'text-white/70'
                            }`}
                        title={t.label}
                    >
                        {toolIcons[t.id]}
                    </button>
                ))}

                {/* Divider */}
                <div className="w-px h-7 bg-white/20 mx-1" />

                {/* Color */}
                <div className="relative">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                        title="選擇顏色"
                    >
                        <div
                            className="w-5 h-5 rounded-full border-2 border-white/50"
                            style={{ backgroundColor: color }}
                        />
                    </button>

                    {/* Color Picker Dropdown */}
                    {showColorPicker && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl rounded-xl p-3 border border-white/15 shadow-2xl">
                            <div className="flex items-center gap-2">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => { setColor(c); setShowColorPicker(false); }}
                                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${color === c ? 'border-white scale-110' : 'border-white/30'
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={color}
                                    onChange={e => { setColor(e.target.value); setShowColorPicker(false); }}
                                    className="w-7 h-7 cursor-pointer rounded-full bg-transparent border-2 border-white/30"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-7 bg-white/20 mx-1" />

                {/* Line Width */}
                <div className="flex items-center gap-2 px-1">
                    <span className="text-white/50 text-xs">{lineWidth}px</span>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={lineWidth}
                        onChange={e => setLineWidth(parseInt(e.target.value))}
                        className="w-16 h-1 accent-white/80"
                    />
                </div>

                {/* Divider */}
                <div className="w-px h-7 bg-white/20 mx-1" />

                {/* Clear All */}
                <button
                    onClick={clearAll}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    title="清除全部"
                >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>

                {/* Close */}
                <button
                    onClick={() => setDrawingMode(false)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all"
                    title="關閉繪圖 (保留內容)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </>
    );
}
