'use client';

import { useStore } from '@/store/useStore';
import { ModelUploader } from './ModelUploader';
import { TextureUploader } from './TextureUploader';
import { LightingControls } from './LightingControls';
import ObjectInspector from './ObjectInspector';
import CueManager from './CueManager';
import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';

function ViewManager() {
    const triggerCapture = useStore((state) => state.triggerCapture);
    const views = useStore((state) => state.views);
    const removeView = useStore((state) => state.removeView);
    const setActiveView = useStore((state) => state.setActiveView);
    const activeViewId = useStore((state) => state.activeViewId);
    const fov = useStore((state) => state.fov);
    const setFov = useStore((state) => state.setFov);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleLongPressStart = (id: string) => {
        setDeletingId(id);
        deleteTimerRef.current = setTimeout(() => {
            removeView(id);
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

    return (
        <div>
            <button
                onClick={triggerCapture}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-sm mb-4"
            >
                📷 擷取當前視角
            </button>

            {/* FOV Control */}
            <div className="bg-gray-800 p-3 rounded mb-4">
                <label className="text-xs text-gray-400 block mb-1 flex justify-between">
                    <span>Field of View (FOV)</span>
                    <span className="text-white">{Math.round(fov)}°</span>
                </label>
                <input
                    type="range"
                    min="10"
                    max="120"
                    value={fov}
                    onChange={(e) => setFov(Number(e.target.value))}
                    className="w-full accent-violet-500 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div className="space-y-2">
                {views.map((view, index) => (
                    <div
                        key={view.id}
                        className={`bg-gray-800 p-3 rounded flex justify-between items-center group transition-all ${activeViewId === view.id ? 'ring-2 ring-violet-500' : ''
                            } ${deletingId === view.id ? 'bg-red-900' : ''}`}
                    >
                        <div
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                            onClick={() => setActiveView(view.id)}
                        >
                            {/* Thumbnail */}
                            <div className="w-12 h-8 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                {view.thumbnail_url ? (
                                    <img
                                        src={view.thumbnail_url}
                                        alt={view.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                        {index + 1}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-white">{view.name}</p>
                                <p className="text-xs text-gray-500">視角 #{view.order}</p>
                            </div>
                        </div>

                        {/* Delete button */}
                        <button
                            onMouseDown={() => handleLongPressStart(view.id)}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onTouchStart={() => handleLongPressStart(view.id)}
                            onTouchEnd={handleLongPressEnd}
                            className={`p-2 rounded opacity-0 group-hover:opacity-100 transition-all ${deletingId === view.id
                                ? 'bg-red-600 opacity-100 scale-110'
                                : 'bg-red-500 hover:bg-red-600'
                                }`}
                            title="長按 1 秒刪除"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
                {views.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">尚未儲存任何視角</p>
                )}
            </div>

            {views.length > 0 && (
                <p className="text-[10px] text-gray-500 mt-2 text-center">點擊預覽 · 長按刪除按鈕移除</p>
            )}
        </div>
    )
}

export default function AdminControls({ projectName }: { projectName?: string }) {
    const params = useParams();
    const projectId = params.id as string;

    const mode = useStore((state) => state.mode);
    const startMode = useStore((state) => state.setMode);
    const [expandedSections, setExpandedSections] = useState<string[]>(['models']);
    const [shareToast, setShareToast] = useState(false);

    const setLoading = useStore((state) => state.setLoading);

    const handleShare = async () => {
        setLoading(true, '正在建立分享連結...');

        try {
            // Since we are already in a persistent project (free-test/[id]), 
            // we just generate a link to the current project ID.
            // The name will be loaded dynamically from the DB by the viewer.

            const shareUrl = `${window.location.origin}/free-test/${projectId}?share=1`;

            await navigator.clipboard.writeText(shareUrl);
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);

        } catch (error) {
            console.error('Share failed:', error);
            alert('分享失敗，請稍後再試。');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    return (
        <div className="absolute top-0 right-0 w-96 h-full bg-gray-900/95 overflow-y-auto text-white z-50 pointer-events-auto border-l border-gray-700">
            {/* Share Toast */}
            {shareToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg z-[100] animate-pulse">
                    ✅ 分享連結已複製!
                </div>
            )}

            <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700 z-10">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold">Admin Panel</h2>
                    <div className="flex gap-2">
                        <a
                            href="/free-test"
                            className="text-xs bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 flex items-center gap-1"
                        >
                            <span>📂</span> 專案列表
                        </a>
                        <button
                            onClick={() => startMode('client')}
                            className="text-xs bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                        >
                            Exit
                        </button>
                    </div>
                </div>

                {/* Display Current Project Name */}
                <div className="mb-3 px-3 py-2 bg-gray-800 rounded border border-gray-700">
                    <label className="text-xs text-gray-400 block mb-1">目前專案</label>
                    <div className="text-sm font-medium text-white truncate" title={projectName}>
                        {projectName || '未命名專案'}
                    </div>
                </div>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    分享預覽連結
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Model Uploader Section */}
                <div>
                    <button
                        onClick={() => toggleSection('models')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold">📦 模型上傳</span>
                        <svg
                            className={`w-5 h-5 transition-transform ${expandedSections.includes('models') ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSections.includes('models') && <ModelUploader />}
                </div>

                {/* Texture Uploader Section */}
                <div>
                    <button
                        onClick={() => toggleSection('videos')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold">🎨 內容輸入</span>
                        <svg
                            className={`w-5 h-5 transition-transform ${expandedSections.includes('videos') ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSections.includes('videos') && <TextureUploader />}
                </div>

                {/* View Management Section */}
                <div>
                    <button
                        onClick={() => toggleSection('views')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold">📷 視角管理</span>
                        <svg
                            className={`w-5 h-5 transition-transform ${expandedSections.includes('views') ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSections.includes('views') && (
                        <div className="bg-gray-900 text-white rounded-lg p-4">
                            <ViewManager />
                        </div>
                    )}
                </div>

                {/* Cue Management Section [NEW] */}
                <div>
                    <button
                        onClick={() => toggleSection('cues')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold">🎬 場景 (Cues)</span>
                        <svg
                            className={`w-5 h-5 transition-transform ${expandedSections.includes('cues') ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSections.includes('cues') && (
                        <div className="bg-gray-900 text-white rounded-lg">
                            <CueManager />
                        </div>
                    )}
                </div>

                {/* Object Inspector Section [NEW] */}
                <div>
                    <button
                        onClick={() => toggleSection('inspector')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold">🔧 物件屬性</span>
                        <svg
                            className={`w-5 h-5 transition-transform ${expandedSections.includes('inspector') ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSections.includes('inspector') && (
                        <div className="bg-gray-900 text-white rounded-lg">
                            <ObjectInspector />
                        </div>
                    )}
                </div>

                {/* Lighting Controls Section */}
                <div>
                    <button
                        onClick={() => toggleSection('lighting')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold">💡 全域照明</span>
                        <svg
                            className={`w-5 h-5 transition-transform ${expandedSections.includes('lighting') ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSections.includes('lighting') && <LightingControls />}
                </div>
            </div>
        </div>
    );
}
