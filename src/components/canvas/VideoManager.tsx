import { useStore } from '@/store/useStore';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

// Global video element that can be accessed by both the renderer and controls
export let globalVideoElement: HTMLVideoElement | null = null;

// Check if URL is HLS stream
function isHlsUrl(url: string): boolean {
    return url.includes('.m3u8') || url.includes('m3u8');
}

export function VideoManager() {
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const videoPlaying = useStore((state) => state.videoPlaying);
    const videoVolume = useStore((state) => state.videoVolume);
    const setVideoDuration = useStore((state) => state.setVideoDuration);
    const setVideoCurrentTime = useStore((state) => state.setVideoCurrentTime);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);

    // Find active video texture using activeContentId
    const activeVideo = activeContentId
        ? contentTextures.find(t => t.id === activeContentId && t.type === 'video')
        : null;

    useEffect(() => {
        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (!activeVideo) {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current = null;
                globalVideoElement = null;
            }
            return;
        }

        // Create video element with iOS Safari compatibility
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true; // Required for iOS Safari autoplay
        video.playsInline = true; // Required for iOS inline playback
        video.setAttribute('playsinline', ''); // Extra attribute for older iOS

        // Store reference
        videoRef.current = video;
        globalVideoElement = video;

        // Event listeners
        const updateTime = () => {
            setVideoCurrentTime(video.currentTime);
        };

        const updateDuration = () => {
            setVideoDuration(video.duration);
        };

        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateDuration);

        const videoUrl = activeVideo.file_path;

        // Check if HLS stream
        if (isHlsUrl(videoUrl)) {
            if (Hls.isSupported()) {
                // Use hls.js for browsers that don't natively support HLS
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                });
                hlsRef.current = hls;

                hls.loadSource(videoUrl);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(err => console.warn('HLS autoplay blocked:', err));
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('HLS network error, trying to recover...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('HLS media error, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = videoUrl;
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(err => console.warn('Native HLS autoplay blocked:', err));
                });
            } else {
                console.error('HLS not supported in this browser');
            }
        } else {
            // Non-HLS video (MP4, etc.)
            video.src = videoUrl;
            video.play().catch(err => console.warn('Video autoplay blocked:', err));
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            video.pause();
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.remove();
            globalVideoElement = null;
        };
    }, [activeVideo, setVideoCurrentTime, setVideoDuration]);

    // Handle play/pause
    useEffect(() => {
        if (!videoRef.current) return;

        if (videoPlaying) {
            // Unmute after user interaction (play button)
            videoRef.current.muted = videoVolume === 0;
            videoRef.current.play().catch(err => console.warn('Video play error:', err));
        } else {
            videoRef.current.pause();
        }
    }, [videoPlaying, videoVolume]);

    // Handle volume changes
    useEffect(() => {
        if (!videoRef.current) return;

        videoRef.current.volume = videoVolume;
        videoRef.current.muted = videoVolume === 0;
    }, [videoVolume]);

    return null; // This is a non-visual component
}
