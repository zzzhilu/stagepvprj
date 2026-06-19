'use client';

import { useStore } from '@/store/useStore';
import { getRigStep, quantizeRigValue } from '@/lib/rig-utils';
import { rigColorRgb } from '@/store/useStore';
import { useState } from 'react';
import { RigIcon } from '@/components/ui/icons';

/**
 * 機關控制面板(左側,Cues/視角面板上方)。
 * 依後台定義的機關自動生成滑桿,使用者只能在 min/max 範圍內調整。
 * Admin 模式下同樣可見,方便一邊增減機關一邊測試;
 * 並額外顯示排序箭頭,可調整滑桿順序(順序隨專案同步到客戶端)。
 */
export function RigPanel() {
    const mode = useStore((s) => s.mode);
    const rigs = useStore((s) => s.rigs);
    const nulls = useStore((s) => s.nulls);
    const stageObjects = useStore((s) => s.stageObjects);
    const rigValues = useStore((s) => s.rigValues);
    const setRigValue = useStore((s) => s.setRigValue);
    const resetRigValues = useStore((s) => s.resetRigValues);
    const moveRig = useStore((s) => s.moveRig);
    const views = useStore((s) => s.views);
    const cues = useStore((s) => s.cues);
    const toolbarExpanded = useStore((s) => s.toolbarExpanded);
    const bottomPanelExpanded = useStore((s) => s.bottomPanelExpanded);

    const [collapsed, setCollapsed] = useState(false);

    // 過濾掉目標已不存在的機關(舊專案殘留資料防護)
    const validRigs = rigs.filter(rig =>
        rig.targetType === 'null'
            ? nulls.some(n => n.id === rig.targetId)
            : stageObjects.some(o => o.id === rig.targetId)
    );

    if (validRigs.length === 0) return null;

    const isAdmin = mode === 'admin';

    // 定位邏輯:
    // - 收合時:貼齊左下角,與 Cues/視角面板的開闔鈕垂直對齊(保持畫面乾淨)
    //   · 左下面板展開 → 疊在面板頂端上方 (bottom-52)
    //   · 左下面板收合 → 疊在其開闔鈕正上方 (bottom-14)
    //   · 左下面板不存在 → 直接貼角落 (bottom-4)
    // - 展開時:浮出畫面內側,避開左緣小工具列(工具列展開時再往右退)
    const hasBottomPanel = views.length > 0 || cues.length > 0;
    const anchorClass = collapsed
        ? (hasBottomPanel ? (bottomPanelExpanded ? 'bottom-52' : 'bottom-14') : 'bottom-4')
        : (hasBottomPanel ? 'bottom-52' : 'bottom-4');
    const leftClass = collapsed
        ? 'left-4'
        : (toolbarExpanded ? 'left-24' : 'left-14');

    return (
        <div
            className={`absolute ${leftClass} ${anchorClass} z-40 pointer-events-auto transition-all duration-300`}
            data-ui-element
        >
            <div className="flex items-end gap-1.5">
                {/* 主面板 */}
                {!collapsed && (
                    <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 w-64 animate-fade-in">
                        {/* 標題列 */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                                <RigIcon className="w-3 h-3" />
                                機關
                            </div>
                            <button
                                onClick={resetRigValues}
                                className="text-[10px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/15 px-2 py-0.5 rounded transition-colors"
                            >
                                全部重置
                            </button>
                        </div>

                        {/* 機關滑桿列表 */}
                        <div className="p-3 space-y-3 max-h-[45vh] overflow-y-auto">
                            {validRigs.map((rig, index) => {
                                const value = quantizeRigValue(rig.type, rigValues[rig.id] ?? rig.defaultValue);
                                const unit = rig.type === 'rotation' ? '°' : rig.type === 'translation' ? 'm' : '';
                                const isDefault = value === rig.defaultValue;
                                const rgb = rigColorRgb(rig.color);
                                const isVis = rig.type === 'visibility';
                                return (
                                    <div key={rig.id} className="group/rig">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1 min-w-0">
                                                {/* Admin:排序箭頭 */}
                                                {isAdmin && (
                                                    <div className="flex flex-col -my-1 opacity-30 group-hover/rig:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => moveRig(rig.id, -1)}
                                                            disabled={index === 0}
                                                            className="text-gray-400 hover:text-white disabled:opacity-20 leading-none"
                                                            title="上移"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => moveRig(rig.id, 1)}
                                                            disabled={index === validRigs.length - 1}
                                                            className="text-gray-400 hover:text-white disabled:opacity-20 leading-none"
                                                            title="下移"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: `rgba(${rgb}, 0.7)` }} />
                                                <span className="text-xs text-gray-200 truncate">{rig.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {!isVis && (
                                                    <span className="text-xs text-gray-300 font-mono">
                                                        {value.toFixed(rig.type === 'translation' ? 2 : 0)}{unit}
                                                    </span>
                                                )}
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
                                        {isVis ? (
                                            <button
                                                onClick={() => setRigValue(rig.id, value >= 0.5 ? 0 : 1)}
                                                className={`w-full py-1 rounded text-[11px] font-medium transition-colors ${value >= 0.5 ? 'text-white' : 'bg-white/5 text-gray-500'}`}
                                                style={value >= 0.5 ? { background: `rgba(${rgb}, 0.6)` } : undefined}
                                            >
                                                {value >= 0.5 ? '顯示中' : '已隱藏'}
                                            </button>
                                        ) : (
                                            <>
                                                <input
                                                    type="range"
                                                    min={rig.min}
                                                    max={rig.max}
                                                    step={getRigStep(rig.type)}
                                                    value={value}
                                                    onChange={(e) => setRigValue(rig.id, parseFloat(e.target.value))}
                                                    className="w-full cursor-pointer h-1"
                                                    style={{ accentColor: `rgba(${rgb}, 0.9)` }}
                                                />
                                                <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                                                    <span>{rig.min}{unit}</span>
                                                    <span>{rig.max}{unit}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 開闔按鈕(機關圖標) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`
                        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        bg-black/40 backdrop-blur-md border border-white/10
                        hover:bg-white/10 transition-all duration-200
                        ${!collapsed ? 'text-white' : 'text-gray-400'}
                    `}
                    title={collapsed ? '展開機關面板' : '收合機關面板'}
                >
                    <RigIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
