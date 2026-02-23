'use client';

/**
 * 共用的縮圖生成工具函數
 * 從 ClientUploader.tsx 和 TextureUploader.tsx 提取的共用邏輯
 */

export interface ThumbnailOptions {
    width?: number;
    height?: number;
    quality?: number;
    timeout?: number;
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
    width: 160,
    height: 90,
    quality: 0.7,
    timeout: 5000,
};

/**
 * 從圖片 URL 生成縮圖
 * @param imageUrl - 圖片的 URL（可以是 Object URL 或 Data URL）
 * @param options - 縮圖選項
 * @returns 縮圖的 Data URL，失敗時返回原始 URL
 */
export function generateImageThumbnail(
    imageUrl: string,
    options: ThumbnailOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = opts.width;
            canvas.height = opts.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', opts.quality));
            } else {
                resolve(imageUrl);
            }
        };
        img.onerror = () => resolve(imageUrl);
        img.src = imageUrl;
    });
}

/**
 * 從影片 URL 生成縮圖（擷取第一幀）
 * @param videoUrl - 影片的 URL（可以是 Object URL）
 * @param options - 縮圖選項
 * @returns 縮圖的 Data URL，失敗時返回空字串
 */
export function generateVideoThumbnail(
    videoUrl: string,
    options: ThumbnailOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.muted = true;

        // 超時處理
        const timeout = setTimeout(() => {
            video.src = '';
            resolve('');
        }, opts.timeout);

        const cleanup = () => {
            clearTimeout(timeout);
        };

        video.onloadeddata = () => {
            video.currentTime = 0.1;
        };

        video.onseeked = () => {
            cleanup();
            const canvas = document.createElement('canvas');
            canvas.width = opts.width;
            canvas.height = opts.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', opts.quality));
            } else {
                resolve('');
            }
        };

        video.onerror = () => {
            cleanup();
            resolve('');
        };
    });
}

/**
 * 從 File 物件生成縮圖（自動判斷類型）
 * @param file - File 物件
 * @param options - 縮圖選項
 * @returns 縮圖的 Data URL
 */
export async function generateThumbnailFromFile(
    file: File,
    options: ThumbnailOptions = {}
): Promise<string> {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isImage) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target?.result as string;
                const thumbnail = await generateImageThumbnail(dataUrl, options);
                resolve(thumbnail);
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    } else if (isVideo) {
        const objectUrl = URL.createObjectURL(file);
        try {
            const thumbnail = await generateVideoThumbnail(objectUrl, options);
            return thumbnail;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    return '';
}
