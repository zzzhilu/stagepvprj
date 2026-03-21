'use client';

import { useStore } from '@/store/useStore';
import { ModelUploader } from './ModelUploader';
import { TextureUploader } from './TextureUploader';
import { LightingControls } from './LightingControls';
import { ReflectionControls } from './ReflectionControls';
import ObjectInspector from './ObjectInspector';
import { FloorPlanUploader } from './FloorPlanUploader';
import CueManager from './CueManager';
import { R2VideoManager } from '@/components/client/R2VideoManager';
import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface AdminControlsProps {
    projectName?: string;
    mode?: 'free-test' | 'video-progress';
    projectId?: string;
    onSave?: () => void;
}

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
                <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg> 擷取當前視角
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

export default function AdminControls({ projectName, mode = 'free-test', projectId: propProjectId, onSave }: AdminControlsProps) {
    const params = useParams();
    const projectId = propProjectId || (params.id as string);
    const isVideoProgress = mode === 'video-progress';

    const storeMode = useStore((state) => state.mode);
    const startMode = useStore((state) => state.setMode);
    const gizmoEnabled = useStore((state) => state.gizmoEnabled);
    const setGizmoEnabled = useStore((state) => state.setGizmoEnabled);
    const transformMode = useStore((state) => state.transformMode);
    const setTransformMode = useStore((state) => state.setTransformMode);
    const [expandedSections, setExpandedSections] = useState<string[]>(isVideoProgress ? ['videos'] : ['models']);
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
                    <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> 分享連結已複製!
                </div>
            )}

            <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700 z-10">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold">Admin Panel</h2>
                    <div className="flex gap-2">
                        <a
                            href={isVideoProgress ? '/video-progress' : '/free-test'}
                            className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 flex items-center"
                            title="專案列表"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        </a>
                        <button
                            onClick={() => {
                                const newGizmoState = !gizmoEnabled;
                                setGizmoEnabled(newGizmoState);
                                if (newGizmoState) {
                                    startMode('admin');
                                }
                            }}
                            className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${gizmoEnabled
                                ? 'bg-violet-600 hover:bg-violet-700'
                                : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> Gizmo
                        </button>
                    </div>

                    {/* Transform Mode Buttons - Shown when Gizmo is enabled */}
                    {gizmoEnabled && (
                        <div className="flex gap-1 mt-2">
                            <button
                                onClick={() => setTransformMode('translate')}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${transformMode === 'translate'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:text-white'
                                    }`}
                            >
                                移動
                            </button>
                            <button
                                onClick={() => setTransformMode('rotate')}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${transformMode === 'rotate'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:text-white'
                                    }`}
                            >
                                旋轉
                            </button>
                        </div>
                    )}
                </div>

                {/* Display Current Project Name */}
                <div className="mb-3 px-3 py-2 bg-gray-800 rounded border border-gray-700">
                    <label className="text-xs text-gray-400 block mb-1">目前專案</label>
                    <div className="text-sm font-medium text-white truncate" title={projectName}>
                        {projectName || '未命名專案'}
                    </div>
                </div>

                {/* Share Button - Hidden in video-progress mode */}
                {!isVideoProgress && (
                    <button
                        onClick={handleShare}
                        className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        分享預覽連結
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Model Uploader Section - Hidden in video-progress mode */}
                {!isVideoProgress && (
                    <div>
                        <button
                            onClick={() => toggleSection('models')}
                            className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                        >
                            <span className="font-semibold flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> 模型上傳</span>
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
                )}

                {/* Content Input Section - R2VideoManager for video-progress, TextureUploader for free-test */}
                <div>
                    <button
                        onClick={() => toggleSection('videos')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold flex items-center gap-1.5">{isVideoProgress ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> 內容上傳區</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> 內容輸入</>}</span>
                        <svg
                            className={`w-5 h-5 transition-transform ${expandedSections.includes('videos') ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSections.includes('videos') && (
                        isVideoProgress
                            ? <R2VideoManager projectId={projectId} onSave={onSave} />
                            : <TextureUploader />
                    )}
                </div>

                {/* View Management Section */}
                <div>
                    <button
                        onClick={() => toggleSection('views')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg> 視角管理</span>
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
                        <span className="font-semibold flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> 場景 (Cues)</span>
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

                {/* Object Inspector Section - Hidden in video-progress mode */}
                {!isVideoProgress && (
                    <div>
                        <button
                            onClick={() => toggleSection('inspector')}
                            className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                        >
                            <span className="font-semibold flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> 物件屬性</span>
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
                )}

                {/* Floor Plan Uploader - Auto-shows when PLANE object exists */}
                {!isVideoProgress && (
                    <FloorPlanUploader />
                )}

                {/* Lighting Controls Section */}
                <div>
                    <button
                        onClick={() => toggleSection('lighting')}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 rounded mb-2"
                    >
                        <span className="font-semibold flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> 全域照明</span>
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

                {/* Reflection Settings Section - Show only when Perfect Render is enabled */}
                <ReflectionControls />
            </div>
        </div>
    );
}
