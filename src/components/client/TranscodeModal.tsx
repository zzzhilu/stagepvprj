'use client';

import { TranscodeProgress } from '@/lib/transcode';

interface TranscodeModalProps {
    progress: TranscodeProgress | null;
    videoDuration?: number;
    onClose?: () => void;
}

export function TranscodeModal({ progress, videoDuration, onClose }: TranscodeModalProps) {
    if (!progress) return null;

    const isComplete = progress.stage === 'complete';
    const isError = progress.stage === 'error';
    const canClose = isComplete || isError;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    {isComplete ? (
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    ) : isError ? (
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center animate-pulse">
                            <svg className="w-6 h-6 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isComplete ? '轉碼完成' : isError ? '轉碼失敗' : '正在轉碼為 MP4'}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {progress.stage === 'loading' ? '首次載入需要下載 FFmpeg 核心' :
                                isComplete ? '檔案已準備好下載' :
                                    isError ? '請重試或使用 WebM 格式' :
                                        '使用 FFmpeg WASM 進行轉碼'}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                {!isComplete && !isError && (
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>{progress.message}</span>
                            <span>{progress.progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-300 ease-out"
                                style={{ width: `${progress.progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Time Estimate */}
                {progress.stage === 'transcoding' && videoDuration && (
                    <div className="text-center text-sm text-gray-500 mb-4">
                        <p>預估轉碼時間：約 {Math.ceil(videoDuration * 4 / 60)} 分鐘</p>
                        <p className="text-xs mt-1">（取決於電腦效能）</p>
                    </div>
                )}

                {/* Warning for long videos */}
                {progress.stage === 'loading' && videoDuration && videoDuration > 60 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                        <p className="text-yellow-400 text-sm">
                            ⚠️ 影片較長，轉碼可能需要 {Math.ceil(videoDuration * 4 / 60)} 分鐘或更久
                        </p>
                    </div>
                )}

                {/* Success Message */}
                {isComplete && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4 text-center">
                        <p className="text-green-400">✅ MP4 檔案已自動下載</p>
                    </div>
                )}

                {/* Error Message */}
                {isError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                        <p className="text-red-400 text-sm">{progress.message}</p>
                    </div>
                )}

                {/* Close Button */}
                {canClose && onClose && (
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                    >
                        關閉
                    </button>
                )}

                {/* Cancel hint */}
                {!canClose && (
                    <p className="text-center text-xs text-gray-500 mt-4">
                        請勿關閉視窗，轉碼完成後將自動下載
                    </p>
                )}
            </div>
        </div>
    );
}
