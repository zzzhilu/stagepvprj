'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

/** Extract projectId from URL path (e.g. /share/xxx, /free-test/xxx, /video-progress/xxx) */
function useProjectIdFromUrl(): string {
    if (typeof window === 'undefined') return 'default';
    const parts = window.location.pathname.split('/');
    // URL pattern: /<route>/<projectId>
    return parts[parts.length - 1] || 'default';
}

// ===== Types =====
interface MeasurementPoint {
    id: string;
    position: [number, number, number];
}

interface MeasurementLine {
    id: string;
    p1: MeasurementPoint;
    p2: MeasurementPoint;
    distance: number; // in meters
}

interface MeasurementData {
    points: MeasurementPoint[];
    lines: MeasurementLine[];
}

const STORAGE_KEY_PREFIX = 'stagepv_measurement_';
const MEASUREMENT_UPDATE_EVENT = 'stagepv-measurement-updated';
const POINT_COLOR = '#00ff66'; // bright green
const LINE_COLOR = '#00ff66'; // bright green
const LABEL_COLOR = '#ff0000'; // pure red
const POINT_SIZE = 0.08;

// ===== localStorage helpers =====
function loadMeasurements(projectId: string): MeasurementData {
    try {
        const key = `${STORAGE_KEY_PREFIX}${projectId || 'default'}`;
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to load measurements:', e);
    }
    return { points: [], lines: [] };
}

function saveMeasurements(projectId: string, data: MeasurementData) {
    try {
        const key = `${STORAGE_KEY_PREFIX}${projectId || 'default'}`;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save measurements:', e);
    }
}

// ===== Inline sub-components =====

/** Single measurement point sphere */
function MeasurePoint({ position }: { position: [number, number, number] }) {
    return (
        <mesh position={position}>
            <sphereGeometry args={[POINT_SIZE, 16, 16]} />
            <meshBasicMaterial color={POINT_COLOR} depthTest={false} transparent opacity={0.9} />
        </mesh>
    );
}

/** Line between two points + distance label */
function MeasureLine({
    p1,
    p2,
    distance,
}: {
    p1: [number, number, number];
    p2: [number, number, number];
    distance: number;
}) {
    const lineRef = useRef<THREE.Line>(null);

    useEffect(() => {
        if (lineRef.current) {
            const geo = lineRef.current.geometry as THREE.BufferGeometry;
            const positions = new Float32Array([...p1, ...p2]);
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.computeBoundingSphere();
        }
    }, [p1, p2]);

    // Midpoint for label
    const mid: [number, number, number] = [
        (p1[0] + p2[0]) / 2,
        (p1[1] + p2[1]) / 2,
        (p1[2] + p2[2]) / 2,
    ];

    return (
        <group>
            <line ref={lineRef as any}>
                <bufferGeometry />
                <lineBasicMaterial color={LINE_COLOR} depthTest={false} linewidth={2} />
            </line>

            {/* Distance label */}
            <Html position={mid} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <div
                    style={{
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: LABEL_COLOR,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(255, 0, 0, 0.4)',
                        backdropFilter: 'blur(4px)',
                        userSelect: 'none',
                    }}
                >
                    {distance.toFixed(1)} m
                </div>
            </Html>
        </group>
    );
}

