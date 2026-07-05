'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { SceneGraph } from './SceneGraph';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { setCanvasRef } from '@/components/client/VideoControls';
import { isMobileDevice } from '@/lib/device';

function LoadingFallback() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#333" wireframe />
        </mesh>
    );
}

// Component to capture canvas reference
// [效能重構配套] 3D 端不再訂閱 rigValues(改 useFrame getState 讀取以避免全場 re-render),
// 此元件專責:rigValues 變化時 invalidate,確保 demand frameloop 下拖機關滑桿畫面即時更新。
function RigInvalidator() {
    const invalidate = useThree((state) => state.invalidate);
    useEffect(() => {
        let prev = useStore.getState().rigValues;
        return useStore.subscribe((state) => {
            if (state.rigValues !== prev) {
                prev = state.rigValues;
                invalidate();
            }
        });
    }, [invalidate]);
    return null;
}

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
    // Dynamic frameloop: 'always' when video is playing, recording, Gimzo, or Perfect Render
    const videoPlaying = useStore((state) => state.videoPlaying);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const r2Videos = useStore((state) => state.r2Videos);
    const gdriveVideos = useStore((state) => state.gdriveVideos);
    const isRecordingMode = useStore((state) => state.isRecordingMode);
    const gizmoEnabled = useStore((state) => state.gizmoEnabled);
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const paperFigureMode = useStore((state) => state.paperFigureMode);
    const paperFigures = useStore((state) => state.paperFigures);
    const walkMode = useStore((state) => state.walkMode);

    // Check if active content is a video.
    // ⚠️ 必須與 VideoControls 的 isVideoActive 判斷一致 —— GDrive/R2 影片的 active content
    // 可能不在 contentTextures(或 type 不符),只查 contentTextures 會漏判,
    // 導致 frameloop 停在 demand、VideoTimelineController 的 useFrame 不跑 → 時間軸 cue 不觸發。
    const activeContent = activeContentId
        ? contentTextures.find(t => t.id === activeContentId)
        : null;
    const activeR2Video = activeContentId ? r2Videos?.find(v => v.id === activeContentId) : null;
    const activeGDriveVideo = activeContentId ? gdriveVideos?.find(v => v.id === activeContentId) : null;
    const isVideoActive =
        activeContent?.type === 'video' ||
        activeContent?.type === 'r2_video' ||
        !!activeR2Video ||
        !!activeGDriveVideo;

    // Use 'always' frameloop when video is playing, recording, Gizmo, Perfect Render, walk mode, or paper figures exist
    const hasPaperFigures = paperFigures.length > 0;
    const frameloop = (isVideoActive && videoPlaying) || isRecordingMode || gizmoEnabled || perfectRenderEnabled || paperFigureMode || walkMode ? 'always' : 'demand'; // [效能] hasPaperFigures 移出:紙片人無逐幀動畫,demand 下照常顯示,避免永久 60fps

    // 行動裝置畫質降載開關:只在「手機/平板」生效,桌機維持完整畫質。
    // 裝置類型一個 session 內不變,故只在掛載時判定一次(Scene 為 ssr:false,僅 client 執行)。
    const [isMobile] = useState<boolean>(() => isMobileDevice());

    return (
        <Canvas
            gl={{
                antialias: !isMobile, // 桌機維持 MSAA；手機關閉(SMAA 後處理已涵蓋抗鋸齒,省 backbuffer 記憶體)
                powerPreference: 'high-performance',
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: true, // 截圖(ClientToolbar)依賴此 buffer,必須恆開,勿條件化
                alpha: false,
            }}
            dpr={perfectRenderEnabled ? [2, 2] : (isMobile ? [1, 1.5] : [1, 2])}
            camera={{ position: [0, 5, 10], fov: 50 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            shadows="soft"
            frameloop={frameloop}
        >
            <color attach="background" args={['#000']} />

            <Suspense fallback={<LoadingFallback />}>
                <SceneGraph />
                <RigInvalidator />
            </Suspense>

            <Preload all />
            <CanvasRefCapture />
        </Canvas>
    );
}
