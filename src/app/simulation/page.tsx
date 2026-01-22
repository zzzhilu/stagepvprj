'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import ClientControls from '@/components/client/ClientControls';
import { VideoControls } from '@/components/client/VideoControls';
import { ViewSwitcher } from '@/components/client/ViewSwitcher';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientUploader } from '@/components/client/ClientUploader';

const Scene = dynamic(() => import('@/components/canvas/Scene'), {
    ssr: false,
    loading: () => <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading 3D Engine...</div>
});

function SimulationContent() {
    const searchParams = useSearchParams();
    const projectName = searchParams.get('name') || '';
    const projectId = searchParams.get('p');

    const setLoading = useStore((state) => state.setLoading);
    const loadState = useStore((state) => state.loadState);

    // Load project if ID is present
    useEffect(() => {
        if (!projectId) return;

        async function load() {
            setLoading(true, '正在載入雲端專案...');
            try {
                const { ProjectService } = await import('@/lib/project-service');
                const project = await ProjectService.loadProject(projectId!);

                if (project) {
                    loadState({
                        stageObjects: project.stageObjects || [],
                        views: project.views || [],
                        contentTextures: project.contentTextures || [],
                        activeViewId: project.activeViewId || null,
                        activeContentId: project.activeContentId || null,
                        // Force update render mode or other settings if desired, 
                        // but usually we keep user's local preference or default.
                    });
                    console.log('Project loaded successfully:', project.name);
                } else {
                    alert('找不到此專案或已被刪除');
                }
            } catch (error) {
                console.error('Failed to load project:', error);
                alert('載入專案失敗');
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [projectId, setLoading, loadState]);

    // Simulation page is always in "share mode" - no admin access
    return (
        <main className="relative w-full h-full">
            {/* Project Name Display */}
            {projectName && (
                <div className="absolute top-4 left-4 z-50 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                        <span className="text-white font-semibold">{decodeURIComponent(projectName)}</span>
                    </div>
                </div>
            )}

            {/* Client Controls */}
            <ClientControls />

            {/* Video Controls */}
            <VideoControls />

            {/* View Switcher */}
            <ViewSwitcher />

            {/* Client Uploader - Always visible on this route */}
            <ClientUploader />

            {/* 3D Scene */}
            <ErrorBoundary>
                <Scene />
            </ErrorBoundary>
        </main>
    );
}

export default function SimulationPage() {
    return (
        <Suspense fallback={<div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading...</div>}>
            <SimulationContent />
        </Suspense>
    );
}
