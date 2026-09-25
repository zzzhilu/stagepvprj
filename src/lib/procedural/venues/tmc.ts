import type { ProcVenueDef, Vec2 } from '../types';
import { arc, rect } from '../build';
import { TMC_WALL_LEFT, TMC_WALL_RIGHT } from './tmc-walls';

/**
 * 臺北流行音樂中心(北流)表演廳 — 向量建模版
 *
 * 座標:公尺,y = 0 為觀眾廳平地;舞台在 -z,觀眾席往 +z。
 * 與原 GLB 在 StagePV 場景中的位置一致(已套用 GLB 的 Z 反轉慣例)。
 * 所有數值由 scripts/measure-glb.mjs 與剖面切片從原模型量出,見 reference。
 */

const mirror = (pts: Vec2[]): Vec2[] => pts.map(([x, z]) => [-x, z] as Vec2).reverse();

// 觀眾廳側牆:雕塑折面見 tmc-walls.ts;折面平均線 x ≈ -20.7 − 0.55z(用於裁切範圍與背板定位)
// 折面牆後方的背板(平均線往外 3.2m):補住折面之間的細縫,本身被折面擋住看不到
const SIDE_LEFT_BACK: Vec2[] = [[-20.3, -7.6], [-27.6, 5.7], [-34.9, 19], [-32.1, 20.5]];
const SIDE_RIGHT_BACK: Vec2[] = mirror(SIDE_LEFT_BACK);

// 一樓後牆(看台後緣)
const REAR_LOWER: Vec2[] = [[-32.1, 20.5], [-19, 36.6], [-10, 37.9], [0, 38.2], [10, 37.9], [19, 36.6], [32.1, 20.5]];
// 二樓後牆(樓座後緣,比一樓更往外)
const REAR_UPPER: Vec2[] = [[-32.1, 20.5], [-26, 32.5], [-17.5, 40], [0, 42.3], [17.5, 40], [26, 32.5], [32.1, 20.5]];

// 觀眾廳外輪廓(凸多邊形,側牆 + 二樓後牆內緣)與天花中央開口邊緣(由 y=20.3 切片量得)
const ROOM_OUTLINE: Vec2[] = [[-17.4, -6.1], [-31.9, 20.5], [-25.8, 32.3], [-17.4, 39.8], [0, 42.1], [17.4, 39.8], [25.8, 32.3], [31.9, 20.5], [17.4, -6.1]];
const CEILING_OPENING_LEFT: Vec2[] = [[-15.2, -6.1], [-15.6, -2], [-16.9, 10], [-18.1, 24.8], [-17.5, 27.6], [-13.5, 33], [-10, 37.3], [-6, 39.2]];
const CEILING_OPENING: Vec2[] = [...CEILING_OPENING_LEFT, [0, 39.5], ...mirror(CEILING_OPENING_LEFT)];

// 看台裁切範圍(凸多邊形,切齊側牆與後牆內緣)
const CLIP_LOWER: Vec2[] = [[-25, 8], [-31.9, 20.5], [-18.8, 36.4], [-10, 37.7], [0, 38.0], [10, 37.7], [18.8, 36.4], [31.9, 20.5], [25, 8]];
const CLIP_UPPER: Vec2[] = [[-26.7, 11], [-31.9, 20.5], [-25.8, 32.3], [-17.4, 39.8], [0, 42.1], [17.4, 39.8], [25.8, 32.3], [31.9, 20.5], [26.7, 11]];

// 一樓看台:同心圓弧,圓心 (0, -46.8),第一排前緣半徑 67.8(x=0 時 z=21.0)
const LOWER_C: Vec2 = [0, -46.8];
const LOWER_R = 67.8;
const LOWER_ROWS = 15;
const LOWER_ROW_DEPTH = 0.95;

// 二樓樓座:同心圓弧,圓心 (0, -17.2),前緣半徑 41.2(x=0 時 z=24.0)
const UPPER_C: Vec2 = [0, -17.2];
const UPPER_R = 41.2;

const HALF = Math.PI / 2;

