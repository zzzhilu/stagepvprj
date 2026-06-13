'use client';

import { useStore, StageObject } from '@/store/useStore';
import {
    MATERIAL_LIBRARY,
    MaterialId,
    MaterialOverrides,
    BumpPattern,
    hasMaterialOverrides,
} from '@/lib/materials';

/** 不開放參數微調的特殊功能材質(LED 螢幕/投影幕等有自己的渲染路徑) */
const SPECIAL_MATERIALS: MaterialId[] = ['emissive', 'emissiveMesh', 'projectionScreen'];

/** CSS 模擬材質球:依預設的顏色/粗糙度/金屬度近似呈現 */
function MaterialBall({ id, selected, onClick }: { id: MaterialId; selected: boolean; onClick: () => void }) {
    const def = MATERIAL_LIBRARY[id];
    const highlightAlpha = Math.max(0.15, 0.95 - def.roughness * 0.8);
    const isGlow = (def.emissiveIntensity ?? 0) > 0.5;

    return (
        <button
            onClick={onClick}
            title={def.name}
            className={`relative w-8 h-8 rounded-full flex-shrink-0 transition-transform hover:scale-110 ${selected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-gray-900' : ''}`}
            style={{
                background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,${highlightAlpha}) 0%, ${def.color} 48%, rgba(0,0,0,0.82) 130%)`,
                boxShadow: isGlow ? `0 0 10px 2px ${def.emissive || def.color}` : 'inset 0 -2px 4px rgba(0,0,0,0.4)',
                opacity: def.transparent ? 0.65 : 1,
            }}
        />
    );
}

/** 單一參數滑桿列 */
function ParamSlider({
    label, value, min, max, step, onChange, format,
}: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void;
    format?: (v: number) => string;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">{label}</span>
            <input
                type="range"
                min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="flex-1 accent-violet-500 h-1 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 font-mono w-9 text-right flex-shrink-0">
                {format ? format(value) : value.toFixed(2)}
            </span>
        </div>
    );
}

/**
 * 材質面板:預設材質球網格 + 參數微調。
 * 所有調整即時 mutate 場景中的材質(所見即所得),
 * 覆寫值存於 StageObject.materialOverrides,自動隨專案同步。
 */
export function MaterialPanel({ object }: { object: StageObject }) {
    const updateObject = useStore((s) => s.updateObject);

    const def = MATERIAL_LIBRARY[object.material_id];
    const o = object.materialOverrides ?? {};
    const isSpecial = SPECIAL_MATERIALS.includes(object.material_id);

    const setOverride = (patch: Partial<MaterialOverrides>) => {
        updateObject(object.id, { materialOverrides: { ...o, ...patch } });
    };

    const clearOverrides = () => {
        updateObject(object.id, { materialOverrides: {} });
    };

    // 有效值 = 覆寫 ?? 基底預設
    const color = o.color ?? def?.color ?? '#888888';
    const roughness = o.roughness ?? def?.roughness ?? 0.5;
    const metalness = o.metalness ?? def?.metalness ?? 0;
    const envMapIntensity = o.envMapIntensity ?? 1.0;
    const bumpPattern: BumpPattern = o.bumpPattern ?? 'none';
    const bumpScale = o.bumpScale ?? 0.5;
    const patternScale = o.patternScale ?? 2;
    const emissive = o.emissive ?? def?.emissive ?? '#000000';
    const emissiveIntensity = o.emissiveIntensity ?? def?.emissiveIntensity ?? 0;
    const opacity = o.opacity ?? def?.opacity ?? 1;

    return (
        <div className="space-y-3">
            {/* 基底材質球網格 */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-500">基底材質:{def?.name ?? object.material_id}</label>
                    {hasMaterialOverrides(object.materialOverrides) && (
                        <button
                            onClick={clearOverrides}
                            className="text-[10px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/15 px-1.5 py-0.5 rounded transition-colors"
                        >
                            清除微調
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-6 gap-2 p-2 bg-gray-800/60 rounded">
                    {(Object.keys(MATERIAL_LIBRARY) as MaterialId[]).map((id) => (
                        <MaterialBall
                            key={id}
                            id={id}
                            selected={object.material_id === id}
                            onClick={() => updateObject(object.id, { material_id: id })}
                        />
                    ))}
                </div>
            </div>

            {/* 參數微調(特殊功能材質不開放) */}
            {isSpecial ? (
                <p className="text-[10px] text-gray-600">
                    此為功能材質(LED/投影內容由內容系統控制),不開放參數微調。
                </p>
            ) : (
                <div className="space-y-2">
                    {/* 顏色 */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">顏色</span>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setOverride({ color: e.target.value })}
                            className="w-8 h-6 rounded cursor-pointer bg-transparent border border-gray-600"
                        />
                        <span className="text-[10px] text-gray-400 font-mono">{color}</span>
                    </div>

                    <ParamSlider label="粗糙度" value={roughness} min={0} max={1} step={0.01}
                        onChange={(v) => setOverride({ roughness: v })} />
                    <ParamSlider label="金屬度" value={metalness} min={0} max={1} step={0.01}
                        onChange={(v) => setOverride({ metalness: v })} />
                    <ParamSlider label="反射強度" value={envMapIntensity} min={0} max={3} step={0.05}
                        onChange={(v) => setOverride({ envMapIntensity: v })} />

                    {/* 凹凸 */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">凹凸</span>
                        <div className="flex gap-1 flex-1">
                            {([['none', '無'], ['noise', '噪點'], ['brushed', '拉絲'], ['grid', '格紋']] as [BumpPattern, string][]).map(([p, label]) => (
                                <button
                                    key={p}
                                    onClick={() => setOverride({ bumpPattern: p })}
                                    className={`flex-1 py-1 rounded text-[10px] transition-colors ${bumpPattern === p ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {bumpPattern !== 'none' && (
                        <>
                            <ParamSlider label="凹凸強度" value={bumpScale} min={0} max={2} step={0.05}
                                onChange={(v) => setOverride({ bumpScale: v })} />
                            <ParamSlider label="紋理密度" value={patternScale} min={1} max={8} step={1}
                                onChange={(v) => setOverride({ patternScale: v })} format={(v) => `×${v}`} />
                        </>
                    )}

                    {/* 自發光 */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">自發光</span>
                        <input
                            type="color"
                            value={emissive}
                            onChange={(e) => setOverride({ emissive: e.target.value })}
                            className="w-8 h-6 rounded cursor-pointer bg-transparent border border-gray-600"
                        />
                        <input
                            type="range"
                            min={0} max={5} step={0.1} value={emissiveIntensity}
                            onChange={(e) => setOverride({ emissiveIntensity: parseFloat(e.target.value) })}
                            className="flex-1 accent-violet-500 h-1 cursor-pointer"
                        />
                        <span className="text-[10px] text-gray-400 font-mono w-9 text-right flex-shrink-0">
                            {emissiveIntensity.toFixed(1)}
                        </span>
                    </div>

                    <ParamSlider label="不透明" value={opacity} min={0.05} max={1} step={0.01}
                        onChange={(v) => setOverride({ opacity: v })} />
                </div>
            )}
        </div>
    );
}
