'use client';

import { useStore } from '@/store/useStore';
import { useState, useRef } from 'react';

export function FloorPlanUploader() {
    const floorPlanTextureUrl = useStore((state) => state.floorPlanTextureUrl);
    const setFloorPlanTexture = useStore((state) => state.setFloorPlanTexture);
    const setLoading = useStore((state) => state.setLoading);
    const stageObjects = useStore((state) => state.stageObjects);

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if there's a floor_plan object in the scene
    const hasFloorPlan = stageObjects.some(obj => obj.type === 'floor_plan');

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate image type
        if (!file.type.startsWith('image/')) {
            alert('請上傳圖片檔案 (JPG、PNG、WebP)');
            return;
        }

        setUploading(true);
        setLoading(true, '上傳平面圖...');

        try {
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');

            const fileName = `floorplans/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setFloorPlanTexture(url);
            console.log('Floor plan texture uploaded:', url);
        } catch (error) {
            console.error('Floor plan upload failed:', error);
            alert(`上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setUploading(false);
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClear = async () => {
        if (!floorPlanTextureUrl) return;

        if (!confirm('確定要移除平面圖貼圖嗎？')) return;

        try {
            // Try to delete from Firebase Storage
            const { ref, deleteObject } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');
            const fileRef = ref(storage, floorPlanTextureUrl);
            await deleteObject(fileRef);
        } catch (error) {
            console.warn('Could not delete floor plan file (may already be removed):', error);
        }

        setFloorPlanTexture(null);
    };

    // Don't show if no floor plan object exists
    if (!hasFloorPlan) return null;

    return (
        <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                平面圖貼圖 (Floor Plan)
            </h3>

            {floorPlanTextureUrl ? (
                <div className="space-y-2">
                    {/* Preview */}
                    <div className="relative rounded overflow-hidden border border-gray-700">
                        <img
                            src={floorPlanTextureUrl}
                            alt="Floor Plan"
                            className="w-full h-32 object-cover"
                        />
                        <div className="absolute top-1 right-1 flex gap-1">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gray-900/80 hover:bg-gray-800 text-white p-1.5 rounded transition-colors"
                                title="替換貼圖"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button
                                onClick={handleClear}
                                className="bg-red-900/80 hover:bg-red-800 text-red-200 p-1.5 rounded transition-colors"
                                title="移除貼圖"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-500 text-center">已套用至場景中的 PLANE 模型</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
                    >
                        {uploading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                上傳中...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                上傳平面圖貼圖
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-gray-500 text-center">
                        支援 JPG、PNG、WebP 格式
                    </p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                className="hidden"
            />
        </div>
    );
}
