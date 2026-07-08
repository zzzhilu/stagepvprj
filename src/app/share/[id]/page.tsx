'use client';

import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import ClientControls from '@/components/client/ClientControls';
import { VideoControls } from '@/components/client/VideoControls';
import { BottomLeftPanel } from '@/components/client/BottomLeftPanel';
import { RigPanel } from '@/components/client/RigPanel';
import { AssetLoadingOverlay } from '@/components/ui/AssetLoadingOverlay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientToolbar } from '@/components/client/ClientToolbar';
import { ClientLayoutSwitcher } from '@/components/client/ClientLayoutSwitcher';
import { ClientEditGate } from '@/components/client/ClientEditGate';
import { DrawingOverlay } from '@/components/client/DrawingOverlay';
import { ProjectService } from '@/lib/project-service';
import { useStore } from '@/store/useStore';
import { ClientPlaylistSidebar } from '@/components/client/ClientPlaylistSidebar';
import { resolveGDriveUrl } from '@/lib/gdrive-direct';

const Scene = dynamic(() => import('@/components/canvas/Scene'), {
    ssr: false,
    loading: () => <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading 3D Engine...</div>
});

function SharePageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params.id as string;
    const videoId = searchParams.get('video');
    const cueId = searchParams.get('cue');
    const playlistParam = searchParams.get('playlist');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectName, setProjectName] = useState('');
    const [videoFilename, setVideoFilename] = useState('');

    // Helper: format display name
    const formatDisplayName = (name: string) => {
        let formatted = name.replace(/\.[^.]+$/, ''); 
        formatted = formatted.replace(/[_\-\s]?cue\s*\d+[_\-\s]?/gi, ' ').replace(/\s+/g, ' ').trim(); 
        return formatted || name.replace(/\.[^.]+$/, ''); 
    };

    // Get store methods
    const activeContentId = useStore(state => state.activeContentId);
    const contentTextures = useStore(state => state.contentTextures);
    const setStageObjects = useStore(state => state.setStageObjects);
    const setViews = useStore(state => state.setViews);
    const setContentTextures = useStore(state => state.setContentTextures);
    const setActiveView = useStore(state => state.setActiveView);
    const setActiveContent = useStore(state => state.setActiveContent);
    const setCues = useStore(state => state.setCues);
    const setR2Videos = useStore(state => state.setR2Videos);
    const setGDriveVideos = useStore(state => state.setGDriveVideos);
    const setAllGDriveFolders = useStore(state => state.setAllGDriveFolders);
    const addContentTexture = useStore(state => state.addContentTexture);
    const setVideoPlaying = useStore(state => state.setVideoPlaying);
    const applyCue = useStore(state => state.applyCue);
    // Lighting settings sync
    const setAmbientIntensity = useStore(state => state.setAmbientIntensity);
    const setDirectionalIntensity = useStore(state => state.setDirectionalIntensity);
    const setBloomIntensity = useStore(state => state.setBloomIntensity);
    const setBloomThreshold = useStore(state => state.setBloomThreshold);
    // Perfect Render settings sync
    const setPerfectRenderEnabled = useStore(state => state.setPerfectRenderEnabled);
    const setEnvPreset = useStore(state => state.setEnvPreset);
    const setEnvIntensity = useStore(state => state.setEnvIntensity);
    const setContactShadow = useStore(state => state.setContactShadow);
    const setToneMapping = useStore(state => state.setToneMapping);
    const setReflectionMirror = useStore(state => state.setReflectionMirror);
    const setReflectionBlur = useStore(state => state.setReflectionBlur);
    const setReflectionMetalness = useStore(state => state.setReflectionMetalness);

    useEffect(() => {
        loadProjectAndVideo();
    }, [projectId, videoId]);

    const loadProjectAndVideo = async () => {
        if (!projectId) {
            setError('專案 ID 無效');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null); // 清除舊錯誤(重試/重跑成功時不殘留)
            const data = await ProjectService.loadProject(projectId);

            if (!data) {
                setError('找不到此專案');
                setIsLoading(false);
                return;
            }

            // Set project name
            setProjectName(data.name || '未命名專案');

            // Load project state into store
            if (data.stageObjects) setStageObjects(data.stageObjects);
            if (data.views) setViews(data.views);
            if (data.cues) setCues(data.cues);
            if (data.r2Videos) setR2Videos(data.r2Videos);
            if (data.gdriveVideos) setGDriveVideos(data.gdriveVideos);
            if (data.clientEditPasswordHash !== undefined) useStore.setState({ clientEditPasswordHash: data.clientEditPasswordHash });
            if (data.liteModeKeepIds) useStore.setState({ liteModeKeepIds: data.liteModeKeepIds });
            if (data.gdriveFolders) setAllGDriveFolders(data.gdriveFolders);

            // Restore lighting settings from project (if saved)
            if (data.ambientIntensity !== undefined) setAmbientIntensity(data.ambientIntensity);
            if (data.directionalIntensity !== undefined) setDirectionalIntensity(data.directionalIntensity);
            if (data.bloomIntensity !== undefined) setBloomIntensity(data.bloomIntensity);
            if (data.bloomThreshold !== undefined) setBloomThreshold(data.bloomThreshold);
            // Restore perfect render settings
            if (data.perfectRenderEnabled !== undefined) setPerfectRenderEnabled(data.perfectRenderEnabled);
            if (data.envPreset !== undefined) setEnvPreset(data.envPreset);
            if (data.envIntensity !== undefined) setEnvIntensity(data.envIntensity);
            if (data.contactShadow !== undefined) setContactShadow(data.contactShadow);
            if (data.toneMapping !== undefined) setToneMapping(data.toneMapping);
            if (data.spotLights !== undefined) useStore.setState({ spotLights: data.spotLights });

            // 機關系統:還原定義,當前值從各機關的 defaultValue 開始
            useStore.setState({
                nulls: data.nulls || [],
                rigs: data.rigs || [],
                rigValues: {},
            });
            if (data.reflectionMirror !== undefined) setReflectionMirror(data.reflectionMirror);
            if (data.reflectionBlur !== undefined) setReflectionBlur(data.reflectionBlur);
            if (data.reflectionMetalness !== undefined) setReflectionMetalness(data.reflectionMetalness);

            // Find the specified video
            if (videoId) {
                let video: any = null;
                let isR2 = false;

                if (data.r2Videos) {
                    video = data.r2Videos.find((v: any) => v.id === videoId);
                    if (video) isR2 = true;
                }
                if (!video && data.gdriveVideos) {
                    video = data.gdriveVideos.find((v: any) => v.id === videoId);
                }

                if (!video) {
                    setError('找不到指定的影片');
                    setIsLoading(false);
                    return;
                }

                setVideoFilename(formatDisplayName(video.filename));

                // Detect if this is an image based on file extension
                const urlToCheck = isR2 ? video.r2_url : video.filename;
                const isImageFile = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(video.filename) ||
                    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(urlToCheck);

                // 影片 URL 解析是「非致命」步驟:專案本體此時已成功載入,
                // 解析失敗(手機網路逾時等)只降級略過影片,不報整體錯誤
                try {
                    // Resolve GDrive URL directly (bypasses Vercel bandwidth)
                    let filePath: string;
                    if (isR2) {
                        filePath = video.r2_url;
                    } else {
                        filePath = await resolveGDriveUrl(video.driveFileId);
                    }

                    const originalTexture = data.contentTextures?.find((c: any) => c.id === video.id);
                    // Create ContentTexture for the content
                    const videoTexture = {
                        ...originalTexture,
                        id: video.id,
                        name: video.filename,
                        file_path: filePath,
                        type: (isImageFile ? 'image' : 'r2_video') as 'image' | 'r2_video',
                        timelineCues: video.timelineCues || originalTexture?.timelineCues,
                    };

                    // Clear existing content and add only this
                    setContentTextures([videoTexture]);
                    setActiveContent(video.id);

                    // Auto-play only for videos
                    if (!isImageFile) setVideoPlaying(true);
                } catch (videoErr) {
                    console.warn('影片 URL 解析失敗(非致命,專案照常顯示):', videoErr);
                    // 降級:還原專案原本的內容清單,讓 LED 至少有東西顯示
                    if (data.contentTextures) setContentTextures(data.contentTextures);
                    if (data.activeContentId) setActiveContent(data.activeContentId);
                }
            } else if ((data.r2Videos && data.r2Videos.length > 0) || (data.gdriveVideos && data.gdriveVideos.length > 0)) {
                let firstVideo: any = null;
                let isR2 = false;

                if (data.r2Videos && data.r2Videos.length > 0) {
                    firstVideo = data.r2Videos[0];
                    isR2 = true;
                } else if (data.gdriveVideos && data.gdriveVideos.length > 0) {
                    firstVideo = data.gdriveVideos[0];
                }

                if (firstVideo) {
                    try {
                    setVideoFilename(formatDisplayName(firstVideo.filename));

                    const urlToCheck = isR2 ? firstVideo.r2_url : firstVideo.filename;
                    // Detect if this is an image
                    const isFirstImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(firstVideo.filename) ||
                        /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(urlToCheck);

                    // Resolve GDrive URL directly (bypasses Vercel bandwidth)
                    let firstFilePath: string;
                    if (isR2) {
                        firstFilePath = firstVideo.r2_url;
                    } else {
                        firstFilePath = await resolveGDriveUrl(firstVideo.driveFileId);
                    }

                    const originalTexture = data.contentTextures?.find((c: any) => c.id === firstVideo.id);
                    const videoTexture = {
                        ...originalTexture,
                        id: firstVideo.id,
                        name: firstVideo.filename,
                        file_path: firstFilePath,
                        type: (isFirstImage ? 'image' : 'r2_video') as 'image' | 'r2_video',
                        timelineCues: firstVideo.timelineCues || originalTexture?.timelineCues,
                    };

                    setContentTextures([videoTexture]);
                    setActiveContent(firstVideo.id);
                    if (!isFirstImage) setVideoPlaying(true);
                    } catch (videoErr) {
                        console.warn('影片 URL 解析失敗(非致命,專案照常顯示):', videoErr);
                        if (data.contentTextures) setContentTextures(data.contentTextures);
                        if (data.activeContentId) setActiveContent(data.activeContentId);
                    }
                }
            } else {
                // Load existing content textures if no videos found
                if (data.contentTextures) setContentTextures(data.contentTextures);
                if (data.activeContentId) setActiveContent(data.activeContentId);
            }

            // Set active view if available
            if (data.activeViewId) setActiveView(data.activeViewId);

            // Apply cue if specified in URL (or from video's associated cue)
            const getAllVideos = () => {
                const arr: any[] = [];
                if (data.r2Videos) arr.push(...data.r2Videos);
                if (data.gdriveVideos) arr.push(...data.gdriveVideos);
                return arr;
            };
            const allVideos = getAllVideos();

            const targetCueId = cueId ||
                (videoId && allVideos.find((v: { id: string; cueId?: string }) => v.id === videoId)?.cueId) ||
                (!videoId && allVideos[0]?.cueId);
            if (targetCueId && data.cues?.length) {
                // Small delay to ensure store is hydrated
                setTimeout(() => applyCue(targetCueId), 200);
            }

        } catch (err) {
            // 只有專案本體(Firestore)載入失敗才會到這裡;影片解析失敗已在內層降級處理
            console.error('Failed to load project:', err);
            setError('載入專案失敗');
        } finally {
            setIsLoading(false);
        }
    };

    // 載入中不再整頁替換成 spinner —— 立即掛載 3D 場景讓資產開始下載,
    // 由 AssetLoadingOverlay 蓋在上方顯示「真實」進度(資料 → 資產 → 首幀),
    // 三關全過才淡出,避免 loading 結束時場景仍是空的。

    // Show error state
    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <div className="text-6xl mb-4"><svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg></div>
                    <h2 className="text-2xl font-bold text-white mb-2">發生錯誤</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    const activeTexture = contentTextures?.find((c: any) => c.id === activeContentId);
    const displayVideoFilename = activeTexture?.name ? formatDisplayName(activeTexture.name) : videoFilename;

    return (
        <main className="relative w-full h-full">
            {/* 真實載入進度(蓋在場景上,完成後淡出) */}
            <AssetLoadingOverlay dataReady={!isLoading} projectName={projectName} />

            {/* Watermark - Bottom Right */}
            {(projectName || displayVideoFilename) && (
                <div data-ui-element className="absolute bottom-6 right-6 z-50 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                        <span className="text-white/90 font-medium tracking-wide text-sm">
                            {projectName}{displayVideoFilename ? ` - ${displayVideoFilename}` : ''}
                        </span>
                    </div>
                </div>
            )}

            {/* Client Toolbar - Side tools */}
            <ClientToolbar projectId={projectId} />

            {/* LED 排列切換器(左上,上傳 icon 右側) */}
            <ClientLayoutSwitcher />

            {/* 客戶編輯入口(右上齒輪) */}
            <ClientEditGate projectId={projectId} />

            {/* Drawing Overlay */}
            <DrawingOverlay projectId={projectId} />

            {/* Client Controls - Keep for basic navigation */}
            <div data-ui-element><ClientControls /></div>

            {/* Video Controls */}
            <div data-ui-element><VideoControls /></div>

            {/* Bottom Left Panel - Views & Cues */}
            <BottomLeftPanel defaultCollapsed={true} />

            {/* 機關控制面板 */}
            <RigPanel />

            {/* 3D Scene */}
            <ErrorBoundary>
                <Scene />
            </ErrorBoundary>

            {/* GDrive Playlist Sidebar */}
            {playlistParam === 'gdrive' && (
                <div data-ui-element>
                    <ClientPlaylistSidebar projectId={projectId} />
                </div>
            )}
        </main>
    );
}

export default function SharePage() {
    return (
        <Suspense fallback={<div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading...</div>}>
            <SharePageContent />
        </Suspense>
    );
}
