import type { MaterialId } from '@/lib/materials';

/**
 * 向量建模(程序化場館)資料格式
 *
 * 慣例:
 * - 單位公尺,Y 軸向上,y = 0 為場地地面。
 * - 平面座標 Vec2 = [x, z](俯視),與 three.js 世界座標的 x / z 一致。
 * - 所有部件只用「數字」描述,不含任何模型檔 → 零下載、秒開,可用 JSON 版本控管。
 * - material 直接沿用材質庫 MaterialId,與 GLB 物件共用同一套材質/完美渲染邏輯。
 */
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

interface PartBase {
    /** 部件名稱(除錯/量測對照用,例如「1F 左側看台」) */
    name?: string;
    material: MaterialId;
}

/** 方塊:柱子、控台、舞台箱體等 */
export interface BoxPart extends PartBase {
    kind: 'box';
    center: Vec3;        // 方塊中心
    size: Vec3;          // [寬 x, 高 y, 深 z]
    rotY?: number;       // 繞 Y 軸旋轉(弧度)
}

/** 平板:任意多邊形往上擠出(地板、舞台面、樓板、屋頂) */
export interface SlabPart extends PartBase {
    kind: 'slab';
    polygon: Vec2[];     // 俯視輪廓(順/逆時針皆可,不需閉合)
    y: number;           // 底面高度
    thickness: number;   // 厚度(往上)
}

/** 牆:沿折線的等厚牆體 */
export interface WallPart extends PartBase {
    kind: 'wall';
    path: Vec2[];
    closed?: boolean;    // 首尾相連
    y: number;           // 牆底高度
    height: number;
    thickness: number;   // 以折線為中心左右各半
}

/** 階梯看台:沿「最前排前緣」折線,往後一排排升高 */
export interface TiersPart extends PartBase {
    kind: 'tiers';
    path: Vec2[];        // 第一排前緣(可用 arc() 產生弧形看台)
    side?: 1 | -1;       // 看台往折線哪一側延伸:1 = 行進方向左側(預設),-1 = 右側
    y: number;           // 第一排前緣的地面高度
    rows: number;
    rowDepth: number;    // 每排深度(排距)
    riserHeight: number; // 每排升高
    /**
     * 看台底面高度。省略 = 每排只往下延伸一階(懸挑樓座的階梯狀底面)。
     * number = 實心到該高度(例如 0 = 實心落地);[前排, 後排] = 斜向底面(樓座下方的斜天花)。
     */
    baseY?: number | [number, number];
    /** 裁切範圍(俯視凸多邊形):看台只保留在多邊形內的部分,用於讓弧形看台切齊側牆 */
    clip?: Vec2[];
    /** 座椅(InstancedMesh,一次繪製);省略則只有階梯 */
    seats?: {
        material: MaterialId;
        pitch: number;   // 座位間距(左右)
    };
}

export type ProcPart = BoxPart | SlabPart | WallPart | TiersPart;

export interface ProcVenueSpec {
    parts: ProcPart[];
}

export interface ProcVenueDef {
    id: string;          // 用於 model_path = `__proc__:${id}`,一經發布不可改名(已存的專案靠它還原)
    name: string;        // UI 顯示名稱
    description?: string;
    /** 參考來源與量測誤差紀錄(例如「由北流 GLB 量測,誤差 < 0.2m」) */
    reference?: string;
    spec: ProcVenueSpec;
}
