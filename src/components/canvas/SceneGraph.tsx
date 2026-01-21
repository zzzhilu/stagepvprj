import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { StageObjectRenderer } from './StageObjectRenderer';
import { CameraCapture } from './CameraCapture';
import { VideoManager } from './VideoManager';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function SceneGraph() {
    const stageObjects = useStore((state) => state.stageObjects);
    const ambientIntensity = useStore((state) => state.ambientIntensity);
    const directionalIntensity = useStore((state) => state.directionalIntensity);
    const bloomIntensity = useStore((state) => state.bloomIntensity);
    const bloomThreshold = useStore((state) => state.bloomThreshold);

    const controlsRef = useRef<OrbitControlsImpl>(null);
    const activeViewId = useStore((state) => state.activeViewId);
    const views = useStore((state) => state.views);
    const setActiveView = useStore((state) => state.setActiveView);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);

    // Animation state refs (to avoid re-renders during animation)
    const animationRef = useRef<{
        active: boolean;
        startTime: number;
        duration: number;
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        startTarget: THREE.Vector3;
        endTarget: THREE.Vector3;
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
        };
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
                fov={50}
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
            {stageObjects.map((obj) => (
                <ErrorBoundary
                    key={obj.id}
                    fallback={
                        <mesh position={obj.instances[0]?.pos || [0, 0, 0]}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial color="red" wireframe />
                        </mesh>
                    }
                >
                    <StageObjectRenderer object={obj} />
                </ErrorBoundary>
            ))}

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
