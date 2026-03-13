'use client';

import { useStore, ContentTexture, TextureType } from '@/store/useStore';
import { useState, useRef } from 'react';
import { generateThumbnailFromFile } from '@/lib/thumbnail';

const MAX_VIDEO_SIZE_MB = 500; // Increased limit for Firebase
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export function TextureUploader() {
    const addContentTexture = useStore((state) => state.addContentTexture);
    const removeContentTexture = useStore((state) => state.removeContentTexture);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const setActiveContent = useStore((state) => state.setActiveContent);
    const setLoading = useStore((state) => state.setLoading);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

    const detectFileType = (filename: string): TextureType | null => {
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();

        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            return 'image';
        } else if (ext === '.mp4') {
            return 'video';
        }

        return null;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Detect file type
        const fileType = detectFileType(file.name);

        if (!fileType) {
            alert('不支援的檔案格式。請上傳 PNG、JPG 或 MP4 檔案。');
            return;
        }

        // Check MP4 file size limit (Firebase supports large files, but let's keep a reasonable check)
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
            alert(`檔案大小超過限制！\n最大允許：${MAX_VIDEO_SIZE_MB}MB\n您的檔案：${formatFileSize(file.size)}`);
            return;
        }

        setLoading(true, '上傳至雲端 (Firebase)...');

        try {
            // Generate thumbnail locally first using shared utility
            const thumbnail = await generateThumbnailFromFile(file);

            // Import Firebase functions dynamically
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');

            // Create reference
            const folder = fileType === 'video' ? 'videos' : 'images';
            const fileName = `${folder}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);

            // Upload directly
            const snapshot = await uploadBytes(storageRef, file);
            console.log('Uploaded texture!', snapshot);

            // Get URL
            const cloudUrl = await getDownloadURL(snapshot.ref);

            const newTexture: ContentTexture = {
                id: `texture_${Date.now()}`,
                name: file.name,
                file_path: cloudUrl, // Firebase URL
                type: fileType,
                thumbnail_url: thumbnail,
                file_size: file.size
            };

            addContentTexture(newTexture);
        } catch (error) {
            console.error('Error uploading texture:', error);
            alert(`上傳失敗: ${error instanceof Error ? error.message : '請重試'}`);
        } finally {
            setLoading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleLongPressStart = (id: string) => {
        setDeletingId(id);
        deleteTimerRef.current = setTimeout(() => {
            removeContentTexture(id);
            setDeletingId(null);
        }, 200);
    };

    const handleLongPressEnd = () => {
        if (deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = null;
        }
        setDeletingId(null);
    };

    // Separate textures by type
    const images = contentTextures.filter(t => t.type === 'image');
    const videos = contentTextures.filter(t => t.type === 'video');

    // HLS URL input handler
    const [hlsUrl, setHlsUrl] = useState('');
    const [urlError, setUrlError] = useState('');

    const handleHlsUrlSubmit = () => {
        if (!hlsUrl.trim()) {
            setUrlError('請輸入 URL');
            return;
        }

        // Basic URL validation
        try {
            new URL(hlsUrl);
        } catch {
            setUrlError('無效的 URL 格式');
            return;
        }

        // Check if it looks like a video URL
        const isHls = hlsUrl.includes('.m3u8');
        const isMp4 = hlsUrl.includes('.mp4');

        if (!isHls && !isMp4) {
            setUrlError('請輸入 .m3u8 (HLS) 或 .mp4 串流 URL');
            return;
        }

        setUrlError('');
        setLoading(true, '載入串流...');

        const newTexture: ContentTexture = {
            id: `stream_${Date.now()}`,
            name: isHls ? 'HLS 串流' : 'MP4 串流',
            file_path: hlsUrl.trim(),
            type: 'video',
            thumbnail_url: '', // No thumbnail for streams
        };

        addContentTexture(newTexture);
        setHlsUrl('');
        setLoading(false);
    };

    return (
        <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <h3 className="text-lg font-bold mb-3">內容輸入</h3>

                {/* File Upload */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,video/mp4"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-500 file:text-white
                        hover:file:bg-blue-600
                        file:cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                />
                <p className="text-xs text-gray-400 mt-2">
                    支援格式: PNG, JPG, MP4 (影片限制 {MAX_VIDEO_SIZE_MB}MB)
                </p>

                {/* HLS/Stream URL Input */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                        <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg> 串流 URL (HLS/MP4)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={hlsUrl}
                            onChange={(e) => {
                                setHlsUrl(e.target.value);
                                setUrlError('');
                            }}
                            placeholder="https://example.com/stream.m3u8"
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button
                            onClick={handleHlsUrlSubmit}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                        >
                            載入
                        </button>
                    </div>
                    {urlError && (
                        <p className="text-xs text-red-400 mt-1">{urlError}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        支援 .m3u8 (HLS) 及 .mp4 串流
                    </p>
                </div>
            </div>

            {/* Textures List */}
            <div className="p-4 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-300">
                        已上傳內容
                    </h4>
                    <span className="text-xs text-gray-500">
                        圖片 {images.length} · 影片 {videos.length}
                    </span>
                </div>

                {contentTextures.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">尚未上傳任何內容</p>
                ) : (
                    <div className="space-y-3">
                        {/* Images Section */}
                        {images.length > 0 && (
                            <div>
                                <h5 className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> 圖片 ({images.length})</h5>
                                <div className="grid grid-cols-2 gap-2">
                                    {images.map(texture => {
                                        const isActive = activeContentId === texture.id;
                                        return (
                                            <div
                                                key={texture.id}
                                                onClick={() => setActiveContent(texture.id)}
                                                className={`bg-gray-800 rounded overflow-hidden group relative cursor-pointer transition-all ${isActive ? 'ring-2 ring-violet-500 scale-[1.02]' : 'hover:ring-1 hover:ring-gray-600'
                                                    }`}
                                            >
                                                {/* Active Indicator */}
                                                {isActive && (
                                                    <div className="absolute top-1 left-1 z-10 bg-violet-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                        播放中
                                                    </div>
                                                )}

                                                {/* Thumbnail */}
                                                <div className="aspect-video bg-gray-700 flex items-center justify-center relative overflow-hidden">
                                                    {texture.thumbnail_url ? (
                                                        <img
                                                            src={texture.thumbnail_url}
                                                            alt={texture.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    )}

                                                    {/* Delete Button */}
                                                    <button
                                                        onMouseDown={(e) => { e.stopPropagation(); handleLongPressStart(texture.id); }}
                                                        onMouseUp={handleLongPressEnd}
                                                        onMouseLeave={handleLongPressEnd}
                                                        onTouchStart={(e) => { e.stopPropagation(); handleLongPressStart(texture.id); }}
                                                        onTouchEnd={handleLongPressEnd}
                                                        className={`absolute top-1 right-1 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${deletingId === texture.id ? 'bg-red-600 scale-110' : 'bg-red-500 hover:bg-red-600'
                                                            }`}
                                                        title="長按 1 秒刪除"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Info */}
                                                <div className="p-2">
                                                    <p className="text-xs text-gray-300 truncate" title={texture.name}>
                                                        {texture.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {texture.file_size ? formatFileSize(texture.file_size) : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {images.length > 0 && (
                            <div>
                                <h5 className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> 影片 ({videos.length})</h5>
                                <div className="grid grid-cols-2 gap-2">
                                    {videos.map(texture => {
                                        const isActive = activeContentId === texture.id;
                                        return (
                                            <div
                                                key={texture.id}
                                                onClick={() => setActiveContent(texture.id)}
                                                className={`bg-gray-800 rounded overflow-hidden group relative cursor-pointer transition-all ${isActive ? 'ring-2 ring-violet-500 scale-[1.02]' : 'hover:ring-1 hover:ring-gray-600'
                                                    }`}
                                            >
                                                {/* Active Indicator */}
                                                {isActive && (
                                                    <div className="absolute top-1 left-1 z-10 bg-violet-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                        播放中
                                                    </div>
                                                )}

                                                {/* Thumbnail */}
                                                <div className="aspect-video bg-gray-700 flex items-center justify-center relative overflow-hidden">
                                                    {texture.thumbnail_url ? (
                                                        <img
                                                            src={texture.thumbnail_url}
                                                            alt={texture.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    )}

                                                    {/* Delete Button */}
                                                    <button
                                                        onMouseDown={(e) => { e.stopPropagation(); handleLongPressStart(texture.id); }}
                                                        onMouseUp={handleLongPressEnd}
                                                        onMouseLeave={handleLongPressEnd}
                                                        onTouchStart={(e) => { e.stopPropagation(); handleLongPressStart(texture.id); }}
                                                        onTouchEnd={handleLongPressEnd}
                                                        className={`absolute top-1 right-1 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${deletingId === texture.id ? 'bg-red-600 scale-110' : 'bg-red-500 hover:bg-red-600'
                                                            }`}
                                                        title="長按 1 秒刪除"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Info */}
                                                <div className="p-2">
                                                    <p className="text-xs text-gray-300 truncate" title={texture.name}>
                                                        {texture.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {texture.file_size ? formatFileSize(texture.file_size) : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