export const TMC_VENUE: ProcVenueDef = {
    id: 'tmc',
    name: '北流 表演廳',
    description: '臺北流行音樂中心表演廳:平地觀眾區 + 一樓後方看台 15 排 + 二樓樓座 19 排,舞台面高 1.25m',
    reference:
        '由北流 GLB(單一 mesh,28,686 三角形,65.5×22.1×88.9m)量測:' +
        '舞台後幕牆 z=-24.8、兩側天橋 11.8/17.7m、天花環帶 y≈20~21;一樓看台 15 排(排距 0.95、級高 0.24,首排高 2.77 @ z=21.04)、' +
        '樓座 19 排(排距 0.93、級高 0.50,9.35→18.35m)、舞台面 1.25m、舞台塔 21m。' +
        '樓座末排累積誤差約 0.4m;兩側雕塑折面牆以原模型可見三角形保存(左 103、右 101 面,公分精度)。',
    spec: {
        parts: [
            // ── 地面與舞台 ──
            {
                name: '觀眾廳平地',
                kind: 'slab', material: 'concrete', y: -0.1, thickness: 0.1,
                polygon: [...SIDE_LEFT_BACK, ...REAR_LOWER.slice(1, -1), ...SIDE_RIGHT_BACK],
            },
            { name: '主舞台', kind: 'slab', material: 'blackPlastic', y: 0, thickness: 1.25, polygon: rect(0, -16.55, 35.4, 20.9) },
            { name: '後舞台', kind: 'slab', material: 'blackPlastic', y: 0, thickness: 1.25, polygon: rect(0.5, -34.35, 22, 14.3) },

            // ── 舞台塔 ──
            { name: '舞台塔左牆', kind: 'wall', material: 'matteGray', y: 0, height: 21, thickness: 0.4, path: [[-17.7, -6.5], [-17.7, -27.2], [-10.5, -27.2]] },
            { name: '舞台塔右牆', kind: 'wall', material: 'matteGray', y: 0, height: 21, thickness: 0.4, path: [[17.7, -6.5], [17.7, -27.2], [11.5, -27.2]] },
            { name: '後舞台口上牆', kind: 'box', material: 'matteGray', center: [0.5, 16.75, -27.2], size: [22, 8.5, 0.4] },
            { name: '後舞台牆', kind: 'wall', material: 'matteGray', y: 0, height: 12.5, thickness: 0.3, path: [[-10.5, -27.2], [-10.5, -41.5], [11.5, -41.5], [11.5, -27.2]] },
            { name: '後舞台頂', kind: 'slab', material: 'matteGray', y: 12.5, thickness: 0.3, polygon: rect(0.5, -34.35, 22, 14.3) },
            { name: '鏡框上楣', kind: 'box', material: 'matteGray', center: [0, 19, -6.6], size: [35.4, 4, 0.4] },
            { name: '舞台後幕牆', kind: 'box', material: 'matteGray', center: [0, 11.125, -24.8], size: [30, 19.75, 0.1] },
            // 舞台塔兩側吊桿天橋(兩層,x 1.6m 寬,z -25 → -9.3)+ 欄杆
            ...([-1, 1] as const).flatMap(sx => [11.8, 17.7].flatMap(gy => [
                {
                    name: `天橋 ${sx < 0 ? '左' : '右'} ${gy}m`,
                    kind: 'box' as const, material: 'matteGray' as const,
                    center: [sx * 16.72, gy + 0.35, -17.15] as [number, number, number],
                    size: [1.64, 0.7, 15.7] as [number, number, number],
                },
                {
                    name: `天橋欄杆 ${sx < 0 ? '左' : '右'} ${gy}m`,
                    kind: 'wall' as const, material: 'matteGray' as const,
                    path: [[sx * 15.93, -25], [sx * 15.93, -9.3]] as Vec2[],
                    y: gy + 0.7, height: 1.2, thickness: 0.05,
                },
            ])),

            // ── 觀眾廳牆 ──
            // 北流招牌:兩側斜向雕塑折面牆(由原模型萃取,左右不對稱)
            { name: '左側折面牆', kind: 'facets', material: 'matteGray', ...TMC_WALL_LEFT },
            { name: '右側折面牆', kind: 'facets', material: 'matteGray', ...TMC_WALL_RIGHT },
            { name: '左側背板', kind: 'wall', material: 'matteGray', y: 0, height: 20.5, thickness: 0.3, path: SIDE_LEFT_BACK },
            { name: '右側背板', kind: 'wall', material: 'matteGray', y: 0, height: 20.5, thickness: 0.3, path: SIDE_RIGHT_BACK },
            { name: '一樓後牆', kind: 'wall', material: 'matteGray', y: 0, height: 11, thickness: 0.3, path: REAR_LOWER },
            { name: '二樓後牆', kind: 'wall', material: 'matteGray', y: 11, height: 10, thickness: 0.3, path: REAR_UPPER },

            // ── 天花環帶:牆面到中央開口之間(前段寬約 8m、後方轉角約 14m、後方正中約 3m),y 19.8~20.6 ──
            // 做法:以開口邊緣為「前緣」往外長一排,再以牆的外輪廓裁切
            {
                name: '天花環帶',
                kind: 'tiers', material: 'matteGray',
                path: CEILING_OPENING, side: 1,
                y: 19.8, rows: 1, rowDepth: 16, riserHeight: 0.8, baseY: 19.8,
                clip: ROOM_OUTLINE,
            },

            // ── 一樓後方看台 ──
            {
                name: '一樓看台',
                kind: 'tiers', material: 'concrete',
                path: arc(LOWER_C, LOWER_R, HALF - 0.6, HALF + 0.6, 48), side: -1,
                y: 2.53, rows: LOWER_ROWS, rowDepth: LOWER_ROW_DEPTH, riserHeight: 0.24,
                baseY: 0, clip: CLIP_LOWER,
                seats: { material: 'blackPlastic', pitch: 0.52 },
            },
            {
                name: '一樓看台後走道',
                kind: 'tiers', material: 'concrete',
                path: arc(LOWER_C, LOWER_R + LOWER_ROWS * LOWER_ROW_DEPTH, HALF - 0.6, HALF + 0.6, 48), side: -1,
                y: 6.13, rows: 1, rowDepth: 3.2, riserHeight: 0.24,
                baseY: 0, clip: CLIP_LOWER,
            },

            // ── 二樓樓座 ──
            {
                name: '二樓樓座',
                kind: 'tiers', material: 'concrete',
                path: arc(UPPER_C, UPPER_R, HALF - 0.85, HALF + 0.85, 48), side: -1,
                y: 8.85, rows: 19, rowDepth: 0.93, riserHeight: 0.5,
                baseY: [8.6, 11], clip: CLIP_UPPER,
                seats: { material: 'blackPlastic', pitch: 0.52 },
            },
            {
                name: '樓座前緣欄板',
                kind: 'wall', material: 'matteGray',
                path: arc(UPPER_C, UPPER_R - 0.3, HALF - 0.76, HALF + 0.76, 40),
                y: 8.6, height: 1.8, thickness: 0.3,
            },
        ],
    },
};
