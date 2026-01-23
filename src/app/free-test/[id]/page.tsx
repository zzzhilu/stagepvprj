'use client';

import dynamic from 'next/dynamic';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import AdminControls from '@/components/admin/AdminControls';
import ClientControls from '@/components/client/ClientControls';
import { VideoControls } from '@/components/client/VideoControls';
import { ViewSwitcher } from '@/components/client/ViewSwitcher';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientUploader } from '@/components/client/ClientUploader';
import { CueSelector } from '@/components/client/CueSelector';
import { ProjectService } from '@/lib/project-service';
import { useStore } from '@/store/useStore';

const ADMIN_PASSWORD = '0903';
const AUTH_KEY = 'stagepv_admin_auth';

const Scene = dynamic(() => import('@/components/canvas/Scene'), {
    ssr: false,
    loading: () => <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading 3D Engine...</div>
});

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (password === ADMIN_PASSWORD) {
            sessionStorage.setItem(AUTH_KEY, 'true');
            onSuccess();
        } else {
            setError('密碼錯誤');
            setPassword('');
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
                <h3 className="text-2xl font-bold text-white mb-2 text-center">🔒 管理員驗證</h3>
                <p className="text-gray-400 text-sm text-center mb-6">請輸入密碼以進入編輯模式</p>

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="請輸入密碼..."
                    autoFocus
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-semibold transition-colors"
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

    // Current state for auto-save
    const stageObjects = useStore(state => state.stageObjects);
    const views = useStore(state => state.views);
    const contentTextures = useStore(state => state.contentTextures);
    const activeViewId = useStore(state => state.activeViewId);
    const activeContentId = useStore(state => state.activeContentId);

    useEffect(() => {
        // Share mode bypasses auth
        if (isShareMode) {
            setIsAuthenticated(true);
            setIsChecking(false);
            loadProjectData();
            return;
        }

        // Check sessionStorage for auth
        const authed = sessionStorage.getItem(AUTH_KEY) === 'true';
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
                if (data.stageObjects) setStageObjects(data.stageObjects);
                if (data.views) setViews(data.views);
                if (data.contentTextures) setContentTextures(data.contentTextures);
                if (data.activeViewId) setActiveView(data.activeViewId);
                if (data.activeContentId) setActiveContent(data.activeContentId);
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
                });
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 2000); // Debounce 2 seconds

        return () => clearTimeout(timeoutId);
    }, [stageObjects, views, contentTextures, activeViewId, activeContentId, isAuthenticated, isShareMode, isLoading, projectId]);

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
                <div className="absolute bottom-6 right-6 z-50 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-lg">
                        <span className="text-white/90 font-medium tracking-wide text-lg">{currentProjectName}</span>
                    </div>
                </div>
            )}

            {/* Admin Controls - Hidden in share mode */}
            {!isShareMode && <AdminControls projectName={currentProjectName} />}

            {/* Client Controls */}
            <ClientControls />

            {/* Video Controls */}
            <VideoControls />

            {/* View Switcher - Always visible */}
            <ViewSwitcher />

            {/* Cue Selector - Always visible */}
            <CueSelector />

            {/* Client Uploader for Share Mode */}
            {isShareMode && <ClientUploader />}

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
