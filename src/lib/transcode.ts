'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Singleton FFmpeg instance
let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

export interface TranscodeProgress {
    stage: 'loading' | 'transcoding' | 'complete' | 'error';
    progress: number; // 0-100
    message: string;
    estimatedTimeRemaining?: number; // seconds
}

export type ProgressCallback = (progress: TranscodeProgress) => void;

async function loadFFmpeg(onProgress: ProgressCallback): Promise<FFmpeg> {
    if (ffmpeg && isLoaded) {
        return ffmpeg;
    }

    onProgress({
        stage: 'loading',
        progress: 0,
        message: '載入 FFmpeg 核心中（首次約需 30 秒）...'
    });

    ffmpeg = new FFmpeg();

    // Use GPL version which includes libx264
    // This is the version with H.264 encoder support
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd';

    try {
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        });
    } catch (error) {
        console.warn('Multi-threaded core failed, trying single-threaded:', error);
        // Fallback to single-threaded core
        const fallbackURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${fallbackURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${fallbackURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
    }

    isLoaded = true;

    onProgress({
        stage: 'loading',
        progress: 100,
        message: 'FFmpeg 已載入'
    });

    return ffmpeg;
}

export async function transcodeToMP4(
    webmBlob: Blob,
    onProgress: ProgressCallback,
    videoDuration?: number
): Promise<Blob> {
    // Track start time for progress estimation
    const startTime = Date.now();
    let lastProgressUpdate = 0;

    try {
        const ff = await loadFFmpeg(onProgress);

        // Set up progress handler with proper value handling
        ff.on('progress', ({ progress, time }) => {
            // progress is 0-1 float, time is in microseconds
            // Clamp progress to valid range
            let percent = 0;

            if (typeof progress === 'number' && isFinite(progress) && progress >= 0 && progress <= 1) {
                percent = Math.round(progress * 100);
            } else if (time && videoDuration && time > 0) {
                // Fallback: calculate from time
                const currentSeconds = time / 1000000;
                percent = Math.max(0, Math.min(100, Math.round((currentSeconds / videoDuration) * 100)));
            }

            // Only update if progress changed significantly
            if (percent > lastProgressUpdate) {
                lastProgressUpdate = percent;

                // Estimate remaining time based on elapsed time
                const elapsedMs = Date.now() - startTime;
                let estimatedRemaining: number | undefined;

                if (percent > 5) {
                    const totalEstimated = (elapsedMs / percent) * 100;
                    estimatedRemaining = Math.round((totalEstimated - elapsedMs) / 1000);
                }

                onProgress({
                    stage: 'transcoding',
                    progress: percent,
                    message: `轉碼中... ${percent}%`,
                    estimatedTimeRemaining: estimatedRemaining
                });
            }
        });

        onProgress({
            stage: 'transcoding',
            progress: 0,
            message: '準備轉碼...'
        });

        // Write input file
        console.log('Input blob size:', webmBlob.size, 'bytes');
        const inputData = await fetchFile(webmBlob);
        await ff.writeFile('input.webm', inputData);

        onProgress({
            stage: 'transcoding',
            progress: 5,
            message: '開始轉碼為 MP4...'
        });

        // List available encoders for debugging
        console.log('Starting transcode...');

        // Transcode to MP4 using mpeg4 encoder (always available)
        // If libx264 is not available, this will use the built-in mpeg4 encoder
        const result = await ff.exec([
            '-i', 'input.webm',
            '-c:v', 'mpeg4',           // Use mpeg4 (always available)
            '-q:v', '5',                // Quality (lower = better, 2-31)
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            'output.mp4'
        ]);

        console.log('FFmpeg exec completed, return code:', result);

        onProgress({
            stage: 'transcoding',
            progress: 95,
            message: '讀取輸出檔案...'
        });

        // Read output file
        const outputData = await ff.readFile('output.mp4');

        // Validate output - outputData should be Uint8Array
        const outputArray = outputData as Uint8Array;
        console.log('Output file size:', outputArray.length, 'bytes');

        if (!outputArray || outputArray.length === 0) {
            throw new Error('轉碼輸出為空，請嘗試使用 WebM 格式');
        }

        // Create blob from Uint8Array
        const mp4Blob = new Blob([outputArray], { type: 'video/mp4' });

        // Cleanup
        try {
            await ff.deleteFile('input.webm');
            await ff.deleteFile('output.mp4');
        } catch (cleanupError) {
            console.warn('Cleanup error:', cleanupError);
        }

        onProgress({
            stage: 'complete',
            progress: 100,
            message: '轉碼完成！'
        });

        return mp4Blob;
    } catch (error) {
        console.error('Transcode error:', error);
        onProgress({
            stage: 'error',
            progress: 0,
            message: `轉碼失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
        });
        throw error;
    }
}

export function estimateTranscodeTime(durationSeconds: number): string {
    // Rough estimate: 3-5x realtime for WASM transcoding
    const estimatedSeconds = durationSeconds * 4;

    if (estimatedSeconds < 60) {
        return `約 ${Math.ceil(estimatedSeconds)} 秒`;
    } else if (estimatedSeconds < 120) {
        return '約 1-2 分鐘';
    } else {
        const minutes = Math.ceil(estimatedSeconds / 60);
        return `約 ${minutes} 分鐘`;
    }
}
