'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useStore, PaperFigure } from '@/store/useStore';
import { Billboard, Html } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Human silhouette shape ───────────────────────────────────
function createHumanShape(): THREE.Shape {
    const s = new THREE.Shape();

    // Path flows: right neck → head (square) → left neck → body → close

    // --- Start at right neck ---
    s.moveTo(0.07, 1.47);

    // --- Head (simple square) ---
    s.lineTo(0.15, 1.47);   // head bottom-right
    s.lineTo(0.15, 1.77);   // head top-right
    s.lineTo(-0.15, 1.77);  // head top-left
    s.lineTo(-0.15, 1.47);  // head bottom-left

    // --- Left neck ---
    s.lineTo(-0.07, 1.47);

    // --- Left shoulder ---
    s.lineTo(-0.24, 1.38);

    // --- Left arm ---
    s.lineTo(-0.30, 1.30);
    s.lineTo(-0.32, 0.95);
    s.lineTo(-0.30, 0.72);
    s.lineTo(-0.28, 0.68);
    s.lineTo(-0.22, 0.72);
    s.lineTo(-0.20, 0.95);
    s.lineTo(-0.20, 1.28);

    // --- Left torso & hip ---
    s.lineTo(-0.18, 0.82);
    s.lineTo(-0.20, 0.72);

    // --- Left leg ---
    s.lineTo(-0.22, 0.10);
    s.lineTo(-0.23, 0.02);
    s.lineTo(-0.24, 0.0);
    s.lineTo(-0.06, 0.0);
    s.lineTo(-0.06, 0.02);
    s.lineTo(-0.08, 0.65);

    // --- Crotch ---
    s.lineTo(-0.02, 0.62);
    s.lineTo(0.02, 0.62);
    s.lineTo(0.08, 0.65);

    // --- Right leg ---
    s.lineTo(0.06, 0.02);
    s.lineTo(0.06, 0.0);
    s.lineTo(0.24, 0.0);
    s.lineTo(0.23, 0.02);
    s.lineTo(0.22, 0.10);
    s.lineTo(0.20, 0.72);

    // --- Right torso & hip ---
    s.lineTo(0.18, 0.82);
    s.lineTo(0.20, 1.28);
    s.lineTo(0.20, 0.95);
    s.lineTo(0.22, 0.72);
    s.lineTo(0.28, 0.68);
    s.lineTo(0.30, 0.72);
    s.lineTo(0.32, 0.95);
    s.lineTo(0.30, 1.30);

    // --- Right shoulder ---
    s.lineTo(0.24, 1.38);

    // --- Close back to start (right neck) ---
    s.lineTo(0.07, 1.47);

    return s;
}

// Cache geometry
const humanShape = createHumanShape();
const humanGeometry = new THREE.ShapeGeometry(humanShape);
humanGeometry.translate(0, 0.07, 0); // lift slightly so feet touch y=0

// ─── Single Figure ────────────────────────────────────────────
function PaperFigureMesh({
    figure,
    isPlacementMode,
}: {
    figure: PaperFigure;
    isPlacementMode: boolean;
}) {
    const removePaperFigure = useStore(s => s.removePaperFigure);
    const updatePaperFigurePosition = useStore(s => s.updatePaperFigurePosition);
    const [hovered, setHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [dragging, setDragging] = useState(false);
    const groupRef = useRef<THREE.Group>(null);
    const { raycaster } = useThree();

    // Floor plane for raycasting during drag
    const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

    const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isPlacementMode) return;
        e.stopPropagation();
        setDragging(true);
        // Capture pointer so we get move/up events even outside the mesh
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    }, [isPlacementMode]);

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!dragging) return;
        e.stopPropagation();

        // Raycast to the floor plane
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(floorPlane, intersection);
        if (intersection) {
            // 與放置時一致的落地高度(避免拖曳後小人高度跳變)
            updatePaperFigurePosition(figure.id, [intersection.x, 0.05, intersection.z]);
        }
    }, [dragging, raycaster, floorPlane, figure.id, updatePaperFigurePosition]);

    const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (dragging) {
            setDragging(false);
            e.stopPropagation();
        }
    }, [dragging]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (!isPlacementMode) return;
        e.stopPropagation();
        setShowMenu(prev => !prev);
    }, [isPlacementMode]);

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: figure.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        roughness: 0.8,
        metalness: 0.0,
    }), [figure.color]);

    return (
        <group
            ref={groupRef}
            position={figure.position}
            userData={{ isPaperFigure: true }}
        >
            <Billboard follow lockX={false} lockY={false} lockZ={false}>
                <group scale={[figure.scale, figure.scale, figure.scale]}>
                    {/* Human silhouette */}
                    <mesh
                        geometry={humanGeometry}
                        material={material}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onClick={handleClick}
                        onPointerOver={() => {
                            if (isPlacementMode) {
                                setHovered(true);
                                document.body.style.cursor = 'grab';
                            }
                        }}
                        onPointerOut={() => {
                            setHovered(false);
                            document.body.style.cursor = '';
                        }}
                    />

                    {/* Outline when hovered */}
                    {hovered && (
                        <mesh geometry={humanGeometry}>
                            <meshBasicMaterial
                                color="#ffffff"
                                side={THREE.DoubleSide}
                                transparent
                                opacity={0.3}
                                depthTest={false}
                            />
                        </mesh>
                    )}
                </group>

                {/* Shadow circle at feet */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <circleGeometry args={[0.3 * figure.scale, 16]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.25} />
                </mesh>
            </Billboard>

            {/* Delete menu */}
            {showMenu && isPlacementMode && (
                <Html center position={[0, (1.8 * figure.scale) + 0.3, 0]} style={{ pointerEvents: 'auto' }}>
                    <div
                        className="bg-gray-900/95 backdrop-blur-md rounded-lg border border-white/20 p-2 flex gap-2 shadow-2xl"
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        <button
                            onClick={() => {
                                removePaperFigure(figure.id);
                                setShowMenu(false);
                            }}
                            className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs rounded-md transition-colors flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            刪除
                        </button>
                        <button
                            onClick={() => setShowMenu(false)}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-md transition-colors"
                        >
                            取消
                        </button>
                    </div>
                </Html>
            )}
        </group>
    );
}

