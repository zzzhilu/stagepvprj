'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { globalVideoElement } from '@/components/canvas/VideoManager';
import { playGDriveVideo } from '@/lib/client-playback';
import {
    getClientId, startLive, endLive, publishState, subscribeLive,
    viewerHeartbeat, viewerLeave, countViewers, inferPosition, type LiveState,
} from '@/lib/live-session';

/**
 * 觀看者模式(直播同步)。同步「狀態」而非畫面:cue、影片、播放位置。
 * - 操作端:編輯閘門解鎖後可開播;開播時收起編輯 UI,只留直播膠囊。
 * - 觀看端:偵測到直播 → 頂部橫幅邀請跟隨(opt-in);跟隨中本地操作 → 自動暫離,可一鍵恢復。
 * - 相機永遠不同步:自由遊覽正是這個功能的意義。
 * - 僅同步 GDrive 素材(本機影片只存在於操作端瀏覽器,無從分發)。
 */
// 簡約 stroke 圖標(lucide 風格)
const IconBroadcast = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        <path d="M7.8 16.2a6 6 0 010-8.4M16.2 7.8a6 6 0 010 8.4M4.9 19.1a10 10 0 010-14.2M19.1 4.9a10 10 0 010 14.2" />
    </svg>
);
const IconEye = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const IconPause = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M9 5v14M15 5v14" />
    </svg>
);
const LiveDot = () => <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />;

