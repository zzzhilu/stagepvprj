'use client';

import { useStore } from '@/store/useStore';
import { useState } from 'react';

/**
 * R2VideoDebugPanel - 診斷工具
 * 用於檢查 R2 視頻管理的狀態和數據
 * 
 * 使用方法：
 * 1. 在 video-progress/[id]/page.tsx 中導入此組件
 * 2. 在開發模式下渲染此組件
 * 3. 查看實時狀態信息
 */
export function R2VideoDebugPanel() {
    const [isVisible, setIsVisible] = useState(false);
    const r2Videos = useStore((state) => state.r2Videos);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 right-4 z-[999] bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold"
                title="打開診斷面板"
            >
                🔧 診斷
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[999] bg-gray-900 border border-yellow-500 rounded-lg shadow-2xl max-w-md w-full max-h-96 overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-yellow-500 p-3 flex justify-between items-center">
                <h3 className="text-yellow-500 font-bold flex items-center gap-2">
                    🔧 R2 視頻診斷面板
                </h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-white"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 text-white text-xs">
                {/* R2 Videos State */}
                <div className="bg-gray-800 rounded p-3">
                    <h4 className="text-yellow-400 font-semibold mb-2">
                        📹 R2Videos 狀態 ({r2Videos.length})
                    </h4>
                    {r2Videos.length === 0 ? (
                        <p className="text-red-400">⚠️ 無 R2 視頻數據</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-auto">
                            {r2Videos.map((video, idx) => (
                                <div key={video.id} className="bg-gray-700 rounded p-2">
                                    <p className="text-green-400">#{idx + 1} {video.filename}</p>
                                    <p className="text-gray-400 text-[10px] truncate">
                                        ID: {video.id}
                                    </p>
                                    <p className="text-gray-400 text-[10px] truncate">
                                        URL: {video.r2_url}
                                    </p>
                                    <p className="text-gray-400 text-[10px]">
                                        時間: {new Date(video.uploadedAt).toLocaleString('zh-TW')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Textures State */}
                <div className="bg-gray-800 rounded p-3">
                    <h4 className="text-yellow-400 font-semibold mb-2">
                        🎨 ContentTextures 狀態 ({contentTextures.length})
                    </h4>
                    {contentTextures.length === 0 ? (
                        <p className="text-red-400">⚠️ 無內容紋理數據</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-auto">
                            {contentTextures.map((texture, idx) => (
                                <div key={texture.id} className="bg-gray-700 rounded p-2">
                                    <p className={`${texture.type === 'r2_video' ? 'text-green-400' : 'text-blue-400'}`}>
                                        #{idx + 1} {texture.name} ({texture.type})
                                    </p>
                                    <p className="text-gray-400 text-[10px] truncate">
                                        ID: {texture.id}
                                    </p>
                                    {texture.id === activeContentId && (
                                        <p className="text-yellow-400 text-[10px]">👉 當前播放</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Content */}
                <div className="bg-gray-800 rounded p-3">
                    <h4 className="text-yellow-400 font-semibold mb-2">
                        ▶️ 當前播放內容
                    </h4>
                    {activeContentId ? (
                        <p className="text-green-400">{activeContentId}</p>
                    ) : (
                        <p className="text-gray-500">無</p>
                    )}
                </div>

                {/* Sync Check */}
                <div className="bg-gray-800 rounded p-3">
                    <h4 className="text-yellow-400 font-semibold mb-2">
                        🔄 數據同步檢查
                    </h4>
                    <div className="space-y-1">
                        <p className={r2Videos.length > 0 ? 'text-green-400' : 'text-red-400'}>
                            {r2Videos.length > 0 ? '✅' : '❌'} R2Videos 有數據: {r2Videos.length}
                        </p>
                        <p className={contentTextures.filter(t => t.type === 'r2_video').length > 0 ? 'text-green-400' : 'text-red-400'}>
                            {contentTextures.filter(t => t.type === 'r2_video').length > 0 ? '✅' : '❌'} R2 ContentTextures: {contentTextures.filter(t => t.type === 'r2_video').length}
                        </p>
                        <p className={r2Videos.length === contentTextures.filter(t => t.type === 'r2_video').length ? 'text-green-400' : 'text-yellow-400'}>
                            {r2Videos.length === contentTextures.filter(t => t.type === 'r2_video').length ? '✅' : '⚠️'} 數據同步: {r2Videos.length === contentTextures.filter(t => t.type === 'r2_video').length ? '正常' : '不一致'}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            console.log('=== R2 視頻診斷數據 ===');
                            console.log('r2Videos:', r2Videos);
                            console.log('contentTextures:', contentTextures);
                            console.log('activeContentId:', activeContentId);
                            alert('診斷數據已輸出到 Console');
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs"
                    >
                        📋 輸出到 Console
                    </button>
                    <button
                        onClick={() => {
                            const data = {
                                r2Videos,
                                contentTextures,
                                activeContentId,
                                timestamp: new Date().toISOString(),
                            };
                            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                            alert('診斷數據已複製到剪貼板');
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs"
                    >
                        📄 複製 JSON
                    </button>
                </div>
            </div>
        </div>
    );
}
