import { OrbitControls, PerspectiveCamera, TransformControls , useProgress } from '@react-three/drei';
import { useStore, StageObject } from '@/store/useStore';
import type { NullNode } from '@/store/useStore';
import { StageObjectRenderer } from './StageObjectRenderer';
import { BoxPrimitiveRenderer } from './BoxPrimitiveRenderer';
import { ProjectionScreenRenderer } from './ProjectionScreenRenderer';
import { PaperFigureRenderer } from './PaperFigureRenderer';
import { CameraCapture } from './CameraCapture';
import { VideoManager } from './VideoManager';
import { VideoTimelineController } from './VideoTimelineController';
import { StageLightRenderer, StageLightRendererHandle } from './StageLightRenderer';
import { WalkModeController } from './WalkModeController';
import { MeasurementScene } from '@/components/client/MeasurementOverlay';
import { EffectComposer, Bloom, SMAA, ToneMapping, N8AO, Vignette } from '@react-three/postprocessing';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useRef, useEffect, useCallback, createRef, useState, useMemo } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PerfectRenderEnvironment } from './PerfectRenderEnvironment';
import { ToneMappingMode } from 'postprocessing';
import { rigDelta, rigVisibility, addVec3 } from '@/lib/rig-utils';
import { CameraMarkers } from './CameraMarkers';
import { setParallaxBox, setParallaxEnabled } from '@/lib/parallax-envmap';

// 精簡模式:LED 永遠保留 + 後台指定 keepIds;其餘不渲染(直接卸載,省 draw call/材質/useFrame)
function liteVisible(obj: { id: string; type: string }, liteMode: boolean, keepIds: string[]): boolean {
    if (!liteMode) return true;
    if (obj.type === 'static_LED' || obj.type === 'moving_LED') return true;
    return keepIds.includes(obj.id);
}

/**
 * 首幀信號:資產載入完成後,實際渲染出第一幀時通知 store。
 * 載入進行中會把旗標歸零,確保旗標語意 = 「資產完成後的首幀」。
 * AssetLoadingOverlay 以此作為隱藏 loading 畫面的最終關卡。
 */
function FirstFrameGate() {
    const { active } = useProgress();
    const setFirstFrameRendered = useStore((state) => state.setFirstFrameRendered);
    const framesAfterIdleRef = useRef(0);

    useFrame(() => {
        const flag = useStore.getState().firstFrameRendered;
        if (active) {
            // 載入活動中:歸零(進入新一輪載入)
            framesAfterIdleRef.current = 0;
            if (flag) setFirstFrameRendered(false);
        } else {
            // 無載入活動:連續渲染數幀後判定首幀已穩定呈現
            framesAfterIdleRef.current += 1;
            if (framesAfterIdleRef.current >= 2 && !flag) {
                setFirstFrameRendered(true);
            }
        }
    });

    return null;
}

/**
 * Null 虛影標記:八面體線框 + 軸向輔助線。
 * Admin 模式恆顯示;gizmo 開啟時可點選(選取後出現 TransformControls)。
 */
function NullMarker({
    node,
    isSelected,
    gizmoEnabled,
    setSelectedNull,
}: {
    node: NullNode;
    isSelected: boolean;
    gizmoEnabled: boolean;
    setSelectedNull: (id: string | null) => void;
}) {
    return (
        <group>
            <axesHelper args={[isSelected ? 1.5 : 0.8]} />
            {/* 可點擊的虛影本體 */}
            <mesh
                onClick={(e) => {
                    if (!gizmoEnabled) return;
                    e.stopPropagation();
                    setSelectedNull(isSelected ? null : node.id);
                }}
                onPointerOver={(e) => {
                    if (!gizmoEnabled) return;
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    document.body.style.cursor = 'auto';
                }}
            >
                <octahedronGeometry args={[0.35, 0]} />
                <meshBasicMaterial
                    color={isSelected ? '#8b5cf6' : '#9ca3af'}
                    wireframe
                    transparent
                    opacity={isSelected ? 1 : 0.55}
                    depthTest={false}
                />
            </mesh>
            {/* 放大點擊判定範圍的隱形球 */}
            <mesh
                visible={false}
                onClick={(e) => {
                    if (!gizmoEnabled) return;
                    e.stopPropagation();
                    setSelectedNull(isSelected ? null : node.id);
                }}
            >
                <sphereGeometry args={[0.5, 8, 8]} />
            </mesh>
        </group>
    );
}

