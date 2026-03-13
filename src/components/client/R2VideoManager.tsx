'use client';

import { useStore, R2Video } from '@/store/useStore';
import { useState, useRef } from 'react';

interface R2VideoManagerProps {
    projectId: string;
    onSave?: () => void; // Callback to trigger project save
}

export function R2VideoManager({ projectId, onSave }: R2VideoManagerProps) {
    const r2Videos = useStore((state) => state.r2Videos);
    const addR2Video = useStore((state) => state.addR2Video);
    const removeR2Video = useStore((state) => state.removeR2Video);
    const setActiveContent = useStore((state) => state.setActiveContent);
    const addContentTexture = useStore((state) => state.addContentTexture);
    const removeContentTexture = useStore((state) => state.removeContentTexture);
    const contentTextures = useStore((state) => state.contentTextures);
    const setLoading = useStore((state) => state.setLoading);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['video/mp4', 'video/x-m4v', 'video/webm', 'video/quicktime'];
        if (!validTypes.includes(file.type)) {
            setError('請上傳 MP4、M4V 或 WebM 格式的影片');
            return;
        }

        setError(null);
        setUploading(true);
        setUploadProgress(0);

        try {
            // Step 1: Get presigned URL from our API
            const presignedResponse = await fetch('/api/r2-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                }),
            });

            if (!presignedResponse.ok) {
                const data = await presignedResponse.json();
                throw new Error(data.details || data.error || 'Failed to get upload URL');
            }

            const { uploadUrl, publicUrl, videoId, filename, key } = await presignedResponse.json();

            // Step 2: Upload file directly to R2 using presigned URL
            const xhr = new XMLHttpRequest();

            await new Promise<void>((resolve, reject) => {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(progress);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Upload failed'));

                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.send(file);
            });

            // Step 3: Add video to store
            const newVideo: R2Video = {
                id: videoId,
                filename: filename,
                r2_url: publicUrl,
                uploadedAt: Date.now(),
            };

            addR2Video(newVideo);

            // Also create a ContentTexture so it can be displayed
            addContentTexture({
                id: videoId,
                name: filename,
                file_path: publicUrl,
                type: 'r2_video',
            });

            // Trigger save callback after state updates
            // Use setTimeout to ensure Zustand state updates have completed
            setTimeout(() => {
                onSave?.();
            }, 100);

            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : '上傳失敗');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (video: R2Video) => {
        if (!confirm(`確定要刪除 ${video.filename} 嗎？此操作無法復原。`)) {
            return;
        }

        setLoading(true, '刪除中...');

        try {
            // Extract key from R2 URL
            const urlParts = video.r2_url.split('/');
            // Find the index of 'videos' to start the key, or fallback to slice(3)
            const videosIndex = urlParts.indexOf('videos');
            let key = '';

            if (videosIndex !== -1) {
                key = urlParts.slice(videosIndex).join('/');
            } else {
                // Fallback for unexpected URL structure, remove empty parts causing leading slashes
                const pathParts = urlParts.slice(3).filter(part => part !== '');
                key = pathParts.join('/');
            }

            // Delete from R2
            const response = await fetch('/api/r2-upload', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.details || data.error || 'Failed to delete from R2');
            }

            // Remove from store
            removeR2Video(video.id);

            // Also remove ContentTexture if exists
            const existingTexture = contentTextures.find(t => t.id === video.id);
            if (existingTexture) {
                removeContentTexture(video.id);
            }

            // Trigger save callback after state updates
            setTimeout(() => {
                onSave?.();
            }, 100);
        } catch (err: any) {
            console.error('Delete error:', err);
            const errorMessage = err instanceof Error ? err.message : '刪除失敗';

            // Check for credential/permission errors to force remove
            const isCredentialError =
                errorMessage.includes('credential') ||
                errorMessage.includes('AccessDenied') ||
                errorMessage.includes('InvalidAccessKeyId') ||
                errorMessage.includes('SignatureDoesNotMatch');

            if (isCredentialError) {
                // Force remove from store despite backend error
                removeR2Video(video.id);
                // Also remove ContentTexture if exists
                const existingTexture = contentTextures.find(t => t.id === video.id);
                if (existingTexture) {
                    removeContentTexture(video.id);
                }
                setTimeout(() => {
                    onSave?.();
                }, 100);
                setError(`${errorMessage} (因憑證錯誤，已強制從列表移除)`);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (video: R2Video) => {
        const shareUrl = `${window.location.origin}/share/${projectId}?video=${video.id}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedId(video.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handlePlay = (video: R2Video) => {
        // Find or create ContentTexture for this video
        let texture = contentTextures.find(t => t.id === video.id);

        if (!texture) {
            // Create ContentTexture if it doesn't exist
            texture = {
                id: video.id,
                name: video.filename,
                file_path: video.r2_url,
                type: 'r2_video',
            };
            addContentTexture(texture);
        }

        setActiveContent(video.id);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">內容管理</h3>
                <div className="relative group">
                    <label className={`
                        px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all flex items-center gap-1.5
                        ${uploading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-700'
                        } text-white
                    `}>
                        {uploading ? '上傳中...' : (<>上傳影片 <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></>)}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/x-m4v,video/webm,video/quicktime"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                    {/* Info Tooltip Bubble */}
                    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl z-50">
                        <div className="absolute -top-1.5 right-6 w-3 h-3 bg-gray-900 border-l border-t border-gray-600 rotate-45" />
                        <p className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            上傳限制與說明
                        </p>
                        <ul className="space-y-1.5 text-[11px] text-gray-300">
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">▸</span>
                                <span>支援格式：<span className="text-white font-medium">MP4、M4V、WebM、MOV</span></span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">▸</span>
                                <span>上傳頻率限制：<span className="text-white font-medium">每分鐘 10 次</span></span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">▸</span>
                                <span>上傳連結有效期：<span className="text-white font-medium">1 小時</span></span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">▸</span>
                                <span>儲存服務：<span className="text-white font-medium">Cloudflare R2</span></span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-yellow-400 mt-0.5">⚠</span>
                                <span className="text-yellow-200/80">建議影片大小不超過 <span className="font-medium">500MB</span>，過大可能導致上傳逾時</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>上傳進度</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 text-red-400 hover:text-red-300"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Video List */}
            {r2Videos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2"><svg className="w-10 h-10 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg></div>
                    <p>尚無上傳影片</p>
                    <p className="text-sm mt-1">上傳影片以產生分享連結</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {r2Videos.map((video) => (
                        <div
                            key={video.id}
                            className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                            {/* Video Icon */}
                            <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>

                            {/* Video Info */}
                            <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate">
                                    {video.filename}
                                </div>
                                <div className="text-gray-500 text-xs">
                                    {formatDate(video.uploadedAt)}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Play Button */}
                                <button
                                    onClick={() => handlePlay(video)}
                                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                    title="播放"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    </svg>
                                </button>

                                {/* Share Button */}
                                <button
                                    onClick={() => handleShare(video)}
                                    className={`p-2 rounded-lg transition-colors ${copiedId === video.id
                                        ? 'bg-green-600 text-white'
                                        : 'hover:bg-gray-700 text-gray-400 hover:text-white'
                                        }`}
                                    title={copiedId === video.id ? '已複製!' : '複製分享連結'}
                                >
                                    {copiedId === video.id ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                    )}
                                </button>

                                {/* Delete Button */}
                                <button
                                    onClick={() => handleDelete(video)}
                                    className="p-2 rounded-lg hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"
                                    title="刪除"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
