import type { StageObject, ModelType } from '@/store/useStore';

/** 模型類型中文標籤(全專案共用) */
export const TYPE_LABELS: Record<ModelType, string> = {
    'venues': '場館',
    'stage': '舞台',
    'static_LED': '靜態LED',
    'moving_LED': '移動LED',
    'moving_prop': '移動道具',
    'basic_camera': '攝影機',
    'floor_plan': '平面圖',
    'prop': '道具',
    'band': '樂團成員'
};

/** 去掉上傳時加的時間戳前綴(models/1734xxxxx_name.glb → name.glb) */
function stripUploadTimestamp(fileName: string): string {
    return fileName.replace(/^\d{10,}_/, '');
}

function fileNameFromUrl(url: string): string {
    try {
        const decoded = decodeURIComponent(url);
        const basename = decoded.split('/').pop()?.split('?')[0] || '';
        return basename.replace('models/', '');
    } catch {
        return '';
    }
}

/**
 * 取得物件的人類可讀名稱(統一入口)。
 * 優先序:
 * 1. obj.name(上傳時記錄的 3D 軟體命名,或使用者後來改的名字)
 * 2. obj.id 非 obj_ 前綴 → id 即 mesh 名稱(可動物件的既有慣例)
 * 3. meshNames 單一 mesh → 直接用 mesh 名
 * 4. 從 model_path 取檔名並去掉時間戳與副檔名
 * 5. 空字串(由呼叫端 fallback 到類型標籤)
 */
export function getObjectDisplayName(obj: Pick<StageObject, 'id' | 'name' | 'meshNames' | 'model_path'>): string {
    if (obj.name && obj.name.trim()) return obj.name.trim();
    if (obj.id && !obj.id.startsWith('obj_')) return obj.id;
    if (obj.meshNames && obj.meshNames.length === 1) return obj.meshNames[0];
    if (obj.model_path && !obj.model_path.startsWith('__')) {
        const f = fileNameFromUrl(obj.model_path);
        if (f) return stripUploadTimestamp(f).replace(/\.glb$/i, '');
    }
    return '';
}

/** 類型標籤 + 顯示名稱的完整標籤(如「移動LED · 前屏」) */
export function getObjectLabel(obj: Pick<StageObject, 'id' | 'name' | 'meshNames' | 'model_path' | 'type'>): string {
    const typeLabel = TYPE_LABELS[obj.type] || obj.type;
    const name = getObjectDisplayName(obj);
    if (!name || name === typeLabel) return typeLabel;
    return `${typeLabel} · ${name}`;
}
