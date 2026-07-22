import { useStore } from '@/store/useStore';
import { resolveGDriveUrl } from './gdrive-direct';

/**
 * 播放一支 GDrive 影片(客戶端共用路徑)。
 * 抽自 ClientPlaylistSidebar 的 handleVideoSelect —— 播放列表點選與
 * 直播跟隨(LiveSync)共用同一函數,避免兩份邏輯漂移。
 */
export async function playGDriveVideo(video: {
    id: string;
    filename: string;
    driveFileId: string;
    cueId?: string;
    timelineCues?: unknown[];
}, opts?: { autoPlay?: boolean }) {
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(video.filename);

    let filePath: string;
    try {
        filePath = await resolveGDriveUrl(video.driveFileId);
    } catch {
        filePath = `/api/drive/stream/${video.driveFileId}`;
    }

    const st = useStore.getState();
    st.setContentTextures([{
        id: video.id,
        name: video.filename,
        file_path: filePath,
        type: (isImage ? 'image' : 'r2_video') as 'image' | 'r2_video',
        // 缺這行會讓 VideoTimelineController 讀不到 cue,時間軸功能失效
        timelineCues: video.timelineCues,
    } as never]);
    st.setActiveContent(video.id);
    if (!isImage && opts?.autoPlay !== false) st.setVideoPlaying(true);

    // Cue 優先級:時間軸 cues > 單一 cue(有時間軸則交給 VideoTimelineController,避免打架)
    const hasTimeline = Array.isArray(video.timelineCues) && video.timelineCues.length > 0;
    if (video.cueId && !hasTimeline) {
        setTimeout(() => useStore.getState().applyCue(video.cueId!), 100);
    }
    return { isImage };
}
