import { OrbitControls, PerspectiveCamera, TransformControls, MeshReflectorMaterial, CubeCamera } from '@react-three/drei';
import { useStore, StageObject } from '@/store/useStore';
import { StageObjectRenderer } from './StageObjectRenderer';
import { PaperFigureRenderer } from './PaperFigureRenderer';
import { CameraCapture } from './CameraCapture';
import { VideoManager } from './VideoManager';
import { EffectComposer, Bloom, SMAA, ToneMapping } from '@react-three/postprocessing';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useRef, useEffect, useCallback, createRef, useState } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PerfectRenderEnvironment } from './PerfectRenderEnvironment';
import { ToneMappingMode } from 'postprocessing';

export function SceneGraph() {
    const stageObjects = useStore((state) => state.stageObjects);
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
    const transformMode = useStore((state) => state.transformMode);
    const updateObjectTransform = useStore((state) => state.updateObjectTransform);

    // Perfect Render Mode state
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const reflectionMirror = useStore((state) => state.reflectionMirror);
    const reflectionBlur = useStore((state) => state.reflectionBlur);
    const reflectionMetalness = useStore((state) => state.reflectionMetalness);

    const controlsRef = useRef<OrbitControlsImpl>(null);
    const cubeCameraRef = useRef<THREE.CubeCamera>(null);
    const [realtimeEnvMap, setRealtimeEnvMap] = useState<THREE.CubeTexture | null>(null);
    const frameCounter = useRef(0);
    const transformRef = useRef<any>(null);
    const objectRefsRef = useRef<Map<string, { current: THREE.Group | null }>>(new Map());
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

    // CubeCamera for realtime LED reflections on stage surfaces
    useEffect(() => {
        if (!perfectRenderEnabled) {
            if (cubeCameraRef.current) {
                cubeCameraRef.current.renderTarget.dispose();
                cubeCameraRef.current = null;
                setRealtimeEnvMap(null);
            }
            return;
        }

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
        });
        const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
        cubeCamera.position.set(0, 1, 0); // Position at stage level
        cubeCameraRef.current = cubeCamera;
        setRealtimeEnvMap(cubeRenderTarget.texture);

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
            if (frameCounter.current % 3 === 0) {
                cubeCameraRef.current.update(gl, scene);
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

            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                position={[0, 5, 20]}
                fov={fov}
            />

            {/* OrbitControls with vertical rotation limits (disabled during drawing) */}
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enabled={!drawingMode && !paperFigureMode}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={100}
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

            {/* Helper component to capture camera state when triggered from Admin UI */}
            <CameraCapture controlsRef={controlsRef} />

            {/* Video Manager */}
            <VideoManager />

            {/* Paper Figures (Billboard Sprites) */}
            <PaperFigureRenderer />

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

            {/* Ground plane - with optional reflection */}
            {perfectRenderEnabled ? (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                    <planeGeometry args={[100, 100]} />
                    <MeshReflectorMaterial
                        blur={[reflectionBlur * 50, reflectionBlur * 50]}
                        resolution={2048}
                        mixBlur={1}
                        mixStrength={reflectionMirror * 2}
                        roughness={0.15}
                        depthScale={1.2}
                        minDepthThreshold={0.4}
                        maxDepthThreshold={1.4}
                        color="#111111"
                        metalness={reflectionMetalness}
                        mirror={reflectionMirror}
                    />
                </mesh>
            ) : (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
                </mesh>
            )}

            {/* Post-Processing Effects */}
            {perfectRenderEnabled ? (
                <EffectComposer multisampling={4}>
                    <Bloom
                        intensity={bloomIntensity * 1.5}
                        luminanceThreshold={bloomThreshold}
                        luminanceSmoothing={0.9}
                        mipmapBlur={true}
                        resolutionX={1024}
                        resolutionY={1024}
                    />
                    <SMAA />
                </EffectComposer>
            ) : (
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
            )}
        </>
    );
}