// ===== Main Measurement Scene Component (lives inside Canvas) =====
export function MeasurementScene({ projectId: propProjectId }: { projectId?: string }) {
    const urlProjectId = useProjectIdFromUrl();
    const projectId = propProjectId || urlProjectId;
    const measureMode = useStore((s) => s.measureMode);
    const { scene, camera, gl } = useThree();
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());

    const [data, setData] = useState<MeasurementData>(() =>
        loadMeasurements(projectId || 'default')
    );

    // Pending point (waiting for second click to form a line)
    const [pendingPoint, setPendingPoint] = useState<MeasurementPoint | null>(null);

    // Keep data in sync with localStorage
    useEffect(() => {
        saveMeasurements(projectId || 'default', data);
    }, [data, projectId]);

    // Reload measurements when projectId changes
    useEffect(() => {
        setData(loadMeasurements(projectId || 'default'));
        setPendingPoint(null);
    }, [projectId]);

    // Listen for external updates (from MeasurementPanel delete/clear)
    useEffect(() => {
        const handleExternalUpdate = () => {
            setData(loadMeasurements(projectId || 'default'));
        };
        window.addEventListener(MEASUREMENT_UPDATE_EVENT, handleExternalUpdate);
        return () => window.removeEventListener(MEASUREMENT_UPDATE_EVENT, handleExternalUpdate);
    }, [projectId]);

    // Clear pending when exiting measure mode
    useEffect(() => {
        if (!measureMode) {
            setPendingPoint(null);
        }
    }, [measureMode]);

    // Click handler — raycast against all meshes in scene
    const handleMeasurePlace = useCallback(
        (e: MouseEvent) => {
            if (!measureMode) return;

            const rect = gl.domElement.getBoundingClientRect();
            mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycasterRef.current.setFromCamera(mouseRef.current, camera);

            // Collect all meshes from the scene that are actual stage objects
            // (skip measurement points, UI, helpers, etc.)
            const meshes: THREE.Object3D[] = [];
            scene.traverse((child) => {
                if (
                    child instanceof THREE.Mesh &&
                    child.visible &&
                    !child.userData.__measurement__
                ) {
                    meshes.push(child);
                }
            });

            const intersects = raycasterRef.current.intersectObjects(meshes, false);
            if (intersects.length === 0) return;

            const hit = intersects[0];
            const pos: [number, number, number] = [
                hit.point.x,
                hit.point.y,
                hit.point.z,
            ];

            const newPoint: MeasurementPoint = {
                id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                position: pos,
            };

            if (pendingPoint) {
                // Second click — form a line
                const dist = Math.sqrt(
                    (pos[0] - pendingPoint.position[0]) ** 2 +
                    (pos[1] - pendingPoint.position[1]) ** 2 +
                    (pos[2] - pendingPoint.position[2]) ** 2
                );

                const newLine: MeasurementLine = {
                    id: `ml_${Date.now()}`,
                    p1: pendingPoint,
                    p2: newPoint,
                    distance: dist,
                };

                setData((prev) => ({
                    points: [...prev.points, newPoint],
                    lines: [...prev.lines, newLine],
                }));
                setPendingPoint(null);
            } else {
                // First click — set pending
                setData((prev) => ({
                    ...prev,
                    points: [...prev.points, newPoint],
                }));
                setPendingPoint(newPoint);
            }
        },
        [measureMode, camera, scene, gl, pendingPoint]
    );

    // Register mousedown/mouseup to distinguish click vs drag
    // Only place a measurement point on a true click (< 5px movement)
    const downPosRef = useRef<{ x: number; y: number } | null>(null);
    const DRAG_THRESHOLD = 5; // pixels

    useEffect(() => {
        if (!measureMode) return;

        const canvas = gl.domElement;

        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return; // left button only
            downPosRef.current = { x: e.clientX, y: e.clientY };
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button !== 0 || !downPosRef.current) return;
            const dx = e.clientX - downPosRef.current.x;
            const dy = e.clientY - downPosRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            downPosRef.current = null;

            // Only treat as a click if the mouse barely moved
            if (dist < DRAG_THRESHOLD) {
                handleMeasurePlace(e);
            }
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
        };
    }, [measureMode, handleMeasurePlace, gl]);

    // Cursor style when measure mode is active
    useEffect(() => {
        if (measureMode) {
            gl.domElement.style.cursor = 'crosshair';
        } else {
            gl.domElement.style.cursor = '';
        }
        return () => {
            gl.domElement.style.cursor = '';
        };
    }, [measureMode, gl]);

    // Only render when measureMode is active
    if (!measureMode) return null;

    // Render measurement points and lines
    return (
        <group>
            {/* Committed points */}
            {data.points.map((p) => (
                <MeasurePoint key={p.id} position={p.position} />
            ))}

            {/* Committed lines */}
            {data.lines.map((l) => (
                <MeasureLine
                    key={l.id}
                    p1={l.p1.position}
                    p2={l.p2.position}
                    distance={l.distance}
                />
            ))}
        </group>
    );
}

