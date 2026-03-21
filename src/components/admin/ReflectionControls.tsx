'use client';

import { useStore } from '@/store/useStore';
import { useState } from 'react';

const ENV_PRESETS = [
    { id: 'studio', name: '攝影棚' },
    { id: 'city', name: '城市' },
    { id: 'sunset', name: '日落' },
    { id: 'warehouse', name: '倉庫' },
    { id: 'forest', name: '森林' },
    { id: 'apartment', name: '室內' },
    { id: 'park', name: '公園' },
    { id: 'lobby', name: '大廳' },
    { id: 'dawn', name: '黎明' },
    { id: 'night', name: '夜晚' },
];

function SliderRow({ label, value, min, max, step, onChange }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-white font-mono bg-gray-800 px-2 py-0.5 rounded">
                    {typeof value === 'number' ? (step < 1 ? value.toFixed(2) : value) : value}
                </span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
        </div>
    );
}

function ToggleRow({ label, checked, onChange }: {
    label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-gray-400">{label}</span>
            <div className="relative">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
            </div>
        </label>
    );
}

function SpotLightPanel({ index }: { index: number }) {
    const light = useStore((state) => state.spotLights[index]);
    const updateSpotLight = useStore((state) => state.updateSpotLight);
    const [expanded, setExpanded] = useState(false);

    if (!light) return null;

    return (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Header - always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full border border-gray-600"
                        style={{ backgroundColor: light.enabled ? light.color : '#333' }}
                    />
                    <span className="text-xs font-medium">{light.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Enable/Disable without expanding */}
                    <div
                        onClick={(e) => { e.stopPropagation(); updateSpotLight(index, { enabled: !light.enabled }); }}
                        className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${light.enabled ? 'bg-violet-600' : 'bg-gray-600'}`}
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
                    {/* Position controls */}
                    <SliderRow label="X 位置" value={light.position[0]} min={-20} max={20} step={0.5}
                        onChange={(v) => updateSpotLight(index, { position: [v, light.position[1], light.position[2]] })} />
                    <SliderRow label="Y 高度" value={light.position[1]} min={0} max={25} step={0.5}
                        onChange={(v) => updateSpotLight(index, { position: [light.position[0], v, light.position[2]] })} />
                    <SliderRow label="Z 位置" value={light.position[2]} min={-20} max={20} step={0.5}
                        onChange={(v) => updateSpotLight(index, { position: [light.position[0], light.position[1], v] })} />

                    <div className="border-t border-gray-700 my-1" />

                    {/* Light properties */}
                    <SliderRow label="強度" value={light.intensity} min={0} max={10} step={0.1}
                        onChange={(v) => updateSpotLight(index, { intensity: v })} />
                    <SliderRow label="角度" value={light.angle} min={0.1} max={1.5} step={0.05}
                        onChange={(v) => updateSpotLight(index, { angle: v })} />
                    <SliderRow label="照射距離" value={light.distance} min={5} max={50} step={1}
                        onChange={(v) => updateSpotLight(index, { distance: v })} />

                    {/* Color picker */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">顏色</span>
                        <input
                            type="color" value={light.color}
                            onChange={(e) => updateSpotLight(index, { color: e.target.value })}
                            className="w-8 h-6 rounded border border-gray-600 cursor-pointer bg-transparent"
                        />
                    </div>

                    {/* Shadow toggle */}
                    <ToggleRow label="投射陰影" checked={light.castShadow}
                        onChange={(v) => updateSpotLight(index, { castShadow: v })} />
                </div>
            )}
        </div>
    );
}

export function ReflectionControls() {
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const reflectionMirror = useStore((state) => state.reflectionMirror);
    const reflectionBlur = useStore((state) => state.reflectionBlur);
    const reflectionMetalness = useStore((state) => state.reflectionMetalness);
    const setReflectionMirror = useStore((state) => state.setReflectionMirror);
    const setReflectionBlur = useStore((state) => state.setReflectionBlur);
    const setReflectionMetalness = useStore((state) => state.setReflectionMetalness);

    // Enhanced controls
    const envPreset = useStore((state) => state.envPreset);
    const envIntensity = useStore((state) => state.envIntensity);
    const contactShadow = useStore((state) => state.contactShadow);
    const toneMapping = useStore((state) => state.toneMapping);
    const spotLights = useStore((state) => state.spotLights);
    const setEnvPreset = useStore((state) => state.setEnvPreset);
    const setEnvIntensity = useStore((state) => state.setEnvIntensity);
    const setContactShadow = useStore((state) => state.setContactShadow);
    const setToneMapping = useStore((state) => state.setToneMapping);

    if (!perfectRenderEnabled) return null;

    return (
        <div className="bg-gray-900 rounded-lg p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <h4 className="text-sm font-bold flex items-center gap-2 sticky top-0 bg-gray-900 pb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 3c4.97 0 9 4.03 9 9M8 21.17A9 9 0 013 12" /></svg> 完美渲染設定
            </h4>

            {/* === 環境 === */}
            <div className="space-y-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">環境</span>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">環境光照</span>
                    </div>
                    <select
                        value={envPreset}
                        onChange={(e) => setEnvPreset(e.target.value)}
                        className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-violet-500 focus:outline-none cursor-pointer"
                    >
                        {ENV_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.name}</option>
                        ))}
                    </select>
                </div>
                <SliderRow label="環境強度" value={envIntensity} min={0} max={3} step={0.1} onChange={setEnvIntensity} />
            </div>

            {/* === 聚光燈 === */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">聚光燈</span>
                {spotLights.map((_, index) => (
                    <SpotLightPanel key={index} index={index} />
                ))}
            </div>

            {/* === 地板反射 === */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">地板反射</span>
                <SliderRow label="鏡面強度" value={reflectionMirror} min={0} max={1} step={0.05} onChange={setReflectionMirror} />
                <SliderRow label="模糊程度" value={reflectionBlur} min={0} max={20} step={1} onChange={setReflectionBlur} />
                <SliderRow label="金屬感" value={reflectionMetalness} min={0} max={1} step={0.05} onChange={setReflectionMetalness} />
            </div>

            {/* === 效果開關 === */}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-800">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">效果</span>
                <ToggleRow label="接觸陰影" checked={contactShadow} onChange={setContactShadow} />
                <ToggleRow label="色調映射" checked={toneMapping} onChange={setToneMapping} />
            </div>
        </div>
    );
}
