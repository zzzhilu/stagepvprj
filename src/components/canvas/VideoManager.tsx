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
    const cameraStreamMode = useStore((state) => state.cameraStreamMode);
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
        // webcam 需要 deviceId;screen 模式用 getDisplayMedia 不需 deviceId
        if (!cameraStreamActive || (cameraStreamMode === 'webcam' && !cameraStreamDeviceId)) {
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
                let stream: MediaStream;
                if (cameraStreamMode === 'screen') {
                    // 螢幕/視窗擷取:解析度跟隨來源(不受 webcam 限制),適合抓 NDI 預覽視窗
                    stream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            width: { ideal: 3840 },
                            height: { ideal: 2160 },
                            frameRate: { ideal: 30 },
                        },
                        audio: false,
                    });
                    // 使用者按瀏覽器原生「停止分享」時,自動關閉本功能
                    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
                        setCameraStreamActive(false);
                    });
                } else {
                    // webcam:盡量要求高解析度(治標:避免預設 640×480)
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            deviceId: { exact: cameraStreamDeviceId! },
                            width: { ideal: 3840 },
                            height: { ideal: 2160 },
                        },
                        audio: false,
                    });
                }

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
    }, [cameraStreamActive, cameraStreamDeviceId, cameraStreamMode, setCameraStreamActive, setCameraStreamError]);

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

        const attemptPlay = () => {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Playback blocked on load:', err);
                    video.muted = true;
                    video.play().catch(e => console.error('Fallback muted play failed:', e));
                });
            }
        };

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
                    attemptPlay();
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
                    attemptPlay();
                });
            } else {
                console.error('HLS not supported in this browser');
            }
        } else {
            // Non-HLS video (MP4, etc.)
            // Wait for canplay before attempting playback — critical for proxy-streamed
            // GDrive URLs that need time to fetch initial metadata.
            video.addEventListener('canplay', () => {
                attemptPlay();
            }, { once: true });
            video.src = videoUrl;
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
            // Apply volume before playing
            videoRef.current.volume = videoVolume;
            videoRef.current.muted = videoVolume === 0;
            
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Video play error (possibly autoplay policy):', err);
                    // Fallback to muted playback if browser blocks unmuted audio
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(e => console.warn('Fallback play failed:', e));
                    }
                });
            }
        } else {
            videoRef.current.pause();
        }
    }, [videoPlaying, videoVolume, cameraStreamActive, activeVideo?.file_path]);

    // Handle volume changes (only for content videos)
    useEffect(() => {
        if (!videoRef.current || cameraStreamActive) return;

        videoRef.current.volume = videoVolume;
        videoRef.current.muted = videoVolume === 0;
    }, [videoVolume, cameraStreamActive, activeVideo?.file_path]);

    // Global interaction listener: unmute video if it was forcefully muted by browser policy
    useEffect(() => {
        const handleInteraction = () => {
            if (videoRef.current && videoRef.current.muted && videoVolume > 0 && videoPlaying) {
                videoRef.current.muted = false;
                videoRef.current.volume = videoVolume;
            }
        };

        window.addEventListener('pointerdown', handleInteraction, { capture: true });
        window.addEventListener('keydown', handleInteraction, { capture: true });

        return () => {
            window.removeEventListener('pointerdown', handleInteraction, { capture: true });
            window.removeEventListener('keydown', handleInteraction, { capture: true });
        };
    }, [videoVolume, videoPlaying, activeVideo?.file_path]);

    return null; // This is a non-visual component
}
