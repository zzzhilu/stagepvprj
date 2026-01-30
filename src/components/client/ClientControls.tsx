'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { RenderModeSelector } from './RenderModeSelector';

export default function ClientControls() {

    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Hide controls if 'share' param is present (regardless of value)
    const isShareMode = searchParams.has('share');

    // Hide RenderModeSelector in video-progress and share pages
    const isVideoProgressPage = pathname.startsWith('/video-progress');
    const isSharePage = pathname.startsWith('/share');
    const hideRenderModeSelector = isShareMode || isVideoProgressPage || isSharePage;

    return (
        <>
            {/* Render Mode Selector - Top Left (Hidden in share mode, video-progress, and share pages) */}
            {!hideRenderModeSelector && (
                <div className="absolute top-4 left-4 pointer-events-auto z-40">
                    <RenderModeSelector />
                </div>
            )}

            {/* RenderModeSelector removed from client mode - now only in top-left */}
        </>
    );
}

