import { OrbitControls, PerspectiveCamera, TransformControls } from '@react-three/drei';
import { useStore, StageObject } from '@/store/useStore';
import { StageObjectRenderer } from './StageObjectRenderer';
import { CameraCapture } from './CameraCapture';
import { VideoManager } from './VideoManager';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useRef, useEffect, useCallback, createRef } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function SceneGraph() {
    const stageObjects = useStore((state) => state.stageObjects);
    const ambientIntensity = useStore((state) => state.ambientIntensity);
    const directionalIntensity = useStore((state) => state.directionalIntensity);
    const bloomIntensity = useStore((state) => state.bloomIntensity);
    const bloomThreshold = useStore((state) => state.bloomThreshold);

    // Editor state for TransformControls
    const mode = useStore((state) => state.mode);
    const gizmoEnabled = useStore((state) => state.gizmoEnabled);
    const selectedObjectId = useStore((state) => state.selectedObjectId);
    const setSelectedObject = useStore((state) => state.setSelectedObject);
    const transformMode = useStore((state) => state.transformMode);
    const updateObjectTransform = useStore((state) => state.updateObjectTransform);

    const controlsRef = useRef<OrbitControlsImpl>(null);
    const transformRef = useRef<any>(null);
    const objectRefsRef = useRef<Map<string, { current: THREE.Group | null }>>(new Map());
    const activeViewId = useStore((state) => state.activeViewId);
    const views = useStore((state) => state.views);
    const setActiveView = useStore((state) => state.setActiveView);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const fov = useStore((state) => state.fov);
    const setFov = useStore((state) => state.setFov);

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
    useFrame(({ invalidate }) => {
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
            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                position={[0, 5, 20]}
                fov={fov}
            />

            {/* Free OrbitControls - full rotation freedom */}
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={100}
                dampingFactor={0.05}
                enableDamping={true}
                onStart={() => {
                    // Clear active view when user starts interacting with camera
                    if (activeViewId) {
                        setActiveView(null);
                    }
                }}
            />

            {/* Helper component to capture camera state when triggered from Admin UI */}
            <CameraCapture controlsRef={controlsRef} />

            {/* Video Manager */}
            <VideoManager />

            {/* Enhanced lighting for better model visibility */}
            <ambientLight intensity={ambientIntensity} />
            <directionalLight position={[10, 10, 5]} intensity={directionalIntensity} castShadow />
            <directionalLight position={[-10, 10, -5]} intensity={directionalIntensity * 0.4} />
            <hemisphereLight intensity={0.4} groundColor="#444" />

            {/* Stage Objects from Store */}
            {stageObjects.map((obj) => {
                const objRef = objectRefsRef.current.get(obj.id);

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
                        <StageObjectRenderer
                            ref={objRef}
                            object={obj}
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

            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
            </mesh>

            {/* Post-Processing Effects */}
            {/* 
                Performance notes:
                - N8AO removed: For best results, bake AO in modeling software (Blender/Maya)
                - Bloom at half resolution for performance
                - SMAA is the most efficient AA with good quality
            */}
            <EffectComposer multisampling={0}>
                {/* Bloom for emissive glow - half resolution for performance */}
                <Bloom
                    intensity={bloomIntensity}
                    luminanceThreshold={bloomThreshold}
                    luminanceSmoothing={0.9}
                    mipmapBlur={true}
                    resolutionX={512}
                    resolutionY={512}
                />
                {/* SMAA anti-aliasing - best quality/performance balance */}
                <SMAA />
            </EffectComposer>
        </>
    );
}
