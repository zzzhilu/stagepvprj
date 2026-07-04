'use client';

import { useStore } from '@/store/useStore';
import { useState, useEffect, useRef } from 'react';
interface BottomLeftPanelProps {
    defaultCollapsed?: boolean;
}

export function BottomLeftPanel({ defaultCollapsed = false }: BottomLeftPanelProps) {
    const views = useStore((state) => state.views);
    const activeViewId = useStore((state) => state.activeViewId);
    const setActiveView = useStore((state) => state.setActiveView);
    const cues = useStore((state) => state.cues);
    const activeCueId = useStore((state) => state.activeCueId);
    const applyCue = useStore((state) => state.applyCue);
    // 客戶編輯模式:cue 可雙擊改名/新增/更新機關值,視角可新增/雙擊改名
    const clientEditMode = useStore((state) => state.clientEditMode);
    const renameCue = useStore((state) => state.renameCue);
    const addCue = useStore((state) => state.addCue);
    const updateCue = useStore((state) => state.updateCue);
    const renameView = useStore((state) => state.renameView);
    const triggerCapture = useStore((state) => state.triggerCapture);

    // Initial state based on prop
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [editingCueId, setEditingCueId] = useState<string | null>(null);
    const [editingCueName, setEditingCueName] = useState('');
    const [editingViewId, setEditingViewId] = useState<string | null>(null);
    const [editingViewName, setEditingViewName] = useState('');
    const setBottomPanelExpanded = useStore((state) => state.setBottomPanelExpanded);

    // 鏡射展開狀態到 store,供 RigPanel 收合按鈕對齊定位
    useEffect(() => {
        setBottomPanelExpanded(!collapsed);
        return () => setBottomPanelExpanded(false);
    }, [collapsed, setBottomPanelExpanded]);

    // Only auto-select first view on initial mount (not when user clears it by rotating)
    const hasAutoSelected = useRef(false);
    useEffect(() => {
        if (views.length > 0 && activeViewId === null && !hasAutoSelected.current) {
            setActiveView(views[0].id);
            hasAutoSelected.current = true;
        }
        // Mark as done once a view is actively set
        if (activeViewId !== null) {
            hasAutoSelected.current = true;
        }
    }, [views, activeViewId, setActiveView]);

    const hasViews = views.length > 0;
    const hasCues = cues.length > 0;

    // Don't render at all if no content
    if (!hasViews && !hasCues) return null;

    return (
        <div className="absolute bottom-4 left-4 z-40 pointer-events-auto" data-ui-element>
            <div className="flex items-end gap-1.5">
                {/* Main Panel */}
                {!collapsed && (
                    <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-3 flex flex-col gap-3 animate-fade-in">
                        {/* Cues Section */}
                        {(hasCues || clientEditMode) && (
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">Cues</div>
                                <div className="flex flex-wrap gap-1">
                                    {cues.map((cue) => (
                                        editingCueId === cue.id ? (
                                            <input
                                                key={cue.id}
                                                autoFocus
                                                value={editingCueName}
                                                onChange={(e) => setEditingCueName(e.target.value)}
                                                onBlur={() => { if (editingCueName.trim()) renameCue(cue.id, editingCueName.trim()); setEditingCueId(null); }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { if (editingCueName.trim()) renameCue(cue.id, editingCueName.trim()); setEditingCueId(null); }
                                                    if (e.key === 'Escape') setEditingCueId(null);
                                                }}
                                                className="h-8 w-20 px-2 rounded-lg text-xs bg-gray-900 border border-amber-500 text-white focus:outline-none"
                                            />
                                        ) : (
                                        <button
                                            key={cue.id}
                                            onClick={() => applyCue(cue.id)}
                                            onDoubleClick={(e) => {
                                                if (!clientEditMode) return;
                                                e.stopPropagation();
                                                setEditingCueId(cue.id); setEditingCueName(cue.name);
                                            }}
                                            className={`
                                                min-w-[32px] h-8 px-2.5 rounded-lg 
                                                text-xs font-medium transition-all duration-200
                                                ${activeCueId === cue.id
                                                    ? 'bg-white/20 text-white ring-1 ring-white/30'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                                }
                                            `}
                                            title={clientEditMode ? `雙擊改名 · Cue ${cue.order}: ${cue.name}` : `Cue ${cue.order}: ${cue.name}`}
                                        >
                                            {cue.name}
                                        </button>
                                        )
                                    ))}
                                    {/* 編輯模式:新增 cue / 更新當前 cue */}
                                    {clientEditMode && (
                                        <>
                                            <button
                                                onClick={() => addCue(`Cue ${cues.length + 1}`)}
                                                className="h-8 px-2.5 rounded-lg text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
                                                title="以當前場景狀態新增 cue"
                                            >+ 新增</button>
                                            {activeCueId && (
                                                <button
                                                    onClick={() => { if (confirm('以當前機關/場景狀態覆蓋此 cue?')) updateCue(activeCueId); }}
                                                    className="h-8 px-2.5 rounded-lg text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
                                                    title="把當前機關數值與場景狀態存進選中的 cue"
                                                >↻ 更新此 cue</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Views Section */}
                        {(hasViews || clientEditMode) && (
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <circle cx="12" cy="13" r="3" />
                                    </svg>
                                    視角
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {views.map((view, index) => (
                                        <button
                                            key={view.id}
                                            onClick={() => setActiveView(view.id)}
                                            onDoubleClick={(e) => {
                                                if (!clientEditMode) return;
                                                e.stopPropagation();
                                                const name = window.prompt('視角名稱', view.name);
                                                if (name && name.trim()) renameView(view.id, name.trim());
                                            }}
                                            className={`
                                                relative w-12 h-12 rounded-lg overflow-hidden
                                                transition-all duration-200
                                                ${activeViewId === view.id
                                                    ? 'ring-2 ring-gray-300 scale-110'
                                                    : 'ring-1 ring-white/10 hover:ring-white/30'}
                                                bg-gray-800 hover:bg-gray-700
                                            `}
                                            title={clientEditMode ? `雙擊改名 · ${view.name}` : view.name}
                                        >
                                            {view.thumbnail_url ? (
                                                <img
                                                    src={view.thumbnail_url}
                                                    alt={view.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                                                    {index + 1}
                                                </span>
                                            )}
                                            {activeViewId === view.id && (
                                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-300 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                    {/* 編輯模式:擷取當前畫面為新視角 */}
                                    {clientEditMode && (
                                        <button
                                            onClick={() => triggerCapture()}
                                            className="w-12 h-12 rounded-lg text-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 flex items-center justify-center"
                                            title="以當前畫面新增視角"
                                        >+</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Collapse/Expand Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`
                        w-8 h-8 rounded-lg flex items-center justify-center
                        bg-black/40 backdrop-blur-md border border-white/10
                        hover:bg-white/10 transition-all duration-200
                        ${collapsed ? 'mb-0' : 'mb-0'}
                    `}
                    title={collapsed ? '展開面板' : '收合面板'}
                >
                    {collapsed ? (
                        /* Grid/layout icon when collapsed */
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                    ) : (
                        /* Minimize/dash icon when expanded */
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}
