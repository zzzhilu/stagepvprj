import type { MaterialId } from './materials';
import type { ModelType } from '@/store/useStore';
import type { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════
// 預設模型定義 — 可在任何專案中快速新增的樂手/道具
// ═══════════════════════════════════════════════════════════════

// SVG icon helper — all admin icons use inline SVGs, never emoji
const svg = (d: string) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

export interface PresetModel {
    id: string;
    name: string;           // 中文顯示名
    model_path: string;     // /models/presets/xxx.glb
    type: ModelType;
    material_id: MaterialId;
    svgIcon: ReactNode;     // SVG icon for UI (never use emoji)
    defaultScale: [number, number, number];
}

export const PRESET_MODELS: PresetModel[] = [
    {
        id: 'preset_guitar',
        name: '吉他手',
        model_path: '/models/presets/guitar.glb',
        type: 'band',
        material_id: 'matteGray',
        // Guitar icon
        svgIcon: svg('M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'),
        defaultScale: [1, 1, 1],
    },
    {
        id: 'preset_drum',
        name: '鼓手',
        model_path: '/models/presets/drum.glb',
        type: 'band',
        material_id: 'matteGray',
        // Drum/circle icon
        svgIcon: svg('M12 8c-2.21 0-4 .895-4 2v4c0 1.105 1.79 2 4 2s4-.895 4-2v-4c0-1.105-1.79-2-4-2zM8 10c0-1.105 1.79-2 4-2s4 .895 4 2'),
        defaultScale: [1, 1, 1],
    },
    {
        id: 'preset_program',
        name: '鍵盤手',
        model_path: '/models/presets/program.glb',
        type: 'band',
        material_id: 'matteGray',
        // Keyboard icon
        svgIcon: svg('M3 8h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm3 3h2m2 0h2m2 0h2m-12 3h12'),
        defaultScale: [1, 1, 1],
    },
    {
        id: 'preset_a_pose1',
        name: '人形 A (站姿)',
        model_path: '/models/presets/A_pose1.glb',
        type: 'band',
        material_id: 'matteGray',
        // Person standing icon
        svgIcon: svg('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'),
        defaultScale: [1, 1, 1],
    },
    {
        id: 'preset_a_pose2',
        name: '人形 B (站姿)',
        model_path: '/models/presets/A_pose2.glb',
        type: 'band',
        material_id: 'matteGray',
        // Person variant icon
        svgIcon: svg('M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z'),
        defaultScale: [1, 1, 1],
    },
];
