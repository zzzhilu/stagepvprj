'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function ClientPlaylistSidebar({ projectId }: { projectId: string }) {
    const [isOpen, setIsOpen] = useState(true);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    
    // 從 store 取得專案的影片清單與相關函式
    const gdriveVideos = useStore(state => state.gdriveVideos);
    const gdriveFolders = useStore(state => state.gdriveFolders);
    const setContentTextures = useStore(state => state.setContentTextures);
    const setActiveContent = useStore(state => state.setActiveContent);
    const setVideoPlaying = useStore(state => state.setVideoPlaying);
    const applyCue = useStore(state => state.applyCue);

    // 取得當前專案綁定的 GDrive 資料夾 ID (與後台管理同步)
    const currentFolderId = gdriveFolders[projectId] || '';
    
    // 過濾出屬於該資料夾的影片
    const projectVideos = gdriveVideos.filter((v: any) => v.folderId === currentFolderId);

    const formatDisplayName = (name: string) => {
        let formatted = name.replace(/\.[^.]+$/, ''); // 去除副檔名
        formatted = formatted.replace(/[_\-\s]?cue\s*\d+[_\-\s]?/gi, ' ').replace(/\s+/g, ' ').trim(); // 忽略 cue01, cue02 等描述
        return formatted || name.replace(/\.[^.]+$/, ''); // 如果清空了，就退回原本檔名(去副檔名)
    };
    const isImageFile = (filename: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);

    const handleVideoSelect = (video: any) => {
        const isImage = isImageFile(video.filename);

        // Add to loading state
        setLoadingIds(prev => new Set(prev).add(video.id));
        setTimeout(() => {
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(video.id);
                return next;
            });
        }, 1500);

        // 轉換為 contentTextures 能夠接受的格式
        const videoTexture = {
            id: video.id,
            name: video.filename,
            file_path: `/api/drive/stream/${video.driveFileId}`,
            type: (isImage ? 'image' : 'r2_video') as 'image' | 'r2_video',
        };

        // 像預設的分享頁面邏輯一樣，切換目前的 texture 並讓其成為 active
        setContentTextures([videoTexture]);
        setActiveContent(video.id);
        
        if (!isImage) {
            setVideoPlaying(true);
        }

        // 如果影片有綁定的 cue，則自動套用 cue
        if (video.cueId) {
            // 小延遲確保前面狀態更新後才吃燈光等 cue
            setTimeout(() => applyCue(video.cueId), 100);
        }
    };

    useEffect(() => {
        // Automatically play the first item in the playlist if we haven't yet and it exists
        if (projectVideos.length > 0 && !hasAutoPlayed) {
            handleVideoSelect(projectVideos[0]);
            setHasAutoPlayed(true);
        }
    }, [projectVideos, hasAutoPlayed]);

    return (
        <div 
            className={`absolute right-4 top-20 bottom-20 z-50 pointer-events-auto transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
            }`} 
            style={{ width: '16rem' }}
        >
            {/* 收合/展開按鈕 - 面板左側垂直置中，收合後靠窗邊，收合時變暗 */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute -left-6 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 backdrop-blur text-green-400 p-1 rounded-l-md shadow-[0_0_10px_rgba(0,0,0,0.4)] border border-r-0 border-green-500/40 hover:bg-gray-700 hover:border-green-400 transition-all duration-300 ${
                    !isOpen ? 'opacity-50 hover:opacity-100' : 'opacity-100'
                }`}
                title={isOpen ? '收起播放列表' : '展開播放列表'}
            >
                <svg 
                    className={`w-3 h-3 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* 面板主體 - 隨外容器滑動，自身僅做淡入/淡出 */}
            <div 
                className={`w-full h-full flex flex-col bg-gray-900/40 backdrop-blur-xl border border-green-500/30 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.1)] overflow-hidden transition-opacity duration-300 ease-in-out ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                <div className="p-3 border-b border-green-500/20 bg-gray-900/60">
                    <h3 className="text-white text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                        GDrive 播放列表
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {projectVideos.length === 0 ? (
                        <div className="text-gray-400 text-xs p-4 text-center mt-10">
                            目前沒有可播放的影片或圖片
                        </div>
                    ) : (
                        projectVideos.map((video: any) => {
                            const isActive = useStore.getState().activeContentId === video.id;
                            const isLoading = loadingIds.has(video.id);
                            const isImage = isImageFile(video.filename);
                            
                            return (
                                <button
                                    key={video.id}
                                    onClick={() => handleVideoSelect(video)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group flex items-start gap-2 border focus:outline-none ${
                                        isActive 
                                        ? 'bg-gray-800/80 text-white border-green-500/50' 
                                        : 'bg-gray-800/30 text-gray-300 hover:bg-gray-800/60 hover:text-white border-transparent hover:border-green-500/30'
                                    }`}
                                >
                                    {isLoading ? (
                                        <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                                            isActive ? 'text-green-400' : 'text-gray-500 group-hover:text-green-400'
                                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {isImage ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            ) : (
                                                <>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </>
                                            )}
                                        </svg>
                                    )}
                                    <span className="text-xs break-all leading-tight">
                                        {formatDisplayName(video.filename)}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