/**
 * Null 節點 → 巢狀 <group> 遞迴渲染。
 * 外層 group = 基底 pos/rot(TransformControls 操作對象,寫回 store);
 * 內層 group = 機關偏移(rig delta),沿 Null 自身的本地軸作用。
 */
function NullGroup({
    node,
    objectRefs,
    nullRefs,
    realtimeEnvMap,
    gizmoEnabled,
    setSelectedObject,
}: {
    node: NullNode;
    objectRefs: React.MutableRefObject<Map<string, { current: THREE.Group | null }>>;
    nullRefs: React.MutableRefObject<Map<string, { current: THREE.Group | null }>>;
    realtimeEnvMap: THREE.CubeTexture | null;
    gizmoEnabled: boolean;
    setSelectedObject: (id: string | null) => void;
}) {
    const nulls = useStore((state) => state.nulls);
    const stageObjects = useStore((state) => state.stageObjects);
    const rigs = useStore((state) => state.rigs);
    // [效能重構] 不全量訂閱 rigValues——只訂「作用於此 Null 的機關值」指紋,
    // 拖無關滑桿不會讓整棵 Null 樹 re-render。
    const rigFingerprint = useStore((state) => {
        let fp = '';
        for (const r of state.rigs) {
            if (r.targetType !== 'null' || r.targetId !== node.id) continue;
            fp += r.id + ':' + (state.rigValues[r.id] ?? r.defaultValue) + ';';
        }
        return fp;
    });
    // delta/可見性依指紋重算(getState 取值,無關變化不觸發)
    const { delta, nullVisible } = useMemo(() => {
        const st = useStore.getState();
        return {
            delta: rigDelta(st.rigs, st.rigValues, 'null', node.id),
            nullVisible: rigVisibility(st.rigs, st.rigValues, 'null', node.id),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rigFingerprint, node.id]);
    const mode = useStore((state) => state.mode);
    const selectedNullId = useStore((state) => state.selectedNullId);
    const setSelectedNull = useStore((state) => state.setSelectedNull);


    const childNulls = nulls.filter(n => n.parentId === node.id);
    const liteMode = useStore((state) => state.liteMode);
    const liteModeKeepIds = useStore((state) => state.liteModeKeepIds);
    const allChildObjects = stageObjects.filter(o => o.parentId === node.id && liteVisible(o, liteMode, liteModeKeepIds));
    const childObjects = allChildObjects.filter(o => !o.rigMirror);
    const mirroredObjects = allChildObjects.filter(o => o.rigMirror);

    // 鏡像跟隨:機關偏移 ×-1(位移反向、旋轉反向),供對稱機關使用
    const negDelta = {
        pos: [-delta.pos[0], -delta.pos[1], -delta.pos[2]] as [number, number, number],
        rot: [-delta.rot[0], -delta.rot[1], -delta.rot[2]] as [number, number, number],
    };

    const nullRef = nullRefs.current.get(node.id);

    return (
        <group
            ref={(el) => { if (nullRef) nullRef.current = el; }}
            position={node.pos}
            rotation={node.rot}
        >
            {/* Admin 模式:顯示可點選的軸心虛影(客戶端看不到) */}
            {mode === 'admin' && (
                <NullMarker
                    node={node}
                    isSelected={selectedNullId === node.id}
                    gizmoEnabled={gizmoEnabled}
                    setSelectedNull={setSelectedNull}
                />
            )}

            {/* 機關偏移層:位移/旋轉沿 Null 自身本地軸作用;可見性控制子物件顯示 */}
            <group position={delta.pos} rotation={delta.rot} visible={nullVisible !== false}>

            {childNulls.map(n => (
                <NullGroup
                    key={n.id}
                    node={n}
                    objectRefs={objectRefs}
                    nullRefs={nullRefs}
                    realtimeEnvMap={realtimeEnvMap}
                    gizmoEnabled={gizmoEnabled}
                    setSelectedObject={setSelectedObject}
                />
            ))}

            {childObjects.map(obj => {
                const objRef = objectRefs.current.get(obj.id);
                const Renderer = obj.model_path === '__box__'
                    ? BoxPrimitiveRenderer
                    : obj.model_path === '__projection_screen__'
                        ? ProjectionScreenRenderer
                        : StageObjectRenderer;

                return (
                    <ErrorBoundary
                        key={obj.id}
                        fallback={
                            <mesh position={obj.instances[0]?.pos || [0, 0, 0]}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial color="red" wireframe />
                            </mesh>
                        }
                    >
                        <Renderer
                            ref={objRef}
                            object={obj}
                            envMap={realtimeEnvMap}
                            onClick={(e: ThreeEvent<MouseEvent>) => {
                                // 後台隨時可點擊選中(不再要求開啟變換工具),方便快速定位模型改數值
                                if (mode === 'admin') {
                                    e.stopPropagation();
                                    setSelectedObject(obj.id);
                                }
                            }}
                        />
                    </ErrorBoundary>
                );
            })}
            </group>
            {/* 鏡像跟隨層:同一個機關,偏移以 ×-1 作用 */}
            {mirroredObjects.length > 0 && (
                <group position={negDelta.pos} rotation={negDelta.rot}>
                    {mirroredObjects.map(obj => {
                        const objRef = objectRefs.current.get(obj.id);
                        const Renderer = obj.model_path === '__box__'
                            ? BoxPrimitiveRenderer
                            : obj.model_path === '__projection_screen__'
                                ? ProjectionScreenRenderer
                                : StageObjectRenderer;
                        return (
                            <ErrorBoundary
                                key={obj.id}
                                fallback={
                                    <mesh position={obj.instances[0]?.pos || [0, 0, 0]}>
                                        <boxGeometry args={[1, 1, 1]} />
                                        <meshStandardMaterial color="red" wireframe />
                                    </mesh>
                                }
                            >
                                <Renderer
                                    ref={objRef}
                                    object={obj}
                                    envMap={realtimeEnvMap}
                                    onClick={(e: ThreeEvent<MouseEvent>) => {
                                        if (mode === 'admin') {
                                            e.stopPropagation();
                                            setSelectedObject(obj.id);
                                        }
                                    }}
                                />
                            </ErrorBoundary>
                        );
                    })}
                </group>
            )}
        </group>
    );
}

export function SceneGraph() {
    const stageObjects = useStore((state) => state.stageObjects);
    const nulls = useStore((state) => state.nulls);
    const ambientIntensity = useStore((state) => state.ambientIntensity);
    const directionalIntensity = useStore((state) => state.directionalIntensity);
    const mainLightAzimuth = useStore((state) => state.mainLightAzimuth);
    const mainLightElevation = useStore((state) => state.mainLightElevation);
    const bloomIntensity = useStore((state) => state.bloomIntensity);
    const bloomThreshold = useStore((state) => state.bloomThreshold);

    // Editor state for TransformControls
    const mode = useStore((state) => state.mode);
    const gizmoEnabled = useStore((state) => state.gizmoEnabled);
    const selectedObjectId = useStore((state) => state.selectedObjectId);
    const setSelectedObject = useStore((state) => state.setSelectedObject);
    const selectedLightId = useStore((state) => state.selectedLightId);
    const updateStageLight = useStore((state) => state.updateStageLight);
    const selectedNullId = useStore((state) => state.selectedNullId);
    const updateNull = useStore((state) => state.updateNull);
    const transformMode = useStore((state) => state.transformMode);
    const updateObjectTransform = useStore((state) => state.updateObjectTransform);

    // Perfect Render Mode state
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);

    const controlsRef = useRef<OrbitControlsImpl>(null);
    const cubeCameraRef = useRef<THREE.CubeCamera>(null);
    const [realtimeEnvMap, setRealtimeEnvMap] = useState<THREE.CubeTexture | null>(null);
    const frameCounter = useRef(0);
    const transformRef = useRef<any>(null);
    const lightTransformRef = useRef<any>(null);
    const stageLightRendererRef = useRef<StageLightRendererHandle>(null);
    const objectRefsRef = useRef<Map<string, { current: THREE.Group | null }>>(new Map());
    const liteModeTop = useStore((state) => state.liteMode);
    const liteKeepIdsTop = useStore((state) => state.liteModeKeepIds);
    const nullRefsRef = useRef<Map<string, { current: THREE.Group | null }>>(new Map());
    const nullTransformRef = useRef<any>(null);
    const activeViewId = useStore((state) => state.activeViewId);
    const views = useStore((state) => state.views);
    const setActiveView = useStore((state) => state.setActiveView);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const fov = useStore((state) => state.fov);
    const setFov = useStore((state) => state.setFov);

    // Drawing mode — disable orbit when drawing is active
    const drawingMode = useStore((state) => state.drawingMode);

    // Paper Figure mode
    const paperFigureMode = useStore((state) => state.paperFigureMode);

    // Walk Mode (first person)
    const walkMode = useStore((state) => state.walkMode);

    // Measurement Mode
    const measureMode = useStore((state) => state.measureMode);

    // Create/update refs for all objects (using mutable ref objects)
    useEffect(() => {
        stageObjects.forEach(obj => {
            if (!objectRefsRef.current.has(obj.id)) {
                objectRefsRef.current.set(obj.id, { current: null });
            }
        });

        // Clean up removed objects
        const currentIds = new Set(stageObjects.map(o => o.id));
        const keysToDelete: string[] = [];
        objectRefsRef.current.forEach((_, key) => {
            if (!currentIds.has(key)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => objectRefsRef.current.delete(key));
    }, [stageObjects]);

    // Create/update refs for all rig Null nodes (same pattern as objects)
    useEffect(() => {
        nulls.forEach(node => {
            if (!nullRefsRef.current.has(node.id)) {
                nullRefsRef.current.set(node.id, { current: null });
            }
        });
        const currentIds = new Set(nulls.map(n => n.id));
        const keysToDelete: string[] = [];
        nullRefsRef.current.forEach((_, key) => {
            if (!currentIds.has(key)) keysToDelete.push(key);
        });
        keysToDelete.forEach(key => nullRefsRef.current.delete(key));
    }, [nulls]);

    // CubeCamera for realtime LED reflections on stage surfaces
    useEffect(() => {
        if (!perfectRenderEnabled) {
            if (cubeCameraRef.current) {
                cubeCameraRef.current.renderTarget.dispose();
                cubeCameraRef.current = null;
                setRealtimeEnvMap(null);
                setParallaxEnabled(false);
            }
            return;
        }

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, { // 128:反射柔糊已足夠,像素/PMREM 成本降 4 倍
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
        });
        const cubeCamera = new THREE.CubeCamera(0.1, 300, cubeRenderTarget); // far 300:反射貼圖中遠景不可辨,大 far 只會爆炸性增加 6 面渲染成本
        cubeCamera.position.set(0, 1, 0); // Position at stage level
        cubeCameraRef.current = cubeCamera;
        setRealtimeEnvMap(cubeRenderTarget.texture);
        setParallaxEnabled(true); // 反射 parallax 校正隨 perfect render 啟用

        return () => {
            cubeRenderTarget.dispose();
            cubeCameraRef.current = null;
        };
    }, [perfectRenderEnabled]);

    // Animation state refs (to avoid re-renders during animation)
    const animationRef = useRef<{
        active: boolean;
        startTime: number;
        duration: number;
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        startTarget: THREE.Vector3;
        endTarget: THREE.Vector3;
        startFov: number;
        endFov: number;
    } | null>(null);

    // Initialize camera animation when view changes
    useEffect(() => {
        if (!activeViewId || !controlsRef.current || !cameraRef.current) return;

        const view = views.find(v => v.id === activeViewId);
        if (!view) return;

        animationRef.current = {
            active: true,
            startTime: performance.now(),
            duration: 800, // Reduced for snappier transitions
            startPos: cameraRef.current.position.clone(),
            endPos: new THREE.Vector3(...view.camera.position),
            startTarget: controlsRef.current.target.clone(),
            endTarget: new THREE.Vector3(...view.camera.target),
            startFov: cameraRef.current.fov,
            endFov: view.camera.fov,
        };
        // Update store FOV immediately so UI reflects target
        setFov(view.camera.fov);
    }, [activeViewId, views]);

    // Run animation in useFrame for sync with render loop
    useFrame(({ invalidate, gl, scene }) => {
        // CubeCamera update for realtime LED reflections (every 3 frames)
        if (cubeCameraRef.current && perfectRenderEnabled) {
            frameCounter.current++;
            if (frameCounter.current % 12 === 0) { // 每 12 幀:反射延遲 ~0.2s 無感,CubeCamera 成本降 4 倍
                cubeCameraRef.current.update(gl, scene);
            }
            // Parallax 包圍盒自動計算(每 60 幀,零訂閱):venues 物件聯集,適配 50m~500m 場館
            if (frameCounter.current % 60 === 1) {
                const st = useStore.getState();
                const ids = st.stageObjects.filter(o => o.type === 'venues').map(o => o.id);
                const useIds = ids.length > 0 ? ids : st.stageObjects.map(o => o.id);
                let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                for (const id of useIds) {
                    const b = st.objectBounds[id];
                    if (!b) continue;
                    minX = Math.min(minX, b.min[0]); minY = Math.min(minY, b.min[1]); minZ = Math.min(minZ, b.min[2]);
                    maxX = Math.max(maxX, b.max[0]); maxY = Math.max(maxY, b.max[1]); maxZ = Math.max(maxZ, b.max[2]);
                }
                if (Number.isFinite(minX) && maxX > minX) {
                    setParallaxBox([minX, minY, minZ], [maxX, maxY, maxZ], [0, 1, 0]);
                }
            }
        }

        const anim = animationRef.current;
        if (!anim || !anim.active || !cameraRef.current || !controlsRef.current) return;

        const elapsed = performance.now() - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        cameraRef.current.position.lerpVectors(anim.startPos, anim.endPos, ease);
        controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, ease);

        // Lerp FOV
        cameraRef.current.fov = THREE.MathUtils.lerp(anim.startFov, anim.endFov, ease);
        cameraRef.current.updateProjectionMatrix();

        controlsRef.current.update();

        // Request next frame (for demand frameloop)
        invalidate();

        if (progress >= 1) {
            anim.active = false;
        }
    });

    return (
        <>
            {/* CubeCamera for realtime LED reflections */}
            {cubeCameraRef.current && <primitive object={cubeCameraRef.current} />}

            {/* 3D 機位模型(導播參考) */}
            <CameraMarkers />

            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                position={[0, 5, 20]}
                fov={fov}
                near={0.1}
                far={5000}
            />

            {/* OrbitControls with vertical rotation limits (disabled during drawing/walkMode) */}
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enabled={!drawingMode && !paperFigureMode && !walkMode}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={500}
                minPolarAngle={0.1}
                maxPolarAngle={Math.PI * 0.85}
                dampingFactor={0.05}
                enableDamping={true}
                onStart={() => {
                    // Clear active view when user starts interacting with camera
                    if (activeViewId) {
                        setActiveView(null);
                    }
                }}
            />

            {/* Walk Mode Controller — always mounted so WASD auto-enter works */}
            <WalkModeController />

            {/* Helper component to capture camera state when triggered from Admin UI */}
            <CameraCapture controlsRef={controlsRef} />

            {/* Video Manager and its Timeline Cue Controller */}
            <VideoManager />
            <FirstFrameGate />
            <VideoTimelineController />

            {/* Paper Figures (Billboard Sprites) */}
            <PaperFigureRenderer />

            {/* 3D Measurement Overlay */}
            <MeasurementScene />

            {/* Enhanced lighting for better model visibility */}
            <ambientLight intensity={ambientIntensity} />
            <directionalLight
                position={[
                    20 * Math.cos(mainLightElevation * Math.PI / 180) * Math.sin(mainLightAzimuth * Math.PI / 180),
                    20 * Math.sin(mainLightElevation * Math.PI / 180),
                    20 * Math.cos(mainLightElevation * Math.PI / 180) * Math.cos(mainLightAzimuth * Math.PI / 180)
                ]}
                intensity={directionalIntensity}
                castShadow={perfectRenderEnabled}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
                shadow-camera-near={0.1}
                shadow-camera-far={60}
                shadow-bias={-0.001}
            />
            <directionalLight position={[-10, 10, -5]} intensity={directionalIntensity * 0.4} />
            <hemisphereLight intensity={0.4} groundColor="#444" />

            {/* Perfect Render Environment - HDR, SpotLights, ContactShadows */}
            <PerfectRenderEnvironment />

            {/* Stage Light System - dynamic lights only in Perfect Render */}
            <StageLightRenderer ref={stageLightRendererRef} />

            {/* ===== 場景層級渲染 ===== */}
            {/* 根層 Null(無 parent 或 parent 已不存在 → fallback 到根層) */}
            {nulls
                .filter(n => !n.parentId || !nulls.some(p => p.id === n.parentId))
                .map(n => (
                    <NullGroup
                        key={n.id}
                        node={n}
                        objectRefs={objectRefsRef}
                        nullRefs={nullRefsRef}
                        realtimeEnvMap={realtimeEnvMap}
                        gizmoEnabled={gizmoEnabled}
                        setSelectedObject={setSelectedObject}
                    />
                ))}

            {/* 未掛載到任何 Null 的物件(含 parent 已被刪除的孤兒) */}
            {stageObjects
                .filter(obj => (!obj.parentId || !nulls.some(n => n.id === obj.parentId)) && liteVisible(obj, liteModeTop, liteKeepIdsTop))
                .map((obj) => {
                    const objRef = objectRefsRef.current.get(obj.id);
                    const Renderer = obj.model_path === '__box__'
                        ? BoxPrimitiveRenderer
                        : obj.model_path === '__projection_screen__'
                            ? ProjectionScreenRenderer
                            : StageObjectRenderer;

                    return (
                        <ErrorBoundary
                            key={obj.id}
                            fallback={
                                <mesh position={obj.instances[0]?.pos || [0, 0, 0]}>
                                    <boxGeometry args={[1, 1, 1]} />
                                    <meshStandardMaterial color="red" wireframe />
                                </mesh>
                            }
                        >
                            <Renderer
                                ref={objRef}
                                object={obj}
                                envMap={realtimeEnvMap}
                                onClick={(e: ThreeEvent<MouseEvent>) => {
                                    if (mode === 'admin' && gizmoEnabled) {
                                        e.stopPropagation();
                                        setSelectedObject(obj.id);
                                    }
                                }}
                            />
                        </ErrorBoundary>
                    );
                })}

            {/* TransformControls for rig Null nodes (when Gizmo is enabled + null selected) */}
            {mode === 'admin' && gizmoEnabled && selectedNullId && (() => {
                const nullRef = nullRefsRef.current.get(selectedNullId);
                if (!nullRef || !nullRef.current) return null;

                return (
                    <TransformControls
                        ref={nullTransformRef}
                        object={nullRef.current}
                        mode={transformMode === 'scale' ? 'translate' : transformMode}
                        translationSnap={null}
                        rotationSnap={Math.PI / 180} // 1 degree
                        onObjectChange={() => {
                            const g = nullRef.current;
                            if (g) {
                                // group 是巢狀子節點,position/rotation 即為相對 parent 的本地座標,
                                // 直接寫回 NullNode 的基底 transform(機關偏移在內層 group,不受污染)
                                updateNull(selectedNullId, {
                                    pos: [g.position.x, g.position.y, g.position.z],
                                    rot: [g.rotation.x, g.rotation.y, g.rotation.z],
                                });
                            }
                        }}
                        onMouseDown={() => {
                            if (controlsRef.current) controlsRef.current.enabled = false;
                        }}
                        onMouseUp={() => {
                            if (controlsRef.current) controlsRef.current.enabled = true;
                        }}
                    />
                );
            })()}

            {/* TransformControls for Admin Mode (when Gizmo is enabled) */}
            {mode === 'admin' && gizmoEnabled && selectedObjectId && (() => {
                const objRef = objectRefsRef.current.get(selectedObjectId);
                if (!objRef || !objRef.current) return null;

                return (
                    <TransformControls
                        ref={transformRef}
                        object={objRef.current}
                        mode={transformMode}
                        translationSnap={1}
                        rotationSnap={Math.PI / 180} // 1 degree
                        scaleSnap={0.1}
                        onObjectChange={() => {
                            if (objRef.current) {
                                const obj = objRef.current;
                                updateObjectTransform(
                                    selectedObjectId,
                                    [obj.position.x, obj.position.y, obj.position.z],
                                    [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                                    [obj.scale.x, obj.scale.y, obj.scale.z]
                                );
                            }
                        }}
                        onMouseDown={() => {
                            // Disable OrbitControls while dragging
                            if (controlsRef.current) controlsRef.current.enabled = false;
                        }}
                        onMouseUp={() => {
                            // Re-enable OrbitControls
                            if (controlsRef.current) controlsRef.current.enabled = true;
                        }}
                    />
                );
            })()}

            {/* TransformControls for Stage Lights (when Gizmo is enabled + light selected) */}
            {mode === 'admin' && gizmoEnabled && selectedLightId && (() => {
                const lightObj = stageLightRendererRef.current?.getLightRef(selectedLightId);
                if (!lightObj) return null;

                return (
                    <TransformControls
                        ref={lightTransformRef}
                        object={lightObj}
                        mode={transformMode === 'scale' ? 'translate' : transformMode}
                        translationSnap={0.5}
                        rotationSnap={Math.PI / 36}
                        onObjectChange={() => {
                            if (lightObj) {
                                updateStageLight(selectedLightId, {
                                    position: [
                                        lightObj.position.x,
                                        lightObj.position.y,
                                        lightObj.position.z
                                    ] as [number, number, number],
                                    rotation: [
                                        lightObj.rotation.x,
                                        lightObj.rotation.y,
                                        lightObj.rotation.z
                                    ] as [number, number, number],
                                });
                            }
                        }}
                        onMouseDown={() => {
                            if (controlsRef.current) controlsRef.current.enabled = false;
                        }}
                        onMouseUp={() => {
                            if (controlsRef.current) controlsRef.current.enabled = true;
                        }}
                    />
                );
            })()}

            {/* Ground plane - simple dark surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
            </mesh>

            {/* Post-Processing Effects */}
            {perfectRenderEnabled ? (
                <EffectComposer multisampling={0}>
                    <N8AO
                        aoRadius={2}
                        distanceFalloff={1}
                        intensity={3}
                        color="black"
                        halfRes={false}
                        quality="medium"
                    />
                    <Bloom
                        intensity={bloomIntensity * 1.5}
                        luminanceThreshold={bloomThreshold}
                        luminanceSmoothing={0.9}
                        mipmapBlur={true}
                        resolutionX={1024}
                        resolutionY={1024}
                    />
                    <SMAA />
                    {/* 電影感暗角(僅完美渲染;無噪點,保持清晰) */}
                    <Vignette offset={0.28} darkness={0.55} eskil={false} />
                </EffectComposer>
            ) : bloomIntensity > 0 ? (
                <EffectComposer multisampling={0}>
                    <Bloom
                        intensity={bloomIntensity}
                        luminanceThreshold={bloomThreshold}
                        luminanceSmoothing={0.9}
                        mipmapBlur={true}
                        resolutionX={512}
                        resolutionY={512}
                    />
                    <SMAA />
                </EffectComposer>
            ) : null}
        </>
    );
}
