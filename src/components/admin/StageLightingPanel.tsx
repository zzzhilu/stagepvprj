'use client';

import { useStore, StageLight, StageLightType } from '@/store/useStore';
import { useState } from 'react';

// --- Presets ---
const R = [-Math.PI / 2, 0, 0] as [number, number, number]; // Default rotation: pointing down

const LIGHT_PRESETS: Record<string, StageLight[]> = {
    concert_dark: [
        { id: 'p_spot1', name: '前方主投射', type: 'spot', position: [0, 10, 5], rotation: R, intensity: 5, color: '#ff9944', enabled: true, castShadow: true, angle: 0.4, penumbra: 0.9, distance: 40 },
        { id: 'p_spot2', name: '左側色光', type: 'spot', position: [-6, 8, 0], rotation: R, intensity: 3, color: '#4466ff', enabled: true, castShadow: false, angle: 0.5, penumbra: 0.8, distance: 30 },
        { id: 'p_spot3', name: '右側色光', type: 'spot', position: [6, 8, 0], rotation: R, intensity: 3, color: '#ff4466', enabled: true, castShadow: false, angle: 0.5, penumbra: 0.8, distance: 30 },
        { id: 'p_point1', name: '舞台頂光', type: 'point', position: [0, 12, 0], rotation: R, intensity: 1.5, color: '#ffffff', enabled: true, castShadow: false, distance: 25 },
    ],
    three_point: [
        { id: 'p_key', name: '主燈 Key', type: 'spot', position: [0, 12, 5], rotation: R, intensity: 4, color: '#ffffff', enabled: true, castShadow: true, angle: 0.6, penumbra: 0.8, distance: 30 },
        { id: 'p_fill', name: '補光 Fill', type: 'spot', position: [8, 8, 8], rotation: R, intensity: 2, color: '#ffeedd', enabled: true, castShadow: false, angle: 0.5, penumbra: 0.8, distance: 25 },
        { id: 'p_rim', name: '背光 Rim', type: 'spot', position: [-5, 6, -8], rotation: R, intensity: 1.5, color: '#ddeeff', enabled: true, castShadow: false, angle: 0.4, penumbra: 0.8, distance: 20 },
    ],
    venue: [
        { id: 'p_vspot1', name: '正面投射 A', type: 'spot', position: [3, 10, 8], rotation: R, intensity: 3, color: '#fff5e6', enabled: true, castShadow: true, angle: 0.5, penumbra: 0.7, distance: 35 },
        { id: 'p_vspot2', name: '正面投射 B', type: 'spot', position: [-3, 10, 8], rotation: R, intensity: 3, color: '#fff5e6', enabled: true, castShadow: false, angle: 0.5, penumbra: 0.7, distance: 35 },
        { id: 'p_strip1', name: 'LED 條燈', type: 'strip', position: [0, 8, -3], rotation: R, intensity: 4, color: '#6688ff', enabled: true, castShadow: false, width: 6, height: 0.1 },
        { id: 'p_rect1', name: '柔光面板', type: 'rect', position: [0, 6, 5], rotation: R, intensity: 2, color: '#ffffff', enabled: true, castShadow: false, width: 3, height: 2 },
    ],
};

const LIGHT_TYPE_LABELS: Record<StageLightType, string> = {
    spot: 'Spot Light',
    point: 'Point Light',
    rect: 'Rect Area',
    strip: 'LED 條燈',
};

const LIGHT_TYPE_ICONS: Record<StageLightType, string> = {
    spot: '🔦',
    point: '💡',
    rect: '📐',
    strip: '━━',
};

