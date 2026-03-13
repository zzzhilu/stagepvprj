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
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.5 5.5a2.126 2.126 0 01-3-3l5.5-5.5m5.014-4.016l.164-.027a7.5 7.5 0 009.308 9.308l-.027.164m-9.445-9.445L15 6m-6.72 4.28L6 12.28m8.014-3.756L12 12.56" /></svg> 診斷
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[999] bg-gray-900 border border-yellow-500 rounded-lg shadow-2xl max-w-md w-full max-h-96 overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-yellow-500 p-3 flex justify-between items-center">
                <h3 className="text-yellow-500 font-bold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.5 5.5a2.126 2.126 0 01-3-3l5.5-5.5m5.014-4.016l.164-.027a7.5 7.5 0 009.308 9.308l-.027.164m-9.445-9.445L15 6m-6.72 4.28L6 12.28m8.014-3.756L12 12.56" /></svg> R2 視頻診斷面板
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
                        <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg> R2Videos 狀態 ({r2Videos.length})
                    </h4>
                    {r2Videos.length === 0 ? (
                        <p className="text-red-400"><svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> 無 R2 視頻數據</p>
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
                        <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" /></svg> ContentTextures 狀態 ({contentTextures.length})
                    </h4>
                    {contentTextures.length === 0 ? (
                        <p className="text-red-400"><svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> 無內容紋理數據</p>
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
                                        <p className="text-yellow-400 text-[10px]">▸ 當前播放</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Content */}
                <div className="bg-gray-800 rounded p-3">
                    <h4 className="text-yellow-400 font-semibold mb-2">
                        <svg className="w-3.5 h-3.5 inline-block mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> 當前播放內容
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
                        <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg> 數據同步檢查
                    </h4>
                    <div className="space-y-1">
                        <p className={r2Videos.length > 0 ? 'text-green-400' : 'text-red-400'}>
                            {r2Videos.length > 0 ? '✓' : '✗'} R2Videos 有數據: {r2Videos.length}
                        </p>
                        <p className={contentTextures.filter(t => t.type === 'r2_video').length > 0 ? 'text-green-400' : 'text-red-400'}>
                            {contentTextures.filter(t => t.type === 'r2_video').length > 0 ? '✓' : '✗'} R2 ContentTextures: {contentTextures.filter(t => t.type === 'r2_video').length}
                        </p>
                        <p className={r2Videos.length === contentTextures.filter(t => t.type === 'r2_video').length ? 'text-green-400' : 'text-yellow-400'}>
                            {r2Videos.length === contentTextures.filter(t => t.type === 'r2_video').length ? '✓' : '⚠'} 數據同步: {r2Videos.length === contentTextures.filter(t => t.type === 'r2_video').length ? '正常' : '不一致'}
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
                        <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" /></svg> 輸出到 Console
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
                        <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> 複製 JSON
                    </button>
                </div>
            </div>
        </div>
    );
}
