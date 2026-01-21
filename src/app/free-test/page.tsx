'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AdminControls from '@/components/admin/AdminControls';
import ClientControls from '@/components/client/ClientControls';
import { VideoControls } from '@/components/client/VideoControls';
import { ViewSwitcher } from '@/components/client/ViewSwitcher';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientUploader } from '@/components/client/ClientUploader';

const Scene = dynamic(() => import('@/components/canvas/Scene'), {
    ssr: false,
    loading: () => <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading 3D Engine...</div>
});

function FreeTestContent() {
    const searchParams = useSearchParams();
    const isShareMode = searchParams.get('share') === '1';
    const projectName = searchParams.get('name') || '';

    return (
        <main className="relative w-full h-full">
            {/* Project Name Display - Share mode only */}
            {isShareMode && projectName && (
                <div className="absolute top-4 left-4 z-50 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                        <span className="text-white font-semibold">{decodeURIComponent(projectName)}</span>
                    </div>
                </div>
            )}

            {/* Admin Controls - Hidden in share mode */}
            {!isShareMode && <AdminControls />}

            {/* Client Controls */}
            <ClientControls />

            {/* Video Controls */}
            <VideoControls />

            {/* View Switcher - Always visible */}
            <ViewSwitcher />

            {/* Client Uploader for Share Mode */}
            {isShareMode && <ClientUploader />}

            {/* 3D Scene */}
            <ErrorBoundary>
                <Scene />
            </ErrorBoundary>
        </main>
    );
}

export default function FreeTestPage() {
    return (
        <Suspense fallback={<div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading...</div>}>
            <FreeTestContent />
        </Suspense>
    );
}