// ===== Sidebar Panel for managing measurements (lives outside Canvas) =====
export function MeasurementPanel({ projectId: propProjectId }: { projectId?: string }) {
    const urlProjectId = useProjectIdFromUrl();
    const projectId = propProjectId || urlProjectId;
    const measureMode = useStore((s) => s.measureMode);
    const setMeasureMode = useStore((s) => s.setMeasureMode);

    const [data, setData] = useState<MeasurementData>(() =>
        loadMeasurements(projectId || 'default')
    );

    // Sync with localStorage periodically when measure mode is active
    useEffect(() => {
        if (!measureMode) return;
        const interval = setInterval(() => {
            setData(loadMeasurements(projectId || 'default'));
        }, 500);
        return () => clearInterval(interval);
    }, [measureMode, projectId]);

    // Also refresh on mount
    useEffect(() => {
        setData(loadMeasurements(projectId || 'default'));
    }, [projectId]);

    const removeLine = useCallback(
        (lineId: string) => {
            const current = loadMeasurements(projectId || 'default');
            const line = current.lines.find((l) => l.id === lineId);
            if (!line) return;

            // Remove the line
            const newLines = current.lines.filter((l) => l.id !== lineId);

            // Remove orphan points (points not used by any remaining line)
            const usedPointIds = new Set<string>();
            newLines.forEach((l) => {
                usedPointIds.add(l.p1.id);
                usedPointIds.add(l.p2.id);
            });
            const newPoints = current.points.filter((p) => usedPointIds.has(p.id));

            const newData = { points: newPoints, lines: newLines };
            saveMeasurements(projectId || 'default', newData);
            setData(newData);
            // Notify the 3D scene to refresh
            window.dispatchEvent(new Event(MEASUREMENT_UPDATE_EVENT));
        },
        [projectId]
    );

    const clearAll = useCallback(() => {
        const newData: MeasurementData = { points: [], lines: [] };
        saveMeasurements(projectId || 'default', newData);
        setData(newData);
        // Notify the 3D scene to refresh
        window.dispatchEvent(new Event(MEASUREMENT_UPDATE_EVENT));
    }, [projectId]);

    if (!measureMode) return null;

    return (
        <div
            data-ui-element
            className="fixed left-[72px] top-1/2 -translate-y-1/2 z-[70] flex flex-col items-stretch bg-gray-900/90 backdrop-blur-xl rounded-2xl px-3 py-3 border border-emerald-400/30 shadow-2xl"
            style={{ minWidth: '180px', maxHeight: '60vh' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">
                    📏 測量工具
                </span>
                <button
                    onClick={() => setMeasureMode(false)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all"
                    title="關閉測量模式"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Instruction */}
            <div className="text-white/40 text-[10px] px-1 mb-2 leading-relaxed">
                點擊模型表面放置測量點
                <br />
                兩個點自動連線並顯示距離
            </div>

            {/* Measurement list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 px-0.5" style={{ maxHeight: '40vh' }}>
                {data.lines.length === 0 ? (
                    <div className="text-white/20 text-xs text-center py-4">
                        尚無測量紀錄
                    </div>
                ) : (
                    data.lines.map((line, i) => (
                        <div
                            key={line.id}
                            className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1.5 group hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-400/60 text-[10px] font-mono">
                                    #{i + 1}
                                </span>
                                <span
                                    className="text-sm font-bold font-mono"
                                    style={{ color: LABEL_COLOR }}
                                >
                                    {line.distance.toFixed(1)} m
                                </span>
                            </div>
                            <button
                                onClick={() => removeLine(line.id)}
                                className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                title="刪除此測量"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Clear all */}
            {data.lines.length > 0 && (
                <>
                    <div className="h-px bg-white/10 my-2" />
                    <button
                        onClick={clearAll}
                        className="w-full py-1.5 rounded-lg text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        清除全部測量
                    </button>
                </>
            )}
        </div>
    );
}