export function LiveSync({ projectId }: { projectId: string }) {
    const liveRole = useStore((s) => s.liveRole);
    const setLiveRole = useStore((s) => s.setLiveRole);
    const clientEditMode = useStore((s) => s.clientEditMode);
    const activeContentId = useStore((s) => s.activeContentId);
    const videoPlaying = useStore((s) => s.videoPlaying);

    const [session, setSession] = useState<LiveState | null>(null);
    const clientId = useRef(getClientId());
    /** follower 正在套用遠端狀態(此期間的 store 變化不視為「本地操作」) */
    const applying = useRef(false);
    /** 已套用的遠端狀態指紋(避免重複套用) */
    const appliedKey = useRef('');

    // ---- 訂閱 session(所有角色都聽,操作端也要看觀看人數) ----
    useEffect(() => {
        const unsub = subscribeLive(projectId, setSession);
        return unsub;
    }, [projectId]);

    // ---- 觀看者心跳 ----
    useEffect(() => {
        if (liveRole !== 'following' && liveRole !== 'pausedFollow') return;
        viewerHeartbeat(projectId, clientId.current);
        const t = setInterval(() => viewerHeartbeat(projectId, clientId.current), 30_000);
        return () => { clearInterval(t); viewerLeave(projectId, clientId.current); };
    }, [liveRole, projectId]);

    // ---- 操作端:發布狀態(訂閱 store 變化) ----
    useEffect(() => {
        if (liveRole !== 'broadcasting') return;
        const st = useStore.getState();
        const gv = st.gdriveVideos.find((v) => v.id === activeContentId);
        const v = globalVideoElement;
        publishState(projectId, {
            videoId: gv ? gv.id : null, // 非 GDrive 內容(本機影片)→ null,觀看端顯示提示
            playing: videoPlaying,
            offset: v ? v.currentTime : 0,
            markStart: true,
        }).catch(() => {});
    }, [liveRole, projectId, activeContentId, videoPlaying]);

    // 操作端:cue 變化發布
    const activeCueIdRT = useStore((s) => s.activeCueId);
    useEffect(() => {
        if (liveRole !== 'broadcasting') return;
        publishState(projectId, { cueId: activeCueIdRT }).catch(() => {});
    }, [liveRole, projectId, activeCueIdRT]);

    // 操作端:seek 發布(video seeked 事件)
    useEffect(() => {
        if (liveRole !== 'broadcasting') return;
        const v = globalVideoElement;
        if (!v) return;
        const onSeeked = () => publishState(projectId, { offset: v.currentTime, markStart: true }).catch(() => {});
        v.addEventListener('seeked', onSeeked);
        return () => v.removeEventListener('seeked', onSeeked);
    }, [liveRole, projectId, activeContentId]);

    // ---- 觀看端:套用遠端狀態 ----
    useEffect(() => {
        if (liveRole !== 'following' || !session?.live) return;
        const key = `${session.videoId}|${session.cueId}|${session.playing}|${session.startedAt?.toMillis?.() ?? 0}`;
        if (key === appliedKey.current) return;
        appliedKey.current = key;

        (async () => {
            applying.current = true;
            try {
                const st = useStore.getState();
                // 影片
                if (session.videoId && session.videoId !== st.activeContentId) {
                    const gv = st.gdriveVideos.find((v) => v.id === session.videoId);
                    if (gv?.driveFileId) await playGDriveVideo(gv as never, { autoPlay: false });
                }
                // cue(無時間軸的情況;有時間軸交給進度同步後的 controller)
                if (session.cueId) {
                    useStore.getState().applyCue(session.cueId);
                }
                // 進度與播放狀態
                const v = globalVideoElement;
                if (v && session.videoId) {
                    const target = inferPosition(session);
                    if (Math.abs(v.currentTime - target) > 1.5) v.currentTime = target;
                    useStore.getState().setVideoPlaying(session.playing);
                }
            } finally {
                // 延遲釋放:store 更新是同步的,但套用引發的後續變化在下一輪
                setTimeout(() => { applying.current = false; }, 300);
            }
        })();
    }, [liveRole, session]);

    // ---- 觀看端:本地操作 → 自動暫離跟隨 ----
    const prevContent = useRef(activeContentId);
    useEffect(() => {
        if (liveRole === 'following' && !applying.current && prevContent.current !== activeContentId) {
            setLiveRole('pausedFollow');
        }
        prevContent.current = activeContentId;
    }, [activeContentId, liveRole, setLiveRole]);

    // ---- 操作端刷新頁面後恢復(session 仍 live 且 broadcaster 是自己 → 恢復膠囊,否則無人能結束直播) ----
    useEffect(() => {
        if (liveRole === 'off' && session?.live && session.broadcasterId === clientId.current) {
            setLiveRole('broadcasting');
        }
    }, [session, liveRole, setLiveRole]);

    // ---- 直播結束:跟隨者自動退出 ----
    useEffect(() => {
        if ((liveRole === 'following' || liveRole === 'pausedFollow') && session && !session.live) {
            setLiveRole('off');
        }
    }, [session, liveRole, setLiveRole]);

    // ================= UI =================
    const isBroadcaster = session?.broadcasterId === clientId.current;
    const viewerCount = countViewers(session);

    // 操作端膠囊
    if (liveRole === 'broadcasting') {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 bg-red-950/85 backdrop-blur border border-red-500/40 rounded-full px-4 py-2">
                <span className="flex items-center gap-2 text-red-200 text-sm font-semibold">
                    <LiveDot />
                    <IconBroadcast className="w-4 h-4 text-red-400" />
                    直播中
                    <span className="flex items-center gap-1 text-red-300/90 font-normal">
                        <IconEye className="w-3.5 h-3.5" />{viewerCount}
                    </span>
                </span>
                <button
                    onClick={async () => { await endLive(projectId); setLiveRole('off'); }}
                    className="text-xs px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white"
                >結束直播</button>
            </div>
        );
    }

    // 觀看端:跟隨中膠囊
    if (liveRole === 'following') {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 bg-gray-900/85 backdrop-blur border border-red-500/30 rounded-full px-4 py-2">
                <span className="flex items-center gap-2 text-gray-200 text-sm">
                    <LiveDot />
                    <IconBroadcast className="w-4 h-4 text-red-400" />
                    跟隨直播中 · 視角可自由移動
                </span>
                <button onClick={() => setLiveRole('off')} className="text-xs px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200">離開</button>
            </div>
        );
    }

    // 觀看端:暫離膠囊
    if (liveRole === 'pausedFollow') {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 bg-amber-950/85 backdrop-blur border border-amber-500/40 rounded-full px-4 py-2">
                <span className="flex items-center gap-2 text-amber-200 text-sm">
                    <IconPause className="w-4 h-4 text-amber-400" />
                    已暫停跟隨(本地操作中)
                </span>
                <button
                    onClick={() => { appliedKey.current = ''; setLiveRole('following'); }}
                    className="text-xs px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-white"
                >恢復同步</button>
                <button onClick={() => setLiveRole('off')} className="text-xs px-2 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300">離開</button>
            </div>
        );
    }

    // 未跟隨:有直播進行中且非操作端本人 → 邀請橫幅
    if (session?.live && !isBroadcaster && !clientEditMode) {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 bg-gray-900/90 backdrop-blur border border-red-500/40 rounded-full px-5 py-2.5 shadow-xl">
                <span className="flex items-center gap-2 text-white text-sm font-semibold">
                    <LiveDot />
                    <IconBroadcast className="w-4 h-4 text-red-400" />
                    直播中
                </span>
                <button
                    onClick={() => { appliedKey.current = ''; setLiveRole('following'); }}
                    className="text-xs px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold"
                >跟隨觀看</button>
            </div>
        );
    }

    return null;
}
