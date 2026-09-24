import type { StageCue } from '@/store/useStore';

/**
 * Google Drive 同步時,依檔名自動對應 cue(後台 GDriveVideoManager、客戶端播放清單、
 * 客戶自助資料夾同步共用)。
 *
 * - 檔名含「cue」:cueXX 編號比對 → 再以 cue 名稱比對(原本的規則)
 * - 檔名不含「cue」:一律使用第一個 cue(見 findFirstCue)
 */

// 視為「第一個 cue」的命名(依優先順序;可帶 cue 前綴,如 cue01、cue_preset)
const FIRST_CUE_NAMES = ['preset', '0', '00', '01'];

const normalizeCueName = (name: string) =>
    name.toLowerCase().trim().replace(/^cue\s*[-_]?\s*/, '');

/** 第一個 cue:優先找命名為 preset / 0 / 00 / 01 的 cue,否則取排序最前面的 cue */
export function findFirstCue(cues: Pick<StageCue, 'id' | 'name' | 'order'>[]) {
    for (const key of FIRST_CUE_NAMES) {
        const hit = cues.find(c => c.name && normalizeCueName(c.name) === key);
        if (hit) return hit;
    }
    return [...cues].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
}

/** 依檔名找對應的 cue id;找不到回傳 undefined */
export function matchCueForFilename(
    filename: string | undefined,
    cues: Pick<StageCue, 'id' | 'name' | 'order'>[],
): string | undefined {
    if (!filename || cues.length === 0) return undefined;
    const lowerFilename = filename.toLowerCase();

    // 檔名沒有「cue」→ 預設使用第一個 cue
    if (!lowerFilename.includes('cue')) return findFirstCue(cues)?.id;

    // 1. Explicitly match the "cueX" pattern (e.g. cue03, cue3, cue_03)
    const cueMatch = lowerFilename.match(/cue\s*[-_]?\s*(\d+)/i);
    if (cueMatch) {
        const num = parseInt(cueMatch[1], 10); // "03" / "3" → 3
        // cue 名稱為純數字(可帶 cue 前綴)時以數值比對:cue3 ↔ 03 ↔ cue_003
        const exactCue = cues.find(c => {
            if (!c.name) return false;
            const n = normalizeCueName(c.name);
            return /^\d+$/.test(n) && parseInt(n, 10) === num;
        });
        if (exactCue) return exactCue.id;
    }

    // 2. Fallback: match by full name, sorting by longest name first to prevent partial matches
    const sortedCues = [...cues].filter(c => c.name).sort((a, b) => b.name.length - a.name.length);
    for (const c of sortedCues) {
        const cNameLower = c.name.toLowerCase().trim();
        // If cue name is purely numeric, require word boundaries to avoid matching inside dates (like "0" in "0403")
        if (/^\d+$/.test(cNameLower)) {
            const regex = new RegExp(`(^|[^\\d])${cNameLower}([^\\d]|$)`, 'i');
            if (regex.test(lowerFilename)) return c.id;
        } else if (lowerFilename.includes(cNameLower)) {
            return c.id;
        }
    }
    return undefined;
}
