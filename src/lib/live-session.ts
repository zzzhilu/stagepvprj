import { db } from './firebase';
import { doc, setDoc, updateDoc, onSnapshot, serverTimestamp, deleteField, Timestamp } from 'firebase/firestore';

/**
 * 觀看者模式(直播)同步層。
 *
 * 原理:同步「狀態」而非畫面 —— 每台裝置各自載入場景與影片(GDrive),
 * 這裡只傳遞 cue / 影片 / 播放位置(每次操作幾十 bytes),非視訊串流。
 * 進度以「起播的伺服器時間戳 + 起播偏移」推算,中途加入者自動對齊。
 */

export interface LiveState {
    live: boolean;
    broadcasterId: string;
    cueId: string | null;
    videoId: string | null;       // gdriveVideos 的穩定 id(絕不用本機 blob URL)
    playing: boolean;
    /** 起播時的伺服器時間戳;推算目前進度 = offset + (now - startedAt) */
    startedAt: Timestamp | null;
    /** 起播時影片的 currentTime(秒) */
    offset: number;
    updatedAt?: Timestamp;
    /** 觀看者心跳:clientId → 最後報到時間(60 秒內視為在線) */
    viewers?: Record<string, Timestamp>;
}

const sessionRef = (projectId: string) => doc(db, 'live_sessions', projectId);

/** 裝置隨機 id(分辨自己是否為 broadcaster;存 sessionStorage 供刷新後延續) */
export function getClientId(): string {
    const KEY = 'stagepv_live_client_id';
    try {
        let id = sessionStorage.getItem(KEY);
        if (!id) {
            id = Math.random().toString(36).slice(2, 10);
            sessionStorage.setItem(KEY, id);
        }
        return id;
    } catch {
        return Math.random().toString(36).slice(2, 10);
    }
}

export async function startLive(projectId: string, broadcasterId: string) {
    await setDoc(sessionRef(projectId), {
        live: true,
        broadcasterId,
        cueId: null,
        videoId: null,
        playing: false,
        startedAt: null,
        offset: 0,
        updatedAt: serverTimestamp(),
        viewers: {},
    });
}

export async function endLive(projectId: string) {
    try {
        await updateDoc(sessionRef(projectId), { live: false, updatedAt: serverTimestamp() });
    } catch { /* session doc 不存在時忽略 */ }
}

/** 操作端發布狀態(每次切 cue / 播放 / 暫停 / seek 呼叫一次) */
export async function publishState(
    projectId: string,
    partial: Partial<Pick<LiveState, 'cueId' | 'videoId' | 'playing' | 'offset'>> & { markStart?: boolean }
) {
    const { markStart, ...rest } = partial;
    await updateDoc(sessionRef(projectId), {
        ...rest,
        ...(markStart ? { startedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
    });
}

/** 觀看端訂閱(回傳取消函數) */
export function subscribeLive(projectId: string, cb: (s: LiveState | null) => void): () => void {
    return onSnapshot(sessionRef(projectId), (snap) => {
        cb(snap.exists() ? (snap.data() as LiveState) : null);
    }, () => cb(null));
}

/** 觀看者心跳(每 30 秒;離開時清除) */
export async function viewerHeartbeat(projectId: string, clientId: string) {
    try {
        await updateDoc(sessionRef(projectId), { [`viewers.${clientId}`]: serverTimestamp() });
    } catch { /* session 未建立時忽略 */ }
}

export async function viewerLeave(projectId: string, clientId: string) {
    try {
        await updateDoc(sessionRef(projectId), { [`viewers.${clientId}`]: deleteField() });
    } catch { /* ignore */ }
}

/** 60 秒內有心跳的觀看者數 */
export function countViewers(s: LiveState | null): number {
    if (!s?.viewers) return 0;
    const now = Date.now();
    return Object.values(s.viewers).filter((t) => {
        const ms = (t as Timestamp)?.toMillis?.() ?? 0;
        return now - ms < 60_000;
    }).length;
}

/** 由 startedAt + offset 推算目前應在的播放位置(秒) */
export function inferPosition(s: LiveState): number {
    if (!s.playing || !s.startedAt) return s.offset;
    const elapsed = (Date.now() - s.startedAt.toMillis()) / 1000;
    return s.offset + Math.max(0, elapsed);
}
