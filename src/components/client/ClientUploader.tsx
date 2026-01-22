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
    const [showTooltip, setShowTooltip] = useState(false);

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
        <div
            className="absolute top-4 left-4 z-40 pointer-events-auto"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="relative">
                {/* Tooltip - Below and to the right */}
                {showTooltip && (
                    <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900/95 text-white text-xs rounded-lg shadow-lg whitespace-nowrap backdrop-blur-sm border border-gray-700/50">
                        <div className="font-medium mb-1">格式：PNG / JPG / MP4 / M4V</div>
                        <div className="text-gray-400">檔案只存於本地，不上傳雲端</div>
                        {/* Arrow - Points up */}
                        <div className="absolute bottom-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-900/95" />
                    </div>
                )}

                {/* Upload Icon Button */}
                <label
                    className={`
                        cursor-pointer w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
                        ${isDragging
                            ? 'bg-violet-600 scale-110 ring-2 ring-violet-400'
                            : 'bg-black/60 hover:bg-violet-600 backdrop-blur-md'
                        }
                    `}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,video/mp4,video/x-m4v"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>
            </div>
        </div>
    );

}