const FIGURE_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#00cec9'];

// ─── Main Renderer ────────────────────────────────────────────
export function PaperFigureRenderer() {
    const paperFigures = useStore(s => s.paperFigures);
    const paperFigureMode = useStore(s => s.paperFigureMode);
    const addPaperFigure = useStore(s => s.addPaperFigure);
    const { scene, raycaster, pointer, camera } = useThree();

    // 紙片小人尺寸:原 1.045 縮小 15% → 0.888(人形 shape 高約 1.77,縮放後更貼近真人比例)
    const FIGURE_SCALE = 0.888;
    // 落地點 Y 微調(場景單位):往上約 0.05,修正浮空/陷地
    const PLACE_Y_OFFSET = 0.05;

    // 去抖鎖:onPointerMissed 在單次點擊中可能被觸發多次(觸控/多按鈕),
    // 用時間鎖確保「一次點擊只生成一個」
    const lastPlaceRef = useRef(0);

    // Use onPointerMissed on a group — when clicking anywhere NOT on a figure mesh,
    // raycast against the entire scene to find the real intersection point on models/floor
    const handleSceneClick = useCallback((e: MouseEvent) => {
        if (!paperFigureMode) return;
        // 只接受滑鼠左鍵(右鍵/中鍵不放置)
        if (e.button !== 0) return;
        // 去抖:120ms 內的重複觸發視為同一次點擊
        const now = Date.now();
        if (now - lastPlaceRef.current < 120) return;

        // Update raycaster from pointer
        raycaster.setFromCamera(pointer, camera);

        // Raycast against all scene children (models, floor, etc.)
        const intersects = raycaster.intersectObjects(scene.children, true)
            .filter(hit => {
                // 跳過不可見物件、helper(axesHelper/gizmo 等)、無面幾何
                const o = hit.object as THREE.Mesh;
                if (!o.visible) return false;
                if (o.type.includes('Helper') || o.type === 'Line' || o.type === 'LineSegments') return false;
                if (!o.geometry) return false;
                // 跳過紙片小人自身(避免疊放時打到別的小人)
                let obj: THREE.Object3D | null = hit.object;
                while (obj) {
                    if (obj.userData?.isPaperFigure) return false;
                    if (obj.visible === false) return false;
                    obj = obj.parent;
                }
                return true;
            });

        if (intersects.length === 0) return;

        // intersectObjects 已依距離排序,取最近的命中點 = 使用者實際看到的表面
        const point = intersects[0].point;
        lastPlaceRef.current = now;
        const colorIdx = Math.floor(Math.random() * FIGURE_COLORS.length);

        addPaperFigure({
            id: `fig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            // 落地點微調:命中點略微上抬,避免腳陷入地面/浮空(見 PLACE_Y_OFFSET)
            position: [point.x, point.y + PLACE_Y_OFFSET, point.z],
            scale: FIGURE_SCALE,
            color: FIGURE_COLORS[colorIdx],
        });
    }, [paperFigureMode, addPaperFigure, scene, raycaster, pointer, camera]);

    return (
        <group onPointerMissed={handleSceneClick} userData={{ isPaperFigure: true }}>
            {/* Render all figures */}
            {paperFigures.map(figure => (
                <PaperFigureMesh
                    key={figure.id}
                    figure={figure}
                    isPlacementMode={paperFigureMode}
                />
            ))}
        </group>
    );
}

