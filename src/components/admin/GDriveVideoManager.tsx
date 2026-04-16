'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { resolveGDriveUrl } from '@/lib/gdrive-direct';

export function GDriveVideoManager({ projectId, onSave }: { projectId: string; onSave?: () => void }) {
    const [folderIdInput, setFolderIdInput] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const gdriveFolders = useStore(state => state.gdriveFolders);
    const setGDriveFolder = useStore(state => state.setGDriveFolder);
    const gdriveVideos = useStore(state => state.gdriveVideos);
    const setGDriveVideos = useStore(state => state.setGDriveVideos);
    const cues = useStore((state) => state.cues);
    const contentTextures = useStore((state) => state.contentTextures);
    const addContentTexture = useStore((state) => state.addContentTexture);
    const setActiveContent = useStore((state) => state.setActiveContent);
    const applyCue = useStore((state) => state.applyCue);
    const setVideoPlaying = useStore((state) => state.setVideoPlaying);

    const currentFolderId = gdriveFolders[projectId] || '';

    // Filter videos that belong to this project's current folder ID
    const projectVideos = gdriveVideos.filter(v => v.folderId === currentFolderId);

    const handleSync = async (isAuto = false) => {
        const targetFolderId = folderIdInput.trim() || currentFolderId;
        if (!targetFolderId) return;

        if (!isAuto) setIsSyncing(true);
        try {
            // First, save the folder mapping
            if (!isAuto && folderIdInput.trim()) {
                setGDriveFolder(projectId, targetFolderId);
            }

            // Next, fetch videos exactly in this folder
            const res = await fetch(`/api/drive/sync?folderId=${targetFolderId}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Sync failed');
            }

            const data = await res.json();
            
            // Get the latest state to avoid stale closures in setInterval
            const currentState = useStore.getState();
            const currentGDriveVideos = currentState.gdriveVideos || [];
            const currentCues = currentState.cues || [];
            const currentProjectVideos = currentGDriveVideos.filter(v => v.folderId === currentFolderId);
            
            // Merge videos while keeping ALL cues and settings configured previously
            const newVideos = data.videos.map((vid: any) => {
                const existing = currentProjectVideos.find((p: any) => p.driveFileId === vid.id);
                
                let autoCueId = undefined;
                if (vid.name) {
                    const lowerFilename = vid.name.toLowerCase();
                    
                    // 1. Explicitly match the "cueX" pattern (e.g. cue03, cue3, cue_03)
                    const cueMatch = lowerFilename.match(/cue\s*[-_]?\s*(\d+)/i);
                    if (cueMatch) {
                        const numStr = cueMatch[1]; // e.g. "03"
                        const numInt = parseInt(numStr, 10).toString(); // e.g. "3"
                        
                        const exactCue = currentCues.find((c: any) => {
                            if (!c.name) return false;
                            const n = c.name.toLowerCase().trim();
                            return n === numStr || n === numInt || 
                                   n === `cue${numStr}` || n === `cue${numInt}` ||
                                   n === `cue ${numStr}` || n === `cue ${numInt}`;
                        });
                        
                        if (exactCue) {
                            autoCueId = exactCue.id;
                        }
                    }

                    // 2. Fallback: match by full name, sorting by longest name first to prevent partial matches
                    if (!autoCueId) {
                        const sortedCues = [...currentCues].filter(c => c.name).sort((a, b) => b.name.length - a.name.length);
                        for (const c of sortedCues) {
                            const cNameLower = c.name.toLowerCase().trim();
                            // If cue name is purely numeric, require word boundaries to avoid matching inside dates (like "0" in "0403")
                            if (/^\d+$/.test(cNameLower)) {
                                const regex = new RegExp(`(^|[^\\d])${cNameLower}([^\\d]|$)`, 'i');
                                if (regex.test(lowerFilename)) {
                                    autoCueId = c.id;
                                    break;
                                }
                            } else {
                                if (lowerFilename.includes(cNameLower)) {
                                    autoCueId = c.id;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (existing) {
                    // Retain all existing attributes (like id, cueId, etc.) and just update basic info
                    return {
                        ...existing,
                        cueId: existing.cueId || autoCueId,
                        filename: vid.name,
                        thumbnail_url: vid.thumbnail_url,
                        size: vid.size
                    };
                }

                // Completely new file
                return {
                    id: Math.random().toString(36).substring(2, 9),
                    driveFileId: vid.id,
                    filename: vid.name,
                    thumbnail_url: vid.thumbnail_url,
                    uploadedAt: new Date(vid.createdTime).getTime(),
                    size: vid.size,
                    folderId: targetFolderId,
                    cueId: autoCueId,
                };
            });

            // Update store
            // Replace only the videos belonging to this folder, keep others
            const otherVideos = currentGDriveVideos.filter((v: any) => v.folderId !== targetFolderId);
            currentState.setGDriveVideos([...otherVideos, ...newVideos]);

            if (onSave && !isAuto) onSave();
            if (!isAuto) {
                alert('Google Drive 同步完成！共找到 ' + newVideos.length + ' 個影片。');
            }
        } catch (error: any) {
            console.error('GDrive Sync Error:', error);
            if (!isAuto) {
                alert('同步失敗: ' + error.message);
            }
        } finally {
            if (!isAuto) setIsSyncing(false);
        }
    };

    const updateCueId = (videoId: string, newCueId?: string) => {
        const updated = gdriveVideos.map(v => 
            v.id === videoId ? { ...v, cueId: newCueId } : v
        );
        setGDriveVideos(updated);
        if (onSave) onSave();
    };

    const handleShare = (video: any) => {
        const shareUrl = `${window.location.origin}/share/${projectId}?video=${video.id}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedId(video.id);
        setTimeout(() => setCopiedId(null), 2000);
    };



    const handlePlay = async (video: any) => {
        const ext = video.filename.split('.').pop()?.toLowerCase() || '';
        let resolvedType: 'image' | 'video' | 'gif' = 'video';
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            resolvedType = 'image';
        } else if (ext === 'gif') {
            resolvedType = 'gif';
        }

        // Resolve GDrive URL directly (bypasses Vercel bandwidth)
        let filePath: string;
        try {
            filePath = await resolveGDriveUrl(video.driveFileId);
        } catch {
            filePath = `/api/drive/stream/${video.driveFileId}`;
        }

        const texture = {
            id: video.id,
            name: video.filename,
            file_path: filePath,
            type: resolvedType,
        };

        // Always update the texture with the latest direct URL
        let existing = contentTextures.find(t => t.id === video.id);
        if (existing) {
            // Update existing texture's file_path
            const updated = contentTextures.map(t =>
                t.id === video.id ? { ...t, file_path: filePath } : t
            );
            useStore.getState().setContentTextures(updated);
        } else {
            addContentTexture(texture);
        }

        setActiveContent(video.id);

        // For video types, ensure video starts playing
        if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
            setVideoPlaying(true);
        }

        if (video.cueId) {
            applyCue(video.cueId);
        }
    };

    const handleSharePlaylist = () => {
        const shareUrl = `${window.location.origin}/share/${projectId}?playlist=gdrive`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedId('playlist');
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="p-3 bg-gray-800 rounded-lg text-sm border border-gray-700">
            <h3 className="font-semibold text-white mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                    Google Drive 影片同步
                </div>
                <button
                    onClick={handleSharePlaylist}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    {copiedId === 'playlist' ? '已複製！' : '分享連結'}
                </button>
            </h3>
            
            <p className="text-xs text-gray-400 mb-3">
                放入 Google Drive 的 Folder ID 即可抓取底下的 mp4 影片，並直接在線上串流預覽。
            </p>

            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    placeholder={currentFolderId || "請輸入 Folder ID..."}
                    value={folderIdInput}
                    onChange={(e) => setFolderIdInput(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500"
                />
                <button
                    onClick={() => handleSync(false)}
                    disabled={isSyncing || (!folderIdInput.trim() && !currentFolderId)}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                    {isSyncing ? '同步中...' : '手動同步'}
                </button>
            </div>

            {currentFolderId && (
                <div className="mb-2 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-gray-400">目前綁定資料夾: </span>
                        <span className="text-xs text-violet-300 font-mono">{currentFolderId}</span>
                        <span className="ml-2 text-[10px] text-gray-400">手動同步模式</span>
                    </div>
                    <button
                        onClick={() => handleSync(false)}
                        disabled={isSyncing || (!folderIdInput.trim() && !currentFolderId)}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        title="手動重新同步"
                    >
                        <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin text-violet-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            )}

            {projectVideos.length > 0 && (
                <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {projectVideos.map(vid => {
                        const formatDisplayName = (name: string) => {
                            let formatted = name.replace(/\.[^.]+$/, ''); 
                            formatted = formatted.replace(/[_\-\s]?cue\s*\d+[_\-\s]?/gi, ' ').replace(/\s+/g, ' ').trim(); 
                            return formatted || name.replace(/\.[^.]+$/, ''); 
                        };
                        return (
                        <div key={vid.id} className="bg-gray-900 border border-gray-700 p-2 rounded flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="text-xs text-white break-all pr-2">{formatDisplayName(vid.filename)}</div>
                                <div className="text-[10px] text-gray-500 shrink-0">
                                    {vid.size ? (parseInt(vid.size) / (1024 * 1024)).toFixed(1) + ' MB' : ''}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-2">
                                    {cues.length > 0 && (
                                        <select
                                            value={vid.cueId || ''}
                                            onChange={(e) => {
                                                const newCueId = e.target.value || undefined;
                                                updateCueId(vid.id, newCueId);
                                            }}
                                            className="bg-gray-700/80 border border-gray-600 text-gray-300 text-xs rounded-md px-2 py-1 appearance-none cursor-pointer hover:border-violet-500/50 focus:border-violet-500 focus:outline-none transition-colors max-w-[120px] truncate"
                                            title="分享時套用的 Cue"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '20px' }}
                                        >
                                            <option value="">Cue: 未指定</option>
                                            {cues.map((cue) => (
                                                <option key={cue.id} value={cue.id}>
                                                    Cue: {cue.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => handlePlay(vid)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="播放">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleShare(vid)} className={`p-1.5 rounded-lg transition-colors ${copiedId === vid.id ? 'bg-green-600 text-white' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`} title={copiedId === vid.id ? '已複製!' : '複製分享連結'}>
                                        {copiedId === vid.id ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}
            
            {projectVideos.length === 0 && currentFolderId && !isSyncing && (
                <div className="text-center text-xs text-gray-500 py-4">
                    未找到任何影片，或尚未同步
                </div>
            )}
        </div>
    );
}
