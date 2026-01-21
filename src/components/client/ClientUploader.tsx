'use client';

import { useStore, ContentTexture } from '@/store/useStore';
import { useRef, useState } from 'react';

export function ClientUploader() {
    const addContentTexture = useStore((state) => state.addContentTexture);
    const contentTextures = useStore((state) => state.contentTextures);
    const removeContentTexture = useStore((state) => state.removeContentTexture);
    const setActiveContent = useStore((state) => state.setActiveContent);
    const setLoading = useStore((state) => state.setLoading);
    const videoPlaying = useStore((state) => state.videoPlaying);
    const activeContentId = useStore((state) => state.activeContentId);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Check if current content is a video and playing
    const activeContent = contentTextures.find(t => t.id === activeContentId);
    const isVideoPlaying = activeContent?.type === 'video' && videoPlaying;

    const clearPreviousContent = () => {
        // Clear all existing content and revoke object URLs to free memory
        contentTextures.forEach(texture => {
            // Revoke object URL if it exists
            if (texture.file_path.startsWith('blob:')) {
                URL.revokeObjectURL(texture.file_path);
            }
            if (texture.thumbnail_url?.startsWith('blob:')) {
                URL.revokeObjectURL(texture.thumbnail_url);
            }
            removeContentTexture(texture.id);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            alert('請上傳圖片 (PNG/JPG) 或影片 (MP4)');
            return;
        }

        // Remove video size limit since we're not storing in memory
        // Large files are now handled efficiently with Object URLs

        setLoading(true, '載入中...');

        try {
            // Clear previous content
            clearPreviousContent();

            // Create Object URL - just a reference, not a copy!
            // This is extremely memory efficient
            const objectUrl = URL.createObjectURL(file);

            let thumbnailUrl = '';

            if (isImage) {
                // For images, create a small thumbnail
                thumbnailUrl = await generateImageThumbnail(objectUrl);
            } else if (isVideo) {
                // Generate video thumbnail with timeout
                try {
                    thumbnailUrl = await generateVideoThumbnail(objectUrl);
                } catch {
                    thumbnailUrl = '';
                }
            }

            const newTexture: ContentTexture = {
                id: `client_${Date.now()}`,
                name: file.name,
                file_path: objectUrl,  // Object URL instead of data URL
                type: isVideo ? 'video' : 'image',
                thumbnail_url: thumbnailUrl,
                file_size: file.size,
            };

            addContentTexture(newTexture);
            setActiveContent(newTexture.id);
        } catch (error) {
            console.error('Upload error:', error);
            alert('載入失敗，請重試');
        } finally {
            setLoading(false);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const generateImageThumbnail = (imageUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 90;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                } else {
                    resolve(imageUrl);
                }
            };
            img.onerror = () => resolve(imageUrl);
            img.src = imageUrl;
        });
    };

    const generateVideoThumbnail = (videoUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = videoUrl;
            video.muted = true;

            // Timeout after 5 seconds
            const timeout = setTimeout(() => {
                video.src = '';
                resolve('');
            }, 5000);

            const cleanup = () => {
                clearTimeout(timeout);
            };

            video.onloadeddata = () => {
                video.currentTime = 0.1;
            };

            video.onseeked = () => {
                cleanup();
                const canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 90;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                } else {
                    resolve('');
                }
            };

            video.onerror = () => {
                cleanup();
                resolve('');
            };
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && fileInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
            fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    // Hide uploader when video is playing for cleaner view
    if (isVideoPlaying) {
        return null;
    }

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md transition-all
                    ${isDragging
                        ? 'bg-violet-600/80 scale-105 ring-2 ring-violet-400'
                        : 'bg-black/60 hover:bg-black/70'
                    }
                `}
            >
                <span className="text-white text-sm font-medium">上傳內容預覽</span>

                <label className="cursor-pointer bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    選擇檔案
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,video/mp4"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>

                <span className="text-gray-400 text-xs">
                    或拖放檔案
                </span>
            </div>
        </div>
    );
}
