import { useEffect, useState } from 'react';
import Hls from 'hls.js';

export function useHlsTexture(src: string) {
    const [videoElement] = useState<HTMLVideoElement | null>(() => {
        if (typeof document === 'undefined') return null;

        const vid = document.createElement('video');
        vid.crossOrigin = 'Anonymous';
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        return vid;
    });

    useEffect(() => {
        const video = videoElement;
        if (!video || !src) return;

        let hls: Hls | null = null;

        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.warn('Autoplay failed', e));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = src;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(console.warn);
            });
        }

        return () => {
            if (hls) hls.destroy();
        };
    }, [src, videoElement]);

    return videoElement;
}
