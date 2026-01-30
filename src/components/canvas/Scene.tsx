'use client';

import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { SceneGraph } from './SceneGraph';
import { Suspense, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { setCanvasRef } from '@/components/client/VideoControls';

function LoadingFallback() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#333" wireframe />
        </mesh>
    );
}

// Component to capture canvas reference
function CanvasRefCapture() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        // Find the canvas element after mount
        const findCanvas = () => {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvasRef.current = canvas;
                setCanvasRef(canvas);
            }
        };

        // Small delay to ensure canvas is mounted
        const timer = setTimeout(findCanvas, 100);

        return () => {
            clearTimeout(timer);
            setCanvasRef(null);
        };
    }, []);

    return null;
}

export default function Scene() {
    // Dynamic frameloop: 'always' when video is playing or recording, 'demand' otherwise
    const videoPlaying = useStore((state) => state.videoPlaying);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const isRecordingMode = useStore((state) => state.isRecordingMode);
    const gizmoEnabled = useStore((state) => state.gizmoEnabled);

    // Check if active content is a video (support both 'video' and 'r2_video')
    const activeContent = activeContentId
        ? contentTextures.find(t => t.id === activeContentId)
        : null;
    const isVideoActive = activeContent?.type === 'video' || activeContent?.type === 'r2_video';

    // Use 'always' frameloop when video is playing, recording, or Gimzo is enabled
    const frameloop = (isVideoActive && videoPlaying) || isRecordingMode || gizmoEnabled ? 'always' : 'demand';

    return (
        <Canvas
            gl={{
                antialias: true,
                powerPreference: 'high-performance',
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: true,
                alpha: false,
            }}
            dpr={[1, 2]}
            camera={{ position: [0, 5, 10], fov: 50 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            shadows="soft"
            frameloop={frameloop}
        >
            <color attach="background" args={['#000']} />

            <Suspense fallback={<LoadingFallback />}>
                <SceneGraph />
            </Suspense>

            <Preload all />
            <CanvasRefCapture />
        </Canvas>
    );
}
