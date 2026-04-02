'use client';

import { useState } from 'react';
import { useStore, type StageObject } from '@/store/useStore';
import { PRESET_MODELS, type PresetModel } from '@/lib/presets';

export function QuickAddPanel() {
    const addObject = useStore((state) => state.addObject);
    const stageObjects = useStore((state) => state.stageObjects);

    // Box dimensions
    const [boxW, setBoxW] = useState(2);
    const [boxD, setBoxD] = useState(1);
    const [boxH, setBoxH] = useState(0.3);

    // Projection Screen dimensions
    const [screenW, setScreenW] = useState(4);
    const [screenH, setScreenH] = useState(3);
    const [screenCurvature, setScreenCurvature] = useState(0);

    // Parent binding for preset models
    const [selectedParentId, setSelectedParentId] = useState<string>('');

    // Get objects that can be parents (boxes and other props)
    const parentCandidates = stageObjects.filter(
        obj => obj.model_path === '__box__' || obj.model_path === '__projection_screen__' || obj.type === 'prop' || obj.type === 'stage'
    );

    const handleAddBox = () => {
        const id = `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newObj: StageObject = {
            id,
            model_path: '__box__',
            material_id: 'matteGray',
            type: 'prop',
            instances: [{
                pos: [0, boxH / 2, 0],
                rot: [0, 0, 0],
                scale: [boxW, boxH, boxD],
            }],
        };
        addObject(newObj);
    };

    const handleAddProjectionScreen = () => {
        const id = `screen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newObj: StageObject = {
            id,
            model_path: '__projection_screen__',
            material_id: 'projectionScreen',
            type: 'prop',
            curvature: screenCurvature,
            instances: [{
                pos: [0, screenH, 0],   // Place at top edge height so it hangs down
                rot: [0, 0, 0],
                scale: [screenW, screenH, 1],
            }],
        };
        addObject(newObj);
    };

    const handleAddPreset = (preset: typeof PRESET_MODELS[0]) => {
        const id = `${preset.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newObj: StageObject = {
            id,
            model_path: preset.model_path,
            material_id: preset.material_id,
            type: preset.type,
            instances: [{
                pos: [0, 0, 0],
                rot: [0, 0, 0],
                scale: preset.defaultScale,
            }],
            parentId: selectedParentId || undefined,
        };
        addObject(newObj);
    };

    return (
        <div className="p-4 space-y-4">
            {/* ── Box 台板生成器 ── */}
            <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    新增台板 (Box)
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                        <label className="text-[10px] text-gray-500 block">寬 W (m)</label>
                        <input
                            type="number"
                            value={boxW}
                            onChange={(e) => setBoxW(Number(e.target.value))}
                            min={0.1}
                            step={0.1}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 block">深 D (m)</label>
                        <input
                            type="number"
                            value={boxD}
                            onChange={(e) => setBoxD(Number(e.target.value))}
                            min={0.1}
                            step={0.1}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 block">高 H (m)</label>
                        <input
                            type="number"
                            value={boxH}
                            onChange={(e) => setBoxH(Number(e.target.value))}
                            min={0.05}
                            step={0.05}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                    </div>
                </div>
                <button
                    onClick={handleAddBox}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded py-1.5 text-sm transition-colors"
                >
                    ＋ 新增台板
                </button>
            </div>

            {/* ── 投影紗生成器 ── */}
            <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    新增投影紗
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label className="text-[10px] text-gray-500 block">寬 W (m)</label>
                        <input
                            type="number"
                            value={screenW}
                            onChange={(e) => setScreenW(Number(e.target.value))}
                            min={0.5}
                            step={0.5}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 block">高 H (m)</label>
                        <input
                            type="number"
                            value={screenH}
                            onChange={(e) => setScreenH(Number(e.target.value))}
                            min={0.5}
                            step={0.5}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                    </div>
                </div>
                {/* Curvature control */}
                <div className="mb-2">
                    <label className="text-[10px] text-gray-500 block mb-1">
                        曲度 Curvature ({screenCurvature > 0 ? '+' : ''}{screenCurvature.toFixed(2)})
                    </label>
                    <input
                        type="range"
                        value={screenCurvature}
                        onChange={(e) => setScreenCurvature(Number(e.target.value))}
                        min={-5}
                        max={5}
                        step={0.1}
                        className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                        <span>← 外凸</span>
                        <span>平面</span>
                        <span>内凹 →</span>
                    </div>
                </div>
                <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                    軸心在頂邊 — 透過 Scale Y 控制展開/收闔。<br/>
                    半透明磨砂材質＋垂直躁波動態。
                </p>
                <button
                    onClick={handleAddProjectionScreen}
                    className="w-full bg-indigo-900/60 hover:bg-indigo-800/70 text-indigo-200 hover:text-white border border-indigo-700/40 rounded py-1.5 text-sm transition-all"
                >
                    ＋ 新增投影紗
                </button>
            </div>

            {/* ── 預設模型庫 ── */}
            <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    預設樂手模型
                </h3>

                {/* Parent binding selector */}
                <div className="mb-2">
                    <label className="text-[10px] text-gray-500 block mb-1">
                        跟隨物件 (可選 — 新增的模型會跟隨此物件移動)
                    </label>
                    <select
                        value={selectedParentId}
                        onChange={(e) => setSelectedParentId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                    >
                        <option value="">無 (獨立物件)</option>
                        {parentCandidates.map((obj) => (
                            <option key={obj.id} value={obj.id}>
                                {obj.model_path === '__box__'
                                    ? `📦 台板 (${obj.instances[0]?.scale[0]}×${obj.instances[0]?.scale[2]}×${obj.instances[0]?.scale[1]})`
                                    : obj.model_path === '__projection_screen__'
                                        ? `🎬 投影紗 (${obj.instances[0]?.scale[0]}×${obj.instances[0]?.scale[1]})`
                                        : `${obj.id.slice(0, 12)}...`
                                }
                            </option>
                        ))}
                    </select>
                </div>

                {/* Model grid */}
                <div className="grid grid-cols-2 gap-2">
                    {PRESET_MODELS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => handleAddPreset(preset)}
                            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-violet-500/50 rounded-lg p-2.5 text-left transition-all group"
                        >
                            <div className="text-gray-400 group-hover:text-violet-300 mb-1 transition-colors">{preset.svgIcon}</div>
                            <div className="text-xs text-white group-hover:text-violet-300 transition-colors">
                                {preset.name}
                            </div>
                        </button>
                    ))}
                </div>

                {selectedParentId && (
                    <p className="text-[10px] text-violet-400 mt-2 flex items-start gap-1">
                        <svg className="w-3 h-3 mt-px flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        新增的模型將跟隨所選物件，可在 Cue 中獨立調整相對位置
                    </p>
                )}
            </div>
        </div>
    );
}
