'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { sha256Hex } from '@/lib/client-auth';

/**
 * 主後台:設定/更改「客戶編輯密碼」。
 * 僅儲存 SHA-256 雜湊進專案(隨專案同步),程式碼與資料庫皆無明文。
 */
export function ClientEditPassword() {
    const clientEditPasswordHash = useStore((s) => s.clientEditPasswordHash);
    const setClientEditPasswordHash = useStore((s) => s.setClientEditPasswordHash);
    const [pw, setPw] = useState('');
    const [done, setDone] = useState(false);

    const handleSet = async () => {
        if (!pw.trim()) return;
        setClientEditPasswordHash(await sha256Hex(pw.trim()));
        setPw(''); setDone(true);
        setTimeout(() => setDone(false), 2000);
    };

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-3 space-y-2 mb-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">🔒 客戶編輯密碼</span>
                <span className={`text-[10px] ${clientEditPasswordHash ? 'text-green-400' : 'text-gray-500'}`}>
                    {clientEditPasswordHash ? '已設定' : '未設定(客戶端不顯示編輯入口)'}
                </span>
            </div>
            <p className="text-[10px] text-gray-500">
                客戶端輸入此密碼可進入簡易編輯(改 cue 機關值/名稱、新增 cue、新增/命名視角)。僅儲存雜湊,無明文。
            </p>
            <div className="flex items-center gap-1.5">
                <input
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSet(); }}
                    placeholder={clientEditPasswordHash ? '輸入新密碼以更改' : '設定密碼'}
                    className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none"
                />
                <button onClick={handleSet} disabled={!pw.trim()}
                    className="text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded px-2.5 py-1">
                    {done ? '✓' : '設定'}
                </button>
                {clientEditPasswordHash && (
                    <button onClick={() => { if (confirm('移除客戶編輯密碼?客戶端將無法進入編輯。')) setClientEditPasswordHash(null); }}
                        className="text-[10px] text-gray-500 hover:text-red-400 flex-shrink-0">移除</button>
                )}
            </div>
        </div>
    );
}
