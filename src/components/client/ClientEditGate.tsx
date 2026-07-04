'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { sha256Hex } from '@/lib/client-auth';
import { ProjectService } from '@/lib/project-service';

/**
 * 客戶簡易後台入口(share 頁右上角小齒輪)。
 * 點擊 → 輸入密碼(SHA-256 比對專案雜湊,無明文)→ 啟動編輯模式。
 * 編輯模式:cue 可改名/新增/更新機關值、視角可新增/改名;「儲存」僅部分更新
 * 允許的欄位(cues/views),絕不全量覆蓋專案。驗證狀態記於 sessionStorage。
 */
export function ClientEditGate({ projectId }: { projectId: string }) {
    const clientEditPasswordHash = useStore((s) => s.clientEditPasswordHash);
    const clientEditMode = useStore((s) => s.clientEditMode);
    const setClientEditMode = useStore((s) => s.setClientEditMode);
    const cues = useStore((s) => s.cues);
    const views = useStore((s) => s.views);

    const [showModal, setShowModal] = useState(false);
    const [pw, setPw] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    const sessionKey = `stagepv_client_edit_${projectId}`;

    // session 內已驗證過則自動恢復編輯模式
    useEffect(() => {
        if (!clientEditPasswordHash) return;
        try {
            if (sessionStorage.getItem(sessionKey) === clientEditPasswordHash) {
                setClientEditMode(true);
            }
        } catch {}
    }, [clientEditPasswordHash, sessionKey, setClientEditMode]);

    // 未設定密碼 → 不顯示入口
    if (!clientEditPasswordHash) return null;

    const handleVerify = async () => {
        const hash = await sha256Hex(pw);
        if (hash === clientEditPasswordHash) {
            setClientEditMode(true);
            try { sessionStorage.setItem(sessionKey, hash); } catch {}
            setShowModal(false); setPw(''); setError('');
        } else {
            setError('密碼錯誤');
        }
    };

    const handleExit = () => {
        setClientEditMode(false);
        try { sessionStorage.removeItem(sessionKey); } catch {}
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 僅部分更新允許欄位,不覆蓋專案其他資料
            await ProjectService.updateProject(projectId, { cues, views } as any);
            setSavedAt(new Date().toLocaleTimeString());
        } catch (e) {
            alert('儲存失敗,請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* 右上角齒輪(小) */}
            <div className="absolute top-4 right-4 z-40 pointer-events-auto flex items-center gap-2" data-ui-element>
                {clientEditMode && (
                    <>
                        <span className="text-[10px] text-amber-300 bg-black/60 backdrop-blur px-2 py-1 rounded-full border border-amber-400/30">
                            ✏️ 編輯模式{savedAt ? ` · 已儲存 ${savedAt}` : ''}
                        </span>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="text-[11px] bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-3 py-1.5 rounded-full"
                        >{saving ? '儲存中…' : '儲存'}</button>
                    </>
                )}
                <button
                    onClick={() => clientEditMode ? handleExit() : setShowModal(true)}
                    title={clientEditMode ? '退出編輯模式' : '客戶編輯(需密碼)'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${clientEditMode ? 'bg-amber-500/80 text-black' : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/70'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
            </div>

            {/* 密碼 modal */}
            {showModal && (
                <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-72" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-bold text-white mb-3">🔒 客戶編輯模式</h3>
                        <input
                            type="password"
                            autoFocus
                            value={pw}
                            onChange={(e) => { setPw(e.target.value); setError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                            placeholder="輸入編輯密碼"
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                        />
                        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600">取消</button>
                            <button onClick={handleVerify} disabled={!pw} className="flex-1 py-1.5 rounded text-xs bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold">進入</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
