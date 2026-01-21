'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
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
