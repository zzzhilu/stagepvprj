'use client';

import dynamic from 'next/dynamic';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import AdminControls from '@/components/admin/AdminControls';
import ClientControls from '@/components/client/ClientControls';
import { VideoControls } from '@/components/client/VideoControls';
import { BottomLeftPanel } from '@/components/client/BottomLeftPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientUploader } from '@/components/client/ClientUploader';
import { ClientLayoutSwitcher } from '@/components/client/ClientLayoutSwitcher';
import { ClientEditGate } from '@/components/client/ClientEditGate';
import { LayoutAutoSwitcher } from '@/components/client/LayoutAutoSwitcher';
import { ObjectHoverTooltip } from '@/components/admin/ObjectHoverTooltip';
import { ClientToolbar } from '@/components/client/ClientToolbar';
import { DrawingOverlay } from '@/components/client/DrawingOverlay';
import { ProjectService } from '@/lib/project-service';
import { useStore } from '@/store/useStore';
import { RigPanel } from '@/components/client/RigPanel';

const AUTH_KEY = 'stagepv_admin_auth';

const Scene = dynamic(() => import('@/components/canvas/Scene'), {
    ssr: false,
    loading: () => <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading 3D Engine...</div>
});

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [checking, setChecking] = useState(false);

    const handleSubmit = async () => {
        if (checking) return;
        setChecking(true);
        setError('');
        try {
            // 密碼送到 server 端驗證(前端不含密碼);成功取回 token 存 sessionStorage
            const res = await fetch('/api/admin-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (data.ok && data.token) {
                sessionStorage.setItem(AUTH_KEY, data.token);
                onSuccess();
            } else {
                setError('密碼錯誤');
                setPassword('');
            }
        } catch {
            setError('驗證失敗,請稍後再試');
        } finally {
            setChecking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md mx-4 border border-gray-700 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-2 text-center flex items-center justify-center gap-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg> 管理員驗證</h3>
                <p className="text-gray-400 text-sm text-center mb-6">請輸入密碼以進入編輯模式</p>

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="請輸入密碼..."
                    autoFocus
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest placeholder-gray-500 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400/50"
                />

                {error && (
                    <p className="text-red-400 text-sm text-center mt-3">{error}</p>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => router.push('/free-test')}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
                    >
                        返回列表
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 bg-gradient-to-r from-gray-400 to-gray-300 hover:from-gray-300 hover:to-gray-200 text-gray-900 py-3 rounded-lg font-semibold transition-all"
                    >
                        確認
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProjectEditorContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = params.id as string;
    const isShareMode = searchParams.get('share') === '1';
    const projectName = searchParams.get('name') || '';

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [currentProjectName, setCurrentProjectName] = useState('');

    // Get store methods
    const setStageObjects = useStore(state => state.setStageObjects);
    const setViews = useStore(state => state.setViews);
    const setContentTextures = useStore(state => state.setContentTextures);
    const setActiveView = useStore(state => state.setActiveView);
    const setActiveContent = useStore(state => state.setActiveContent);
    const setCues = useStore(state => state.setCues); // [NEW]
    const setR2Videos = useStore(state => state.setR2Videos);
    const setVideoFolders = useStore(state => state.setVideoFolders);
    const setGDriveVideos = useStore(state => state.setGDriveVideos);
    const ledLayouts = useStore(state => state.ledLayouts);
    const screenCropRatio = useStore(state => state.screenCropRatio);
    const clientEditPasswordHash = useStore(state => state.clientEditPasswordHash);
    const liteModeKeepIds = useStore(state => state.liteModeKeepIds);
    const activeLedLayoutId = useStore(state => state.activeLedLayoutId);
    const setAllGDriveFolders = useStore(state => state.setAllGDriveFolders);
    const setFloorPlanTexture = useStore(state => state.setFloorPlanTexture);
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

    // Current state for auto-save
    const stageObjects = useStore(state => state.stageObjects);
    const views = useStore(state => state.views);
    const contentTextures = useStore(state => state.contentTextures);
    const activeViewId = useStore(state => state.activeViewId);
    const activeContentId = useStore(state => state.activeContentId);
    const cues = useStore(state => state.cues); // [NEW]
    const r2Videos = useStore(state => state.r2Videos);
    const videoFolders = useStore(state => state.videoFolders);
    const gdriveVideos = useStore(state => state.gdriveVideos);
    const gdriveFolders = useStore(state => state.gdriveFolders);
    const floorPlanTextureUrl = useStore(state => state.floorPlanTextureUrl);
    const ambientIntensity = useStore(state => state.ambientIntensity);
    const directionalIntensity = useStore(state => state.directionalIntensity);
    const bloomIntensity = useStore(state => state.bloomIntensity);
    const bloomThreshold = useStore(state => state.bloomThreshold);
    // Perfect Render state for auto-save
    const perfectRenderEnabled = useStore(state => state.perfectRenderEnabled);
    const envPreset = useStore(state => state.envPreset);
    const envIntensity = useStore(state => state.envIntensity);
    const contactShadow = useStore(state => state.contactShadow);
    const toneMapping = useStore(state => state.toneMapping);
    const spotLights = useStore(state => state.spotLights);
    const perfectLightScale = useStore(state => state.perfectLightScale);
    const ledSpillIntensity = useStore(state => state.ledSpillIntensity);
    const reflectionMirror = useStore(state => state.reflectionMirror);
    const reflectionBlur = useStore(state => state.reflectionBlur);
    const reflectionMetalness = useStore(state => state.reflectionMetalness);

    // Rigs/Nulls state for auto-save
    const nulls = useStore(state => state.nulls);
    const rigs = useStore(state => state.rigs);

    useEffect(() => {
        // Share mode bypasses auth
        if (isShareMode) {
            setIsAuthenticated(true);
            setIsChecking(false);
            loadProjectData();
            return;
        }

        // Check sessionStorage for auth
        const token = sessionStorage.getItem(AUTH_KEY);
        const authed = !!token && token.length === 32; // server 簽發的 token(非明文 'true')
        setIsAuthenticated(authed);
        setIsChecking(false);

        if (authed) {
            loadProjectData();
        }
    }, [isShareMode, projectId]);

    const loadProjectData = async () => {
        try {
            setIsLoading(true);
            const data = await ProjectService.loadProject(projectId);

            if (data) {
                // Load project state into store
                if (data.name) setCurrentProjectName(data.name);
                // [效能] 專案還原合併為單次 setState(原本 25+ 次分散 setter,初始化重渲染風暴主因)
                useStore.setState({
                    ...(data.stageObjects ? { stageObjects: data.stageObjects } : {}),
                    ...(data.views ? { views: data.views } : {}),
                    ...(data.contentTextures ? { contentTextures: data.contentTextures } : {}),
                    ...(data.activeViewId ? { activeViewId: data.activeViewId } : {}),
                    ...(data.activeContentId ? { activeContentId: data.activeContentId } : {}),
                    ...(data.cues ? { cues: data.cues } : {}),
                    ...(data.r2Videos ? { r2Videos: data.r2Videos } : {}),
                    ...(data.videoFolders ? { videoFolders: data.videoFolders } : {}),
                    ...(data.gdriveVideos ? { gdriveVideos: data.gdriveVideos } : {}),
                    ...(data.ledLayouts ? { ledLayouts: data.ledLayouts, activeLedLayoutId: data.activeLedLayoutId ?? null } : {}),
                    ...(typeof data.screenCropRatio === 'number' ? { screenCropRatio: data.screenCropRatio } : {}),
                    ...(data.clientEditPasswordHash !== undefined ? { clientEditPasswordHash: data.clientEditPasswordHash } : {}),
                    ...(data.liteModeKeepIds ? { liteModeKeepIds: data.liteModeKeepIds } : {}),
                    ...(data.gdriveFolders ? { gdriveFolders: data.gdriveFolders } : {}),
                    ...(data.floorPlanTextureUrl !== undefined ? { floorPlanTextureUrl: data.floorPlanTextureUrl } : {}),
                    ...(data.ambientIntensity !== undefined ? { ambientIntensity: data.ambientIntensity } : {}),
                    ...(data.directionalIntensity !== undefined ? { directionalIntensity: data.directionalIntensity } : {}),
                    ...(data.bloomIntensity !== undefined ? { bloomIntensity: data.bloomIntensity } : {}),
                    ...(data.bloomThreshold !== undefined ? { bloomThreshold: data.bloomThreshold } : {}),
                    ...(data.perfectRenderEnabled !== undefined ? { perfectRenderEnabled: data.perfectRenderEnabled } : {}),
                    ...(data.envPreset !== undefined ? { envPreset: data.envPreset } : {}),
                    ...(data.envIntensity !== undefined ? { envIntensity: data.envIntensity } : {}),
                    ...(data.contactShadow !== undefined ? { contactShadow: data.contactShadow } : {}),
                    ...(data.toneMapping !== undefined ? { toneMapping: data.toneMapping } : {}),
                    ...(data.spotLights !== undefined ? { spotLights: data.spotLights } : {}),
                    ...(data.perfectLightScale !== undefined ? { perfectLightScale: data.perfectLightScale } : {}),
                    ...(data.ledSpillIntensity !== undefined ? { ledSpillIntensity: data.ledSpillIntensity } : {}),
                    ...(data.reflectionMirror !== undefined ? { reflectionMirror: data.reflectionMirror } : {}),
                    ...(data.reflectionBlur !== undefined ? { reflectionBlur: data.reflectionBlur } : {}),
                    ...(data.reflectionMetalness !== undefined ? { reflectionMetalness: data.reflectionMetalness } : {}),
                    // 機關系統:還原定義,當前值從 defaultValue 開始
                    nulls: data.nulls || [],
                    rigs: data.rigs || [],
                    rigValues: {},
                    selectedNullId: null,
                });
            }
        } catch (error) {
            console.error('Failed to load project:', error);
            alert('載入專案失敗');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-save effect (debounced)
    useEffect(() => {
        if (!isAuthenticated || isShareMode || isLoading) return;

        const timeoutId = setTimeout(async () => {
            try {
                await ProjectService.updateProject(projectId, {
                    stageObjects,
                    views,
                    contentTextures,
                    activeViewId,
                    activeContentId,
                    cues, // [NEW]
                    r2Videos,
                    videoFolders,
                    gdriveVideos,
                    ledLayouts,
                    activeLedLayoutId,
                    screenCropRatio,
                    clientEditPasswordHash,
                    liteModeKeepIds,
                    gdriveFolders,
                    floorPlanTextureUrl,
                    // Lighting settings
                    ambientIntensity,
                    directionalIntensity,
                    bloomIntensity,
                    bloomThreshold,
                    // Perfect Render settings
                    perfectRenderEnabled,
                    envPreset,
                    envIntensity,
                    contactShadow,
                    toneMapping,
                    spotLights,
                    perfectLightScale,
                    ledSpillIntensity,
                    reflectionMirror,
                    reflectionBlur,
                    reflectionMetalness,
                    // Rig settings
                    nulls,
                    rigs,
                });
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 2000); // Debounce 2 seconds

        return () => clearTimeout(timeoutId);
    }, [stageObjects, views, contentTextures, activeViewId, activeContentId, cues, r2Videos, videoFolders, gdriveVideos, ledLayouts, activeLedLayoutId, screenCropRatio, clientEditPasswordHash, liteModeKeepIds, gdriveFolders, floorPlanTextureUrl, ambientIntensity, directionalIntensity, bloomIntensity, bloomThreshold, perfectRenderEnabled, envPreset, envIntensity, contactShadow, toneMapping, spotLights, perfectLightScale, ledSpillIntensity, reflectionMirror, reflectionBlur, reflectionMetalness, nulls, rigs, isAuthenticated, isShareMode, isLoading, projectId]);

    // Show loading while checking auth
    if (isChecking) {
        return <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">驗證中...</div>;
    }

    // Show password gate if not authenticated and not in share mode
    if (!isAuthenticated && !isShareMode) {
        return <PasswordGate onSuccess={() => {
            setIsAuthenticated(true);
            loadProjectData();
        }} />;
    }

    // Show loading while fetching project data
    if (isLoading) {
        return <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">載入專案中...</div>;
    }

    return (
        <main className="relative w-full h-full">
            {/* Project Name Display - Share mode only - Bottom Right */}
            {isShareMode && currentProjectName && (
                <div data-ui-element className="absolute bottom-6 right-6 z-50 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                        <span className="text-white/90 font-medium tracking-wide text-sm">{currentProjectName}</span>
                    </div>
                </div>
            )}

            {/* Client Toolbar - Side tools */}
            <ClientToolbar projectId={projectId} isAdmin={!isShareMode} />

            {/* Drawing Overlay */}
            <DrawingOverlay projectId={projectId} />

            {/* Admin Controls - Hidden in share mode */}
            {!isShareMode && <div data-ui-element><AdminControls projectName={currentProjectName} /></div>}

            {/* Client Controls */}
            <div data-ui-element><ClientControls /></div>

            {/* Video Controls */}
            <div data-ui-element><VideoControls /></div>

            {/* Bottom Left Panel - Views & Cues */}
            <BottomLeftPanel defaultCollapsed={false} />

            {/* Client Uploader - Share mode only */}
            {isShareMode && <div data-ui-element><ClientUploader /></div>}
            {isShareMode && <div data-ui-element><ClientLayoutSwitcher /></div>}
            {isShareMode && <div data-ui-element><ClientEditGate projectId={projectId} /></div>}
            {isShareMode && <LayoutAutoSwitcher />}

            {/* 後台:模型懸停名稱提示 */}
            {!isShareMode && <ObjectHoverTooltip />}

            {/* 機關控制面板 */}
            <RigPanel />

            {/* 3D Scene */}
            <ErrorBoundary>
                <Scene />
            </ErrorBoundary>
        </main>
    );
}

export default function ProjectEditorPage() {
    return (
        <Suspense fallback={<div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading...</div>}>
            <ProjectEditorContent />
        </Suspense>
    );
}
