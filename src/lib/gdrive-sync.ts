import { useStore } from '@/store/useStore';

/**
 * Google Drive 資料夾同步(共用邏輯,後台 GDriveVideoManager 與客戶端面板皆可用)。
 * 拉取資料夾影片 → 與現有列表 merge(保留既有 cue 綁定等配置)→ cue 自動匹配
 * (檔名含 cueXX 或 cue 名稱時自動掛載)→ 更新 store。
 * 回傳同步到的影片數。呼叫端自行負責持久化(admin auto-save 或客戶端部分更新)。
 */
export async function syncGDriveFolder(projectId: string, folderId: string): Promise<number> {
    const res = await fetch(`/api/drive/sync?folderId=${folderId}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '同步失敗,請確認資料夾已分享給服務帳號');
    }
    const data = await res.json();

    const currentState = useStore.getState();
    const currentGDriveVideos = currentState.gdriveVideos || [];
    const currentCues = currentState.cues || [];
    const currentProjectVideos = currentGDriveVideos.filter((v: any) => v.folderId === folderId);

    const newVideos = data.videos.map((vid: any) => {
        const existing = currentProjectVideos.find((p: any) => p.driveFileId === vid.id);

        let autoCueId: string | undefined = undefined;
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
                const sortedCues = [...currentCues].filter((c: any) => c.name).sort((a: any, b: any) => b.name.length - a.name.length);
                for (const c of sortedCues) {
                    const cNameLower = c.name.toLowerCase().trim();
                    if (/^\d+$/.test(cNameLower)) {
                        const regex = new RegExp(`(^|[^\\d])${cNameLower}([^\\d]|$)`, 'i');
                        if (regex.test(lowerFilename)) { autoCueId = c.id; break; }
                    } else {
                        if (lowerFilename.includes(cNameLower)) { autoCueId = c.id; break; }
                    }
                }
            }
        }

        if (existing) {
            return { ...existing, cueId: existing.cueId || autoCueId, filename: vid.name, thumbnail_url: vid.thumbnail_url, size: vid.size };
        }
        return {
            id: Math.random().toString(36).substring(2, 9),
            driveFileId: vid.id,
            filename: vid.name,
            thumbnail_url: vid.thumbnail_url,
            uploadedAt: new Date(vid.createdTime).getTime(),
            size: vid.size,
            folderId,
            cueId: autoCueId,
        };
    });

    const otherVideos = currentGDriveVideos.filter((v: any) => v.folderId !== folderId);
    currentState.setGDriveVideos([...otherVideos, ...newVideos]);
    currentState.setGDriveFolder(projectId, folderId);
    return newVideos.length;
}

/** 從整串 Google Drive 資料夾網址解析 folder ID(客戶直接貼整個連結即可) */
export function parseDriveFolderUrl(input: string): string | null {
    const s = input.trim();
    if (!s) return null;
    // https://drive.google.com/drive/folders/{ID} 或 /drive/u/0/folders/{ID}
    const m1 = s.match(/folders\/([a-zA-Z0-9_-]{10,})/);
    if (m1) return m1[1];
    // ...?id={ID}
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m2) return m2[1];
    // 純 ID(直接貼 ID 也接受)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
    return null;
}

/** 需加入為「檢視者」的服務帳號 */
export const GDRIVE_SERVICE_ACCOUNT = 'stagepv-drive@stagepv-5f335.iam.gserviceaccount.com';
