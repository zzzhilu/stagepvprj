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

    // Camera stream state [NEW]
    const cameraStreamActive = useStore((state) => state.cameraStreamActive);
    const cameraStreamDeviceId = useStore((state) => state.cameraStreamDeviceId);
    const setCameraStreamActive = useStore((state) => state.setCameraStreamActive);
    const setCameraStreamError = useStore((state) => state.setCameraStreamError);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);

    // Find active video texture using activeContentId
    // Support both local 'video' and cloud 'r2_video' types
    const activeVideo = activeContentId
        ? contentTextures.find(t => t.id === activeContentId && (t.type === 'video' || t.type === 'r2_video'))
        : null;

    // ========== CAMERA STREAM (HIGHEST PRIORITY) ==========
    useEffect(() => {
        if (!cameraStreamActive || !cameraStreamDeviceId) {
            // Cleanup camera stream
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => t.stop());
                cameraStreamRef.current = null;
            }
            if (cameraVideoRef.current) {
                cameraVideoRef.current.pause();
                cameraVideoRef.current.remove();
                cameraVideoRef.current = null;
            }
            // When camera turns off, let the video useEffect below take over
            // globalVideoElement will be restored by the video effect
            if (!cameraStreamActive) {
                // Only clear if we were the one occupying globalVideoElement
                if (globalVideoElement === cameraVideoRef.current || (!videoRef.current && globalVideoElement)) {
                    globalVideoElement = null;
                }
            }
            return;
        }

        let cancelled = false;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: cameraStreamDeviceId },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });

                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                // Cleanup any previous content video
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current = null;
                }

                // Create camera video element
                const camVideo = document.createElement('video');
                camVideo.playsInline = true;
                camVideo.muted = true;
                camVideo.autoplay = true;
                camVideo.srcObject = stream;

                cameraVideoRef.current = camVideo;
                cameraStreamRef.current = stream;
                globalVideoElement = camVideo;

                await camVideo.play();
            } catch (err: any) {
                if (cancelled) return;
                console.error('Camera stream error:', err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setCameraStreamError('請在瀏覽器設定中允許攝影機權限');
                } else if (err.name === 'NotFoundError') {
                    setCameraStreamError('找不到所選的攝影機裝置');
                } else {
                    setCameraStreamError('攝影機啟動失敗：' + err.message);
                }
                setCameraStreamActive(false);
            }
        };

        startCamera();

        return () => {
            cancelled = true;
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => t.stop());
                cameraStreamRef.current = null;
            }
            if (cameraVideoRef.current) {
                cameraVideoRef.current.pause();
                cameraVideoRef.current.srcObject = null;
                cameraVideoRef.current.removeAttribute('src');
                cameraVideoRef.current.load();
                cameraVideoRef.current.remove();
                cameraVideoRef.current = null;
            }
            // Don't clear globalVideoElement here — let the video effect handle it
        };
    }, [cameraStreamActive, cameraStreamDeviceId, setCameraStreamActive, setCameraStreamError]);

    // ========== CONTENT VIDEO (lower priority — skipped when camera is active) ==========
    useEffect(() => {
        // If camera stream is active, skip video loading entirely
        if (cameraStreamActive) return;

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
            video.removeAttribute('src');
            video.load();
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.remove();
            globalVideoElement = null;
        };
    }, [activeVideo?.file_path, cameraStreamActive, setVideoCurrentTime, setVideoDuration]);

    // Handle play/pause (only for content videos, not camera)
    useEffect(() => {
        if (!videoRef.current || cameraStreamActive) return;

        if (videoPlaying) {
            // Unmute after user interaction (play button)
            videoRef.current.muted = videoVolume === 0;
            videoRef.current.play().catch(err => console.warn('Video play error:', err));
        } else {
            videoRef.current.pause();
        }
    }, [videoPlaying, videoVolume, cameraStreamActive]);

    // Handle volume changes (only for content videos)
    useEffect(() => {
        if (!videoRef.current || cameraStreamActive) return;

        videoRef.current.volume = videoVolume;
        videoRef.current.muted = videoVolume === 0;
    }, [videoVolume, cameraStreamActive]);

    return null; // This is a non-visual component
}
