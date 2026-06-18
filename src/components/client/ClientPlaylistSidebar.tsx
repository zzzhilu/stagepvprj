'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { resolveGDriveUrl } from '@/lib/gdrive-direct';
import { ProjectService } from '@/lib/project-service';

export function ClientPlaylistSidebar({ projectId }: { projectId: string }) {
    const [isOpen, setIsOpen] = useState(true);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<number | null>(null);
    
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

    const handleVideoSelect = async (video: any) => {
        const isImage = isImageFile(video.filename);

        // Add to loading state
        setLoadingIds(prev => new Set(prev).add(video.id));

        // Resolve GDrive URL directly (bypasses Vercel bandwidth)
        let filePath: string;
        try {
            filePath = await resolveGDriveUrl(video.driveFileId);
        } catch {
            filePath = `/api/drive/stream/${video.driveFileId}`;
        }

        setLoadingIds(prev => {
            const next = new Set(prev);
            next.delete(video.id);
            return next;
        });

        // 轉換為 contentTextures 能夠接受的格式
        const videoTexture = {
            id: video.id,
            name: video.filename,
            file_path: filePath,
            type: (isImage ? 'image' : 'r2_video') as 'image' | 'r2_video',
            // 帶回時間軸 cue —— 缺這行會讓 VideoTimelineController 讀不到 cue,時間軸功能失效
            timelineCues: video.timelineCues,
        };

        // 像預設的分享頁面邏輯一樣，切換目前的 texture 並讓其成為 active
        setContentTextures([videoTexture]);
        setActiveContent(video.id);
        
        if (!isImage) {
            setVideoPlaying(true);
        }

        // Cue 優先級:時間軸 cues > 後台/檔名指定的單一 cue。
        // 若此影片有時間軸 cues,交由 VideoTimelineController 全權驅動(含機關),
        // 不再 applyCue,避免兩套同時寫 rigValues 打架。
        const hasTimeline = Array.isArray(video.timelineCues) && video.timelineCues.length > 0;
        if (video.cueId && !hasTimeline) {
            // 小延遲確保前面狀態更新後才吃燈光等 cue
            setTimeout(() => applyCue(video.cueId), 100);
        }
    };

    const fetchLatestVideos = useCallback(async (opts?: { manual?: boolean }) => {
        if (!currentFolderId) return;
        if (opts?.manual) setIsSyncing(true);
        try {
            const res = await fetch(`/api/drive/sync?folderId=${currentFolderId}${opts?.manual ? '&t=' + Date.now() : ''}`);
            if (!res.ok) return;
            
            const data = await res.json();
            
            const currentState = useStore.getState();
            const currentGDriveVideos = currentState.gdriveVideos || [];
                const currentCues = currentState.cues || [];
                const currentProjectVideos = currentGDriveVideos.filter((v: any) => v.folderId === currentFolderId);
                
                const newVideos = data.videos.map((vid: any) => {
                    const existing = currentProjectVideos.find((p: any) => p.driveFileId === vid.id);
                    
                    let autoCueId = undefined;
                    if (vid.name) {
                        const lowerFilename = vid.name.toLowerCase();
                        
                        const cueMatch = lowerFilename.match(/cue\s*[-_]?\s*(\d+)/i);
                        if (cueMatch) {
                            const numStr = cueMatch[1];
                            const numInt = parseInt(numStr, 10).toString();
                            
                            const exactCue = currentCues.find((c: any) => {
                                if (!c.name) return false;
                                const n = c.name.toLowerCase().trim();
                                return n === numStr || n === numInt || 
                                       n === `cue${numStr}` || n === `cue${numInt}` ||
                                       n === `cue ${numStr}` || n === `cue ${numInt}`;
                            });
                            if (exactCue) autoCueId = exactCue.id;
                        }

                        if (!autoCueId) {
                            const sortedCues = [...currentCues].filter(c => c.name).sort((a, b) => b.name.length - a.name.length);
                            for (const c of sortedCues) {
                                const cNameLower = c.name.toLowerCase().trim();
                                if (/^\d+$/.test(cNameLower)) {
                                    const regex = new RegExp(`(^|[^\\d])${cNameLower}([^\\d]|$)`, 'i');
                                    if (regex.test(lowerFilename)) {
                                        autoCueId = c.id; break;
                                    }
                                } else {
                                    if (lowerFilename.includes(cNameLower)) {
                                        autoCueId = c.id; break;
                                    }
                                }
                            }
                        }
                    }
                    
                    if (existing) {
                        return {
                            ...existing,
                            cueId: existing.cueId || autoCueId,
                            filename: vid.name,
                            thumbnail_url: vid.thumbnail_url,
                            size: vid.size
                        };
                    }

                    return {
                        id: Math.random().toString(36).substring(2, 9),
                        driveFileId: vid.id,
                        filename: vid.name,
                        thumbnail_url: vid.thumbnail_url,
                        uploadedAt: new Date(vid.createdTime).getTime(),
                        size: vid.size,
                        folderId: currentFolderId,
                        cueId: autoCueId,
                    };
                });

                const otherVideos = currentGDriveVideos.filter((v: any) => v.folderId !== currentFolderId);
                const updatedVideos = [...otherVideos, ...newVideos];
                
                currentState.setGDriveVideos(updatedVideos);

                // Write updated video list back to Firestore so admin backend stays in sync
                ProjectService.updateProject(projectId, { gdriveVideos: updatedVideos }).catch(err =>
                    console.warn('Client sync write-back failed (non-critical):', err)
                );

                // Auto-play the first video if this is initial load
                if (!hasAutoPlayed && newVideos.length > 0) {
                    handleVideoSelect(newVideos[0]);
                    setHasAutoPlayed(true);
                }

            } catch (error) {
                console.error("Client sync failed:", error);
                
                // Fallback: Auto-play the first video from cached global state if sync failed
                if (!hasAutoPlayed && projectVideos.length > 0) {
                    handleVideoSelect(projectVideos[0]);
                    setHasAutoPlayed(true);
                }
            } finally {
                setLastSync(Date.now());
                if (opts?.manual) setIsSyncing(false);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFolderId, hasAutoPlayed, projectId]);

    // 掛載 / 資料夾變更時自動同步一次
    useEffect(() => {
        fetchLatestVideos();
    }, [fetchLatestVideos]);


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
                <div className="p-3 border-b border-green-500/20 bg-gray-900/60 flex items-center justify-between">
                    <h3 className="text-white text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                        GDrive 播放列表
                    </h3>
                    <button
                        onClick={() => fetchLatestVideos({ manual: true })}
                        disabled={isSyncing || !currentFolderId}
                        title={lastSync ? `上次更新:${new Date(lastSync).toLocaleTimeString()}` : '重新整理列表'}
                        className="text-green-300/70 hover:text-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors p-1 -m-1"
                    >
                        <svg
                            className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
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
