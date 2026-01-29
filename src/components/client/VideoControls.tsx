'use client';

import { useStore } from '@/store/useStore';
import { globalVideoElement } from '../canvas/VideoManager';
import { useRef, useEffect, useCallback, useState } from 'react';
import { useRecorder, downloadRecording } from '@/hooks/useRecorder';

// Global reference to canvas for recording
let canvasRef: HTMLCanvasElement | null = null;
export function setCanvasRef(canvas: HTMLCanvasElement | null) {
    canvasRef = canvas;
}

export function VideoControls() {
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const videoPlaying = useStore((state) => state.videoPlaying);
    const videoVolume = useStore((state) => state.videoVolume);
    const videoCurrentTime = useStore((state) => state.videoCurrentTime);
    const videoDuration = useStore((state) => state.videoDuration);
    const setVideoPlaying = useStore((state) => state.setVideoPlaying);
    const setVideoVolume = useStore((state) => state.setVideoVolume);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<string>('');
    const [showRecordTooltip, setShowRecordTooltip] = useState(false);
    const videoEndedHandlerRef = useRef<(() => void) | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressingRef = useRef(false);

    // Check if there's any video content (support both 'video' and 'r2_video')
    const hasVideo = contentTextures.some(t => t.type === 'video' || t.type === 'r2_video');

    // Check if active content is a video (support both 'video' and 'r2_video')
    const activeContent = activeContentId
        ? contentTextures.find(t => t.id === activeContentId)
        : null;
    const isVideoActive = activeContent?.type === 'video' || activeContent?.type === 'r2_video';

    // Handle recording complete - direct download
    const handleRecordingComplete = useCallback((blob: Blob, mimeType: string) => {
        downloadRecording(blob, mimeType);
        setRecordingStatus('錄製完成！已下載');
        setTimeout(() => setRecordingStatus(''), 3000);
    }, []);

    const { startRecording, stopRecording } = useRecorder({
        onRecordingComplete: handleRecordingComplete,
        onRecordingStart: () => {
            setIsRecording(true);
            setRecordingStatus('🔴 錄製中...');
        },
        onRecordingStop: () => {
            setIsRecording(false);
        }
    });

    // Start recording with video from beginning
    const handleStartRecording = useCallback(() => {
        if (!canvasRef || !globalVideoElement || isRecording) return;

        console.log('Starting recording...');

        // Turn on sound
        setVideoVolume(1);

        // First pause and reset to beginning
        globalVideoElement.pause();
        globalVideoElement.currentTime = 0;
        globalVideoElement.loop = false; // Disable loop for recording

        // Wait for seek to complete, then start
        const onSeeked = () => {
            globalVideoElement!.removeEventListener('seeked', onSeeked);

            console.log('Video reset to beginning, starting recording...');

            // Start recording
            startRecording(canvasRef!);

            // Set up ended event handler
            const onEnded = () => {
                console.log('Video ended, stopping recording...');
                stopRecording();
                globalVideoElement!.loop = true; // Restore loop
                setVideoPlaying(false);
            };

            // Remove previous handler if exists
            if (videoEndedHandlerRef.current && globalVideoElement) {
                globalVideoElement.removeEventListener('ended', videoEndedHandlerRef.current);
            }

            globalVideoElement!.addEventListener('ended', onEnded);
            videoEndedHandlerRef.current = onEnded;

            // Start playing
            globalVideoElement!.play().then(() => {
                setVideoPlaying(true);
            }).catch(err => {
                console.error('Failed to play video:', err);
            });
        };

        globalVideoElement.addEventListener('seeked', onSeeked);

        // Fallback if seeked event doesn't fire (video already at 0)
        if (globalVideoElement.currentTime === 0) {
            setTimeout(() => {
                if (!isRecording) {
                    globalVideoElement!.removeEventListener('seeked', onSeeked);
                    onSeeked();
                }
            }, 100);
        }
    }, [isRecording, startRecording, stopRecording, setVideoPlaying, setVideoVolume]);

    // Long press handlers for record button
    const handleRecordMouseDown = useCallback(() => {
        if (isRecording) {
            // If already recording, stop immediately
            stopRecording();
            setVideoPlaying(false);
            if (globalVideoElement) {
                globalVideoElement.loop = true;
            }
            return;
        }

        isLongPressingRef.current = true;
        longPressTimerRef.current = setTimeout(() => {
            if (isLongPressingRef.current) {
                handleStartRecording();
            }
        }, 500); // 0.5 second hold
    }, [isRecording, stopRecording, setVideoPlaying, handleStartRecording]);

    const handleRecordMouseUp = useCallback(() => {
        isLongPressingRef.current = false;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleRecordMouseLeave = useCallback(() => {
        isLongPressingRef.current = false;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // Handle normal play/pause
    const handlePlayPause = useCallback(() => {
        if (isRecording) {
            // Stop recording if currently recording
            stopRecording();
            setVideoPlaying(false);
            if (globalVideoElement) {
                globalVideoElement.loop = true;
            }
        } else {
            // Normal play/pause
            setVideoPlaying(!videoPlaying);
        }
    }, [isRecording, videoPlaying, stopRecording, setVideoPlaying]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (videoEndedHandlerRef.current && globalVideoElement) {
                globalVideoElement.removeEventListener('ended', videoEndedHandlerRef.current);
            }
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    // Hide completely if no videos exist
    if (!hasVideo) return null;

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (globalVideoElement) {
            globalVideoElement.currentTime = time;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Minimized state when image is selected
    if (!isVideoActive) {
        return (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 z-50 pointer-events-auto rounded-full border border-white/10 transition-all duration-300 ease-out">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>圖片模式</span>
                </div>
            </div>
        );
    }

    // Full controls when video is selected
    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm p-4 z-50 pointer-events-auto rounded-xl border border-white/10 w-[600px] max-w-[90vw] transition-all duration-300 ease-out">

            <div className="max-w-4xl mx-auto space-y-3">
                {/* Recording Status */}
                {recordingStatus && (
                    <div className="text-center text-sm font-medium text-red-400 animate-pulse">
                        {recordingStatus}
                    </div>
                )}

                {/* Timeline */}
                <div className="flex items-center gap-3">
                    <span className="text-white text-xs font-mono w-12 text-right">
                        {formatTime(videoCurrentTime)}
                    </span>
                    <input
                        type="range"
                        min="0"
                        max={videoDuration || 0}
                        step="0.1"
                        value={videoCurrentTime}
                        onChange={handleSeek}
                        disabled={isRecording}
                        className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50"
                        style={{
                            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(videoCurrentTime / (videoDuration || 1)) * 100}%, #4b5563 ${(videoCurrentTime / (videoDuration || 1)) * 100}%, #4b5563 100%)`
                        }}
                    />
                    <span className="text-white text-xs font-mono w-12">
                        {formatTime(videoDuration)}
                    </span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    {/* TODO: Record Button - Hidden pending development
                    <div className="relative">
                        <button
                            onMouseDown={handleRecordMouseDown}
                            onMouseUp={handleRecordMouseUp}
                            onMouseLeave={handleRecordMouseLeave}
                            onTouchStart={handleRecordMouseDown}
                            onTouchEnd={handleRecordMouseUp}
                            onMouseEnter={() => setShowRecordTooltip(true)}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isRecording
                                ? 'bg-red-600 animate-pulse ring-2 ring-red-400 ring-offset-2 ring-offset-black'
                                : 'bg-gray-700 hover:bg-red-600/50'
                                }`}
                            title="長按 0.5 秒開始錄製"
                        >
                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="8" />
                            </svg>
                        </button>
                        {showRecordTooltip && !isRecording && (
                            <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-yellow-900/90 border border-yellow-600 rounded-lg text-xs text-yellow-200 text-center"
                                onMouseLeave={() => setShowRecordTooltip(false)}
                            >
                                <p className="font-bold mb-1">⚠️ 功能開發中</p>
                                <p>此功能尚不穩定，建議使用電腦內建錄影功能</p>
                                <p className="mt-1 text-yellow-400">長按 0.5 秒開始錄製</p>
                            </div>
                        )}
                    </div>
                    */}

                    {/* Play/Pause Button */}
                    <button
                        onClick={handlePlayPause}
                        className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${isRecording
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-violet-600 hover:bg-violet-700'
                            }`}
                    >
                        {isRecording ? (
                            // Stop icon when recording
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="6" width="12" height="12" />
                            </svg>
                        ) : videoPlaying ? (
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setVideoVolume(videoVolume === 0 ? 1 : 0)}
                            className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                        >
                            {videoVolume === 0 ? (
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                            )}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={videoVolume}
                            onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-500"
                        />
                        <span className="text-white text-xs font-mono w-8">
                            {Math.round(videoVolume * 100)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
