'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { ProjectService } from '@/lib/project-service';
import { syncGDriveFolder, parseDriveFolderUrl, GDRIVE_SERVICE_ACCOUNT } from '@/lib/gdrive-sync';

/**
 * 影像進度頁 · 客戶編輯模式:客戶自行貼上 Google Drive 資料夾連結,
 * 自動解析 folder ID → 同步影片列表(含 cue 自動匹配)→ 部分更新儲存。
 * 面板內提醒需將服務帳號加入為「檢視者」。
 */
export function ClientGDrivePanel({ projectId }: { projectId: string }) {
    const clientEditMode = useStore((s) => s.clientEditMode);
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);

    const [open, setOpen] = useState(false);

    if (!clientEditMode) return null;

    const folderId = parseDriveFolderUrl(url);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(GDRIVE_SERVICE_ACCOUNT);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    };

    const handleSync = async () => {
        if (!folderId) return;
        setStatus('syncing'); setMessage('');
        try {
            const count = await syncGDriveFolder(projectId, folderId);
            // 部分更新儲存(僅 gdriveVideos + gdriveFolders,不覆蓋專案其他資料)
            const st = useStore.getState();
            await ProjectService.updateProject(projectId, {
                gdriveVideos: st.gdriveVideos,
                gdriveFolders: st.gdriveFolders,
            } as any);
            setStatus('done');
            setMessage(`同步完成!共 ${count} 個影片,已儲存。`);
        } catch (e: any) {
            setStatus('error');
            setMessage(e?.message || '同步失敗,請確認資料夾已分享給下方服務帳號');
        }
    };

    return (
        <>
            {/* 觸發按鈕:右上編輯區下方,雲朵圖示 */}
            <button
                onClick={() => setOpen(true)}
                data-ui-element
                className="fixed top-16 right-4 z-[95] pointer-events-auto flex items-center gap-1.5 bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg"
                title="連結我的雲端資料夾"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                連結雲端
            </button>

            {!open ? null : (
            <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4 pointer-events-auto" data-ui-element onClick={() => setOpen(false)}>
            <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl p-4 w-80 shadow-xl space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>📁 連結我的雲端資料夾</span>
                    <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
                </div>

                {/* 提醒:加入服務帳號為檢視者 */}
                <div className="bg-amber-500/10 border border-amber-400/25 rounded-lg p-2.5 space-y-1.5">
                    <p className="text-[10px] text-amber-200/90 leading-relaxed">
                        請先在 Google Drive 將資料夾<b>「共用」給以下帳號(檢視者)</b>,否則無法讀取:
                    </p>
                    <button
                        onClick={handleCopy}
                        className="w-full text-left text-[10px] font-mono text-amber-300 bg-black/40 rounded px-2 py-1.5 hover:bg-black/60 break-all"
                        title="點擊複製"
                    >
                        {GDRIVE_SERVICE_ACCOUNT}
                        <span className="ml-1 text-amber-400/70">{copied ? '✓ 已複製' : '(點擊複製)'}</span>
                    </button>
                </div>

                {/* URL 輸入:整串連結直接貼 */}
                <div className="space-y-1">
                    <input
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setStatus('idle'); setMessage(''); }}
                        placeholder="貼上整個資料夾連結即可"
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                    {url && (
                        <p className={`text-[10px] ${folderId ? 'text-cyan-300' : 'text-red-400'}`}>
                            {folderId ? `✓ 已識別資料夾 ID:${folderId.slice(0, 18)}…` : '✗ 無法識別,請貼資料夾連結(網址含 /folders/)'}
                        </p>
                    )}
                </div>

                <button
                    onClick={handleSync}
                    disabled={!folderId || status === 'syncing'}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-colors"
                >
                    {status === 'syncing' ? '同步中…' : '同步並更新影片列表'}
                </button>

                {message && (
                    <p className={`text-[10px] ${status === 'done' ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
                )}
            </div>
            </div>
            )}
        </>
    );
}
