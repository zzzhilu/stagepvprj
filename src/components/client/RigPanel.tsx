'use client';

import { useStore } from '@/store/useStore';
import { useState } from 'react';

/**
 * 客戶端機關控制面板。
 * 依後台定義的機關自動生成滑桿,使用者只能在 min/max 範圍內調整。
 * admin 模式下隱藏(後台用 RigEditor 內的預覽滑桿)。
 */
export function RigPanel() {
    const mode = useStore((s) => s.mode);
    const rigs = useStore((s) => s.rigs);
    const nulls = useStore((s) => s.nulls);
    const stageObjects = useStore((s) => s.stageObjects);
    const rigValues = useStore((s) => s.rigValues);
    const setRigValue = useStore((s) => s.setRigValue);
    const resetRigValues = useStore((s) => s.resetRigValues);

    const [collapsed, setCollapsed] = useState(false);

    // 過濾掉目標已不存在的機關(舊專案殘留資料防護)
    const validRigs = rigs.filter(rig =>
        rig.targetType === 'null'
            ? nulls.some(n => n.id === rig.targetId)
            : stageObjects.some(o => o.id === rig.targetId)
    );

    // admin 模式下右側被 Admin Panel 佔據,且後台有自己的預覽滑桿
    if (mode === 'admin' || validRigs.length === 0) return null;

    return (
        <div className="absolute bottom-4 right-4 z-40 pointer-events-auto max-w-[calc(100vw-2rem)]">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg border border-white/10 w-72 max-w-full">
                {/* 標題列 */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center gap-2 text-white text-xs font-semibold"
                    >
                        <span>🎛️ 舞台機關</span>
                        <svg
                            className={`w-3 h-3 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {!collapsed && (
                        <button
                            onClick={resetRigValues}
                            className="text-[10px] text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                        >
                            全部重置
                        </button>
                    )}
                </div>

                {/* 機關滑桿列表 */}
                {!collapsed && (
                    <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
                        {validRigs.map(rig => {
                            const value = rigValues[rig.id] ?? rig.defaultValue;
                            const unit = rig.type === 'rotation' ? '°' : 'm';
                            const isDefault = value === rig.defaultValue;
                            return (
                                <div key={rig.id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-200">{rig.name}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-violet-300 font-mono">
                                                {value.toFixed(rig.type === 'translation' ? 2 : 0)}{unit}
                                            </span>
                                            {!isDefault && (
                                                <button
                                                    onClick={() => setRigValue(rig.id, rig.defaultValue)}
                                                    className="text-[10px] text-gray-500 hover:text-gray-300"
                                                    title="重置此機關"
                                                >
                                                    ↺
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min={rig.min}
                                        max={rig.max}
                                        step={rig.step ?? (rig.type === 'translation' ? 0.01 : 1)}
                                        value={value}
                                        onChange={(e) => setRigValue(rig.id, parseFloat(e.target.value))}
                                        className="w-full accent-violet-500 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                                        <span>{rig.min}{unit}</span>
                                        <span>{rig.max}{unit}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
