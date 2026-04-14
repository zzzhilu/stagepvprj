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

    const mode = useStore((state) => state.mode);
    const r2Videos = useStore((state) => state.r2Videos) || [];
    const gdriveVideos = useStore((state) => state.gdriveVideos) || [];
    const activeCueId = useStore((state) => state.activeCueId);
    const cuesList = useStore((state) => state.cues);
    const addTimelineCue = useStore((state) => state.addTimelineCue);
    const removeTimelineCue = useStore((state) => state.removeTimelineCue);
    const updateTimelineCue = useStore((state) => state.updateTimelineCue);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<string>('');
    const [showRecordTooltip, setShowRecordTooltip] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [showUnmuteHint, setShowUnmuteHint] = useState(false);
    const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);
    const videoEndedHandlerRef = useRef<(() => void) | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressingRef = useRef(false);

    // Check if there's any video content (support both 'video' and 'r2_video')
    const hasVideo = contentTextures.some(t => t.type === 'video' || t.type === 'r2_video');

    // Check if active content is a video (support both 'video' and 'r2_video')
    const activeContent = activeContentId
        ? contentTextures.find(t => t.id === activeContentId)
        : null;
        
    // Get cues from either local or r2 versions by falling back
    const activeR2Video = activeContentId ? r2Videos.find(v => v.id === activeContentId) : null;
    const activeGDriveVideo = activeContentId ? gdriveVideos.find(v => v.id === activeContentId) : null;
    
    const isVideoActive = 
        activeContent?.type === 'video' || 
        activeContent?.type === 'r2_video' || 
        !!activeR2Video ||
        !!activeGDriveVideo;

    const videoCues = activeContent?.timelineCues || activeR2Video?.timelineCues || activeGDriveVideo?.timelineCues || [];

    // --- Click-to-unmute: show hint when video starts playing muted ---
    useEffect(() => {
        if (videoPlaying && !audioUnlocked && isVideoActive) {
            setShowUnmuteHint(true);

            const handleUnmute = () => {
                if (globalVideoElement) {
                    globalVideoElement.muted = false;
                    globalVideoElement.volume = 1;
                }
                setVideoVolume(1);
                setAudioUnlocked(true);
                setShowUnmuteHint(false);
                document.removeEventListener('click', handleUnmute);
                document.removeEventListener('touchstart', handleUnmute);
            };

            // Wait a tiny bit so the play-button click itself doesn't immediately trigger unmute
            const timer = setTimeout(() => {
                document.addEventListener('click', handleUnmute, { once: true });
                document.addEventListener('touchstart', handleUnmute, { once: true });
            }, 300);

            return () => {
                clearTimeout(timer);
                document.removeEventListener('click', handleUnmute);
                document.removeEventListener('touchstart', handleUnmute);
            };
        } else if (!videoPlaying) {
            setShowUnmuteHint(false);
        }
    }, [videoPlaying, audioUnlocked, isVideoActive, setVideoVolume]);

    // --- Auto-collapse logic ---
    const clearCollapseTimer = useCallback(() => {
        if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current);
            collapseTimerRef.current = null;
        }
    }, []);

    const startCollapseTimer = useCallback(() => {
        clearCollapseTimer();
        collapseTimerRef.current = setTimeout(() => {
            setCollapsed(true);
        }, 5000);
    }, [clearCollapseTimer]);

    // When video starts playing → start 5s collapse timer
    // When video pauses or stops → expand and clear timer
    useEffect(() => {
        if (videoPlaying && !isRecording) {
            startCollapseTimer();
        } else {
            clearCollapseTimer();
            setCollapsed(false);
        }
        return clearCollapseTimer;
    }, [videoPlaying, isRecording, startCollapseTimer, clearCollapseTimer]);

    // When user expands, restart the 5s timer if still playing
    const handleExpand = useCallback(() => {
        setCollapsed(false);
        if (videoPlaying && !isRecording) {
            startCollapseTimer();
        }
    }, [videoPlaying, isRecording, startCollapseTimer]);

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
            setRecordingStatus('● 錄製中...');
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
            clearCollapseTimer();
        };
    }, [clearCollapseTimer]);

    // Hide completely if no videos exist
    if (!hasVideo) return null;

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (globalVideoElement) {
            globalVideoElement.currentTime = time;
        }
    };

    const handleCueTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!activeContentId || mode !== 'admin') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = clickX / rect.width;
        const cueTime = ratio * (videoDuration || 0);

        if (!activeCueId) {
            alert("請先從右側面板選擇一個 Cue 以便進行標記！");
            return;
        }

        addTimelineCue(activeContentId, {
            id: crypto.randomUUID(),
            time: cueTime,
            cueId: activeCueId
        });
    };

    // Seek from collapsed bar click
    const handleCollapsedSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = clickX / rect.width;
        const seekTime = ratio * (videoDuration || 0);
        if (globalVideoElement) {
            globalVideoElement.currentTime = seekTime;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercent = (videoCurrentTime / (videoDuration || 1)) * 100;

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

    // --- Collapsed: slim progress bar only ---
    if (collapsed) {
        return (
            <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[500px] max-w-[85vw] cursor-pointer group transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                onClick={handleExpand}
            >
                {/* Hover hint */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center mb-1.5">
                    <span className="text-[10px] text-white/40 bg-black/40 px-2 py-0.5 rounded-full">
                        {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                    </span>
                </div>
                {/* Progress bar track */}
                <div
                    className="relative h-1 group-hover:h-1.5 bg-white/10 rounded-full overflow-hidden transition-all duration-200 backdrop-blur-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCollapsedSeek(e);
                        handleExpand();
                    }}
                >
                    <div
                        className="absolute inset-y-0 left-0 bg-emerald-500/80 group-hover:bg-emerald-400 rounded-full transition-colors duration-200"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
        );
    }

    // --- Full controls when expanded ---
    return (
        <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm p-4 z-50 pointer-events-auto rounded-xl border border-emerald-500/30 w-[600px] max-w-[90vw] transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] shadow-lg shadow-emerald-500/10"
            onMouseEnter={clearCollapseTimer}
            onMouseLeave={() => { if (videoPlaying && !isRecording) startCollapseTimer(); }}
            onTouchStart={clearCollapseTimer}
            onTouchEnd={() => { if (videoPlaying && !isRecording) startCollapseTimer(); }}
        >
            <div className="max-w-4xl mx-auto space-y-3">
                {/* Recording Status */}
                {recordingStatus && (
                    <div className="text-center text-sm font-medium text-red-400 animate-pulse">
                        {recordingStatus}
                    </div>
                )}

                {/* Timeline */}
                <div className="flex flex-col gap-1">
                    {/* Admin Cue Timeline */}
                    {isVideoActive && (
                        <div className="flex items-center gap-3">
                            <span className="w-12 text-right text-[10px] text-violet-400 font-medium">Cues</span>
                            <div 
                                className={`flex-1 h-3 relative bg-gray-800/80 rounded border border-gray-700/50 transition-colors ${mode === 'admin' ? 'cursor-crosshair hover:border-violet-500/50' : 'cursor-default'}`}
                                onClick={handleCueTimelineClick}
                                title={mode === 'admin' ? "點擊以在當前時間點新增所選的 Cue" : "場景提示序列 (唯讀)"}
                            >
                                {videoCues.map(cue => {
                                    const leftPercent = (cue.time / Math.max(videoDuration || 1, 1)) * 100;
                                    const durationPercent = ((cue.duration || 0) / Math.max(videoDuration || 1, 1)) * 100;
                                    const cueInfo = cuesList.find(c => c.id === cue.cueId);
                                    return (
                                        <div key={cue.id}>
                                            {(cue.duration || 0) > 0 && (
                                                <div 
                                                    className="absolute top-0 bottom-0 bg-amber-500/30 rounded-r z-0 pointer-events-none transition-all"
                                                    style={{ 
                                                        left: `${leftPercent}%`, 
                                                        width: `${durationPercent}%` 
                                                    }}
                                                />
                                            )}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (globalVideoElement) {
                                                        globalVideoElement.currentTime = cue.time;
                                                    }
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (mode !== 'admin') return;
                                                    if (confirm(`確定移除此 Cue [${cueInfo?.name || '未知'}] 嗎？`)) {
                                                        removeTimelineCue(activeContentId!, cue.id);
                                                    }
                                                }}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    if (mode !== 'admin') return;
                                                    const currentDuration = cue.duration || 0;
                                                    const res = prompt(`設定到此 Cue [${cueInfo?.name || '未知'}] 的變化時間 (秒):\n目前: ${currentDuration}秒\n設定為 0 表示瞬間切換`, currentDuration.toString());
                                                    if (res !== null) {
                                                        const parsed = parseFloat(res);
                                                        if (!isNaN(parsed) && parsed >= 0) {
                                                            updateTimelineCue(activeContentId!, cue.id, { duration: parsed });
                                                        }
                                                    }
                                                }}
                                                className={`absolute top-0 bottom-0 w-1.5 -ml-[3px] rounded-full cursor-pointer transition-all z-10 shadow-[0_0_8px_rgba(139,92,246,0.8)] ${
                                                    (cue.duration || 0) > 0 ? 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-violet-500 hover:bg-violet-400 hover:scale-[2]'
                                                }`}
                                                style={{ left: `${leftPercent}%` }}
                                                title={`Cue: ${cueInfo?.name || '未知'}\n過渡時間: ${cue.duration || 0}s\n左鍵：跳轉至此時間${mode === 'admin' ? '\n右鍵：移除\n雙擊：設定過渡時間 (Duration)' : ''}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="w-12"></span>
                        </div>
                    )}

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
                        className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                        style={{
                            background: `linear-gradient(to right, #10b981 0%, #10b981 ${progressPercent}%, #4b5563 ${progressPercent}%, #4b5563 100%)`
                        }}
                    />
                        <span className="text-white text-xs font-mono w-12">
                            {formatTime(videoDuration)}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    {/* Play/Pause Button */}
                    <button
                        onClick={handlePlayPause}
                        className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${isRecording
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
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
                    <div className="flex items-center gap-2 relative">
                        {/* Unmute hint tooltip */}
                        {showUnmuteHint && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap animate-pulse">
                                <div className="bg-amber-500/90 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-amber-500/30">
                                    🔊 點擊任意處開啟音量
                                </div>
                                <div className="w-2 h-2 bg-amber-500/90 rotate-45 mx-auto -mt-1"></div>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setVideoVolume(videoVolume === 0 ? 1 : 0);
                                setAudioUnlocked(true);
                                setShowUnmuteHint(false);
                                if (globalVideoElement) {
                                    globalVideoElement.muted = videoVolume !== 0;
                                }
                            }}
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
                            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
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