function generateLightId() {
    return `light_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultLight(type: StageLightType, index: number): StageLight {
    const base = {
        id: generateLightId(),
        enabled: true,
        castShadow: type === 'spot',
        rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
        color: '#ffffff',
    };

    switch (type) {
        case 'spot':
            return { ...base, name: `Spot ${index}`, type: 'spot', position: [0, 10, 5], intensity: 4, angle: 0.5, penumbra: 0.8, distance: 30 };
        case 'point':
            return { ...base, name: `Point ${index}`, type: 'point', position: [0, 8, 0], intensity: 3, distance: 20 };
        case 'rect':
            return { ...base, name: `Rect ${index}`, type: 'rect', position: [0, 6, 3], intensity: 3, width: 2, height: 2 };
        case 'strip':
            return { ...base, name: `Strip ${index}`, type: 'strip', position: [0, 7, 0], intensity: 4, width: 4, height: 0.1 };
    }
}

// --- Sub-components ---

function SliderRow({ label, value, min, max, step, onChange }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="space-y-0.5">
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded">
                    {step < 1 ? value.toFixed(2) : value}
                </span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
        </div>
    );
}

function StageLightCard({ light }: { light: StageLight }) {
    const updateStageLight = useStore((s) => s.updateStageLight);
    const removeStageLight = useStore((s) => s.removeStageLight);
    const duplicateStageLight = useStore((s) => s.duplicateStageLight);
    const stageObjects = useStore((s) => s.stageObjects);
    const [expanded, setExpanded] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const update = (updates: Partial<StageLight>) => updateStageLight(light.id, updates);

    return (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm">{LIGHT_TYPE_ICONS[light.type]}</span>
                    <div
                        className="w-3 h-3 rounded-full border border-gray-600"
                        style={{ backgroundColor: light.enabled ? light.color : '#333' }}
                    />
                    <span className="text-xs font-medium truncate max-w-[120px]">{light.name}</span>
                    <span className="text-[10px] text-gray-500">{LIGHT_TYPE_LABELS[light.type]}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        onClick={(e) => { e.stopPropagation(); update({ enabled: !light.enabled }); }}
                        className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${light.enabled ? 'bg-amber-600' : 'bg-gray-600'}`}
                    >
                        <div className={`absolute top-[2px] w-3 h-3 rounded-full bg-white transition-transform ${light.enabled ? 'left-[14px]' : 'left-[2px]'}`} />
                    </div>
                    <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Expanded controls */}
            {expanded && (
                <div className="px-3 py-2 space-y-2 bg-gray-900/50">
                    {/* Name edit */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-12 shrink-0">名稱</span>
                        <input
                            type="text"
                            value={light.name}
                            onChange={(e) => update({ name: e.target.value })}
                            className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-700 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    {/* Position */}
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">位置</div>
                    <SliderRow label="X" value={light.position[0]} min={-30} max={30} step={0.5}
                        onChange={(v) => update({ position: [v, light.position[1], light.position[2]] })} />
                    <SliderRow label="Y (高度)" value={light.position[1]} min={0} max={30} step={0.5}
                        onChange={(v) => update({ position: [light.position[0], v, light.position[2]] })} />
                    <SliderRow label="Z" value={light.position[2]} min={-30} max={30} step={0.5}
                        onChange={(v) => update({ position: [light.position[0], light.position[1], v] })} />

                    {/* Rotation (Spot only — use Gizmo for fine control) */}
                    {light.type === 'spot' && (
                        <>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">旋轉 (角度)</div>
                            <SliderRow label="X 軸旋轉" value={Math.round(light.rotation[0] * 180 / Math.PI)} min={-180} max={180} step={5}
                                onChange={(v) => update({ rotation: [v * Math.PI / 180, light.rotation[1], light.rotation[2]] })} />
                            <SliderRow label="Y 軸旋轉" value={Math.round(light.rotation[1] * 180 / Math.PI)} min={-180} max={180} step={5}
                                onChange={(v) => update({ rotation: [light.rotation[0], v * Math.PI / 180, light.rotation[2]] })} />
                            <SliderRow label="Z 軸旋轉" value={Math.round(light.rotation[2] * 180 / Math.PI)} min={-180} max={180} step={5}
                                onChange={(v) => update({ rotation: [light.rotation[0], light.rotation[1], v * Math.PI / 180] })} />
                        </>
                    )}

                    <div className="border-t border-gray-700 my-1" />

                    {/* Intensity */}
                    <SliderRow label="強度" value={light.intensity} min={0} max={30} step={0.5}
                        onChange={(v) => update({ intensity: v })} />

                    {/* Spot-specific */}
                    {light.type === 'spot' && (
                        <>
                            <SliderRow label="角度" value={light.angle ?? 0.5} min={0.1} max={1.5} step={0.05}
                                onChange={(v) => update({ angle: v })} />
                            <SliderRow label="半影" value={light.penumbra ?? 0.8} min={0} max={1} step={0.05}
                                onChange={(v) => update({ penumbra: v })} />
                        </>
                    )}

                    {/* Distance (spot & point) */}
                    {(light.type === 'spot' || light.type === 'point') && (
                        <SliderRow label="照射距離" value={light.distance ?? 30} min={5} max={100} step={1}
                            onChange={(v) => update({ distance: v })} />
                    )}

                    {/* Rect / Strip width & height */}
                    {(light.type === 'rect' || light.type === 'strip') && (
                        <>
                            <SliderRow label="寬度" value={light.width ?? 2} min={0.5} max={15} step={0.5}
                                onChange={(v) => update({ width: v })} />
                            {light.type === 'rect' && (
                                <SliderRow label="高度" value={light.height ?? 2} min={0.5} max={10} step={0.5}
                                    onChange={(v) => update({ height: v })} />
                            )}
                        </>
                    )}

                    {/* Color */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">顏色</span>
                        <input
                            type="color" value={light.color}
                            onChange={(e) => update({ color: e.target.value })}
                            className="w-8 h-6 rounded border border-gray-600 cursor-pointer bg-transparent"
                        />
                    </div>

                    {/* Shadow toggle  */}
                    {(light.type === 'spot' || light.type === 'point') && (
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs text-gray-400">投射陰影</span>
                            <div className="relative">
                                <input type="checkbox" checked={light.castShadow} onChange={(e) => update({ castShadow: e.target.checked })} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                            </div>
                        </label>
                    )}

                    {/* Parent following */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">跟隨物件</span>
                        <select
                            value={light.parentId || ''}
                            onChange={(e) => update({ parentId: e.target.value || undefined })}
                            className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-700 focus:border-amber-500 focus:outline-none max-w-[140px]"
                        >
                            <option value="">無 (獨立)</option>
                            {stageObjects.map(obj => (
                                <option key={obj.id} value={obj.id}>
                                    {obj.model_path?.split('/').pop()?.replace('.glb', '') || `[${obj.type}] ${obj.id.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => duplicateStageLight(light.id)}
                            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
                            複製
                        </button>
                        {!confirmDelete ? (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="flex-1 text-xs bg-gray-700 hover:bg-red-700 text-white py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                刪除
                            </button>
                        ) : (
                            <button
                                onClick={() => { removeStageLight(light.id); setConfirmDelete(false); }}
                                className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white py-1.5 rounded transition-colors animate-pulse"
                            >
                                確認刪除？
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main Panel ---

export function StageLightingPanel() {
    const stageLights = useStore((s) => s.stageLights);
    const addStageLight = useStore((s) => s.addStageLight);
    const setStageLights = useStore((s) => s.setStageLights);
    const perfectRenderEnabled = useStore((s) => s.perfectRenderEnabled);

    const handleAddLight = (type: StageLightType) => {
        const count = stageLights.filter(l => l.type === type).length + 1;
        addStageLight(createDefaultLight(type, count));
    };

    const applyPreset = (presetKey: string) => {
        const preset = LIGHT_PRESETS[presetKey];
        if (!preset) return;
        // Generate unique IDs for preset lights
        const lights = preset.map(l => ({
            ...l,
            id: generateLightId(),
        }));
        setStageLights(lights);
    };

    return (
        <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="text-lg">💡</span> 燈光系統
                </h3>
                {!perfectRenderEnabled && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                        請開啟「完美渲染」模式以預覽燈光效果
                    </p>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Add light buttons */}
                <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">新增燈光</span>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button onClick={() => handleAddLight('spot')}
                            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                            🔦 Spot Light
                        </button>
                        <button onClick={() => handleAddLight('point')}
                            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                            💡 Point Light
                        </button>
                        <button onClick={() => handleAddLight('rect')}
                            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                            📐 Rect Area
                        </button>
                        <button onClick={() => handleAddLight('strip')}
                            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                            ━ LED 條燈
                        </button>
                    </div>
                </div>

                {/* Presets */}
                <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">快速預設</span>
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => applyPreset('concert_dark')}
                            className="flex-1 text-[10px] bg-gray-800 hover:bg-amber-900/30 border border-gray-700 hover:border-amber-600/50 text-gray-300 py-1.5 rounded transition-colors">
                            🎤 演唱會
                        </button>
                        <button onClick={() => applyPreset('three_point')}
                            className="flex-1 text-[10px] bg-gray-800 hover:bg-amber-900/30 border border-gray-700 hover:border-amber-600/50 text-gray-300 py-1.5 rounded transition-colors">
                            🎬 三點光
                        </button>
                        <button onClick={() => applyPreset('venue')}
                            className="flex-1 text-[10px] bg-gray-800 hover:bg-amber-900/30 border border-gray-700 hover:border-amber-600/50 text-gray-300 py-1.5 rounded transition-colors">
                            🎪 展演空間
                        </button>
                    </div>
                </div>

                {/* Light list */}
                {stageLights.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                燈光列表 ({stageLights.length})
                            </span>
                        </div>
                        {stageLights.map(light => (
                            <StageLightCard key={light.id} light={light} />
                        ))}
                    </div>
                )}

                {stageLights.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                        <p className="text-sm">尚未新增任何燈光</p>
                        <p className="text-xs mt-1">使用上方按鈕新增，或套用快速預設</p>
                    </div>
                )}

                {/* Info */}
                <div className="text-xs text-gray-500 bg-gray-800/50 rounded p-2">
                    <p>💡 燈光僅在<strong className="text-amber-400">完美渲染模式</strong>中生效</p>
                    <p className="mt-1">🔗 設定「跟隨物件」可讓燈光隨 Truss 移動</p>
                    <p className="mt-1">🎬 燈光狀態會隨 Cue 一起儲存與還原</p>
                </div>
            </div>
        </div>
    );
}
