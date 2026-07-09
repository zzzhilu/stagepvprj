'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

/**
 * 影片檔名自動切換 UV 排列(與 cue 檔名自動匹配同一心智模型)。
 * 播放內容切換時,以檔名匹配排列名稱:
 * - 檔名含 `_排列名_`、以 `_排列名` 結尾、以 `排列名_` 開頭(去副檔名、不分大小寫)→ 自動套用該排列
 * - 都沒命中 → 強制預設 UV(模型原始 UV),客戶不需手動切換
 * 長名稱優先匹配,避免 P1 誤中 P10。手動切換仍可覆蓋(直到播放下一支)。
 */
function matchLayoutByFilename(filename: string, layouts: { id: string; name: string }[]): string | null {
    const base = filename.toLowerCase().replace(/\.[^.]+$/, '');
    const sorted = [...layouts].filter(l => l.name?.trim()).sort((a, b) => b.name.length - a.name.length);
    for (const l of sorted) {
        const n = l.name.toLowerCase().trim();
        if (base === n || base.includes(`_${n}_`) || base.endsWith(`_${n}`) || base.startsWith(`${n}_`)) {
            return l.id;
        }
    }
    return null;
}

export function LayoutAutoSwitcher() {
    const activeContentId = useStore((s) => s.activeContentId);
    const setClientLayoutOverride = useStore((s) => s.setClientLayoutOverride);

    useEffect(() => {
        if (!activeContentId) return;
        // getState 讀取,觸發時機僅由「播放內容切換」控制
        const st = useStore.getState();
        if (st.ledLayouts.length === 0) return; // 專案沒有排列 → 不干預
        const tex = st.contentTextures.find((t) => t.id === activeContentId);
        if (!tex?.name) return;
        const matched = matchLayoutByFilename(tex.name, st.ledLayouts);
        // 命中 → 套該排列;未命中 → 強制預設 UV(null)
        setClientLayoutOverride(matched ?? null);
    }, [activeContentId, setClientLayoutOverride]);

    return null;
}
