'use client';

import { useRef, useCallback } from 'react';
import { globalVideoElement } from '@/components/canvas/VideoManager';

interface RecorderOptions {
    onRecordingComplete: (blob: Blob, mimeType: string) => void;
    onRecordingStart?: () => void;
    onRecordingStop?: () => void;
}

// Check which formats are supported and log them
function getBestMimeType(): { mimeType: string; extension: string } {
    // Priority order: MP4/H.264 first (most compatible), then WebM
    const formats = [
        // MP4 with H.264 - best compatibility
        { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
        { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
        { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
        { mimeType: 'video/mp4', extension: 'mp4' },
        // WebM with H.264 (Chrome experimental)
        { mimeType: 'video/webm;codecs=h264', extension: 'mp4' },
        { mimeType: 'video/x-matroska;codecs=avc1', extension: 'mkv' },
        // WebM with VP9 (good quality)
        { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
        { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
        // WebM with VP8 (fallback)
        { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
        { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
        { mimeType: 'video/webm', extension: 'webm' },
    ];

    console.log('Checking supported recording formats...');

    for (const format of formats) {
        const supported = MediaRecorder.isTypeSupported(format.mimeType);
        console.log(`  ${format.mimeType}: ${supported ? '✅' : '❌'}`);
        if (supported) {
            console.log(`Selected format: ${format.mimeType}`);
            return format;
        }
    }

    // Ultimate fallback
    console.warn('No preferred format supported, using default');
    return { mimeType: '', extension: 'webm' };
}

export function useRecorder(options: RecorderOptions) {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const isRecordingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    const startRecording = useCallback((canvas: HTMLCanvasElement) => {
        if (isRecordingRef.current) return;

        try {
            // Get canvas stream (30 fps)
            const canvasStream = canvas.captureStream(30);

            // Try to get audio from video element
            let combinedStream: MediaStream;

            if (globalVideoElement) {
                try {
                    // Create audio context to capture video audio
                    const audioContext = new AudioContext();
                    audioContextRef.current = audioContext;
                    const source = audioContext.createMediaElementSource(globalVideoElement);
                    const destination = audioContext.createMediaStreamDestination();
                    source.connect(destination);
                    source.connect(audioContext.destination); // Also play through speakers

                    // Combine canvas video with audio
                    combinedStream = new MediaStream([
                        ...canvasStream.getVideoTracks(),
                        ...destination.stream.getAudioTracks()
                    ]);
                    console.log('Audio capture enabled');
                } catch (audioError) {
                    console.warn('Could not capture audio, recording video only:', audioError);
                    combinedStream = canvasStream;
                }
            } else {
                combinedStream = canvasStream;
            }

            // Get best supported format (prioritizing MP4/H.264)
            const { mimeType, extension } = getBestMimeType();

            const recorderOptions: MediaRecorderOptions = {
                videoBitsPerSecond: 5000000 // 5 Mbps for better quality
            };

            if (mimeType) {
                recorderOptions.mimeType = mimeType;
            }

            const recorder = new MediaRecorder(combinedStream, recorderOptions);
            console.log('MediaRecorder created with mimeType:', recorder.mimeType);

            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const actualMimeType = recorder.mimeType || mimeType || 'video/webm';
                const blob = new Blob(chunksRef.current, { type: actualMimeType });
                console.log('Recording complete:', blob.size, 'bytes,', actualMimeType);

                // Determine actual extension based on mime type
                let actualExtension = extension;
                if (actualMimeType.includes('mp4') || actualMimeType.includes('avc') || actualMimeType.includes('h264')) {
                    actualExtension = 'mp4';
                } else if (actualMimeType.includes('webm') || actualMimeType.includes('vp')) {
                    actualExtension = 'webm';
                }

                options.onRecordingComplete(blob, actualMimeType);
                options.onRecordingStop?.();
                isRecordingRef.current = false;

                // Close audio context
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
            };

            recorder.start(100); // Collect data every 100ms
            mediaRecorderRef.current = recorder;
            isRecordingRef.current = true;
            options.onRecordingStart?.();

        } catch (error) {
            console.error('Failed to start recording:', error);
            isRecordingRef.current = false;
        }
    }, [options]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const isRecording = useCallback(() => {
        return isRecordingRef.current;
    }, []);

    return {
        startRecording,
        stopRecording,
        isRecording
    };
}

export function downloadRecording(blob: Blob, mimeType: string, filename?: string) {
    // Determine extension from mime type
    let extension = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('avc') || mimeType.includes('h264')) {
        extension = 'mp4';
    } else if (mimeType.includes('mkv') || mimeType.includes('matroska')) {
        extension = 'mkv';
    }

    const defaultFilename = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Downloaded:', filename || defaultFilename);
}
