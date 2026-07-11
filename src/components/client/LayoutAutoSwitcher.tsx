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
    // token 化:底線/空白/連字號切開(「S06_老歌_inputAll_0707」→ [s06, 老歌, inputall, 0707])
    const tokens = base.split(/[_\s\-]+/).filter(Boolean);
    const sorted = [...layouts].filter(l => l.name?.trim()).sort((a, b) => b.name.length - a.name.length);

    // 第一輪:token 完全等於排列名(最精確,長名優先)
    for (const l of sorted) {
        const n = l.name.toLowerCase().trim();
        if (tokens.includes(n)) return l.id;
    }
    // 第二輪:token「包含」排列名(寬容:inputall → all、ledP1 → p1)。
    // 防呆:排列名以數字結尾時,其在 token 中的下一字元不可是數字(p10 不誤中 p1)。
    for (const l of sorted) {
        const n = l.name.toLowerCase().trim();
        const endsWithDigit = /\d$/.test(n);
        for (const t of tokens) {
            const idx = t.indexOf(n);
            if (idx === -1) continue;
            if (endsWithDigit && /\d/.test(t[idx + n.length] ?? '')) continue;
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

        // 優先級 1:後台手動指定(覆蓋檔名偵測,用於修正客戶命名錯誤)
        const gv = st.gdriveVideos.find((v: any) => v.id === activeContentId);
        if (gv?.layoutId) {
            setClientLayoutOverride(gv.layoutId === '__default__' ? null : gv.layoutId);
            return;
        }

        // 優先級 2:檔名自動偵測
        const tex = st.contentTextures.find((t) => t.id === activeContentId);
        if (!tex?.name) return;
        const matched = matchLayoutByFilename(tex.name, st.ledLayouts);
        if (matched) {
            setClientLayoutOverride(matched);
            return;
        }
        // 優先級 3(檔名未命中):名為 all 的排列 → 否則跟隨後台設定。
        // 絕不強制切到「無排列」— 那會讓客戶第一眼以為介面壞掉。
        const allLayout = st.ledLayouts.find((l) => l.name?.trim().toLowerCase() === 'all');
        setClientLayoutOverride(allLayout ? allLayout.id : undefined);
    }, [activeContentId, setClientLayoutOverride]);

    return null;
}
