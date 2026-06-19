'use client';

import { useStore, NullNode, RigControl, RigType, RigAxis, RIG_COLORS, DEFAULT_RIG_COLOR, rigColorRgb } from '@/store/useStore';
import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { isSelfOrDescendant, objectWorldPosition, worldPosToLocal } from '@/lib/rig-utils';
import { RigIcon, NullIcon, LinkIcon, RotateIcon, TranslateIcon, PickIcon } from '@/components/ui/icons';
import { getObjectLabel } from '@/lib/object-utils';
import { getRigStep } from '@/lib/rig-utils';

const AXIS_OPTIONS: RigAxis[] = ['x', 'y', 'z'];

/**
 * 數字輸入:本地暫存文字,blur / Enter 時才提交,
 * 避免輸入負號或小數點過程被 parseFloat 打斷。
 */
function NumberField({
    value, onCommit, className = '', placeholder = ''
}: {
    value: number;
    onCommit: (v: number) => void;
    className?: string;
    placeholder?: string;
}) {
    const [text, setText] = useState(String(value));

    useEffect(() => {
        setText(String(value));
    }, [value]);

    const commit = () => {
        const parsed = parseFloat(text);
        if (Number.isFinite(parsed)) {
            onCommit(parsed);
        } else {
            setText(String(value)); // 還原
        }
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className={`bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none ${className}`}
        />
    );
}

// ===== Null 管理 =====

function NullSection() {
    const nulls = useStore((s) => s.nulls);
    const stageObjects = useStore((s) => s.stageObjects);
    const addNull = useStore((s) => s.addNull);
    const updateNull = useStore((s) => s.updateNull);
    const removeNull = useStore((s) => s.removeNull);
    const selectedNullId = useStore((s) => s.selectedNullId);
    const setSelectedNull = useStore((s) => s.setSelectedNull);
    const setGizmoEnabled = useStore((s) => s.setGizmoEnabled);
    const gizmoEnabled = useStore((s) => s.gizmoEnabled);

    // 在場景中選取此 Null:自動開啟 gizmo 並選取(出現 TransformControls 可拖曳)
    const handlePick = (node: NullNode) => {
        if (selectedNullId === node.id) {
            setSelectedNull(null);
            return;
        }
        if (!gizmoEnabled) setGizmoEnabled(true);
        setSelectedNull(node.id);
    };

    const [alignTarget, setAlignTarget] = useState<Record<string, string>>({}); // nullId → objectId

    const handleAdd = () => {
        const node: NullNode = {
            id: `null_${Date.now()}`,
            name: `Null ${nulls.length + 1}`,
            parentId: null,
            pos: [0, 0, 0],
            rot: [0, 0, 0],
        };
        addNull(node);
    };

    const handleDelete = (node: NullNode) => {
        const childCount =
            nulls.filter(n => n.parentId === node.id).length +
            stageObjects.filter(o => o.parentId === node.id).length;
        const msg = childCount > 0
            ? `刪除 Null「${node.name}」?\n${childCount} 個子節點會保持世界位置掛回上一層,指向它的機關會一併刪除。`
            : `刪除 Null「${node.name}」?指向它的機關會一併刪除。`;
        if (confirm(msg)) removeNull(node.id);
    };

    // 「以物件位置為軸心」:取目標物件 instance[0] 世界位置,轉回此 Null 的 parent 空間
    const handleAlign = (node: NullNode) => {
        const objId = alignTarget[node.id];
        const obj = stageObjects.find(o => o.id === objId);
        if (!obj) return;
        const worldPos = objectWorldPosition(obj, nulls);
        const localPos = worldPosToLocal(worldPos, node.parentId, nulls);
        updateNull(node.id, { pos: localPos });
    };

    return (
        <div className="space-y-2">
            <button
                onClick={handleAdd}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded py-1.5 text-xs font-semibold"
            >
                + 新增 Null(軸心節點)
            </button>

            {nulls.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-2">
                    Null 是旋轉軸心。建立後把物件掛載到它底下,旋轉機關就以它的位置為軸。
                </p>
            )}
            {nulls.length > 0 && (
                <p className="text-[10px] text-gray-500">
                    場景中的八面體虛影即為 Null。點「選取」(或開啟 Gizmo 後直接點虛影)可拖曳調整軸心位置。
                </p>
            )}

            {nulls.map((node) => (
                <div key={node.id} className={`bg-gray-800 rounded p-2 space-y-2 transition-all ${selectedNullId === node.id ? 'ring-1 ring-violet-500' : ''}`}>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={node.name}
                            onChange={(e) => updateNull(node.id, { name: e.target.value })}
                            className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none"
                        />
                        <button
                            onClick={() => handlePick(node)}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 flex-shrink-0 transition-colors ${selectedNullId === node.id
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            title={selectedNullId === node.id ? '取消選取' : '在場景中選取並拖曳調整位置'}
                        >
                            <PickIcon className="w-3 h-3" />
                            {selectedNullId === node.id ? '選取中' : '選取'}
                        </button>
                        <button
                            onClick={() => handleDelete(node)}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-900/40 rounded flex-shrink-0"
                        >
                            刪除
                        </button>
                    </div>

                    {/* Parent 選擇(排除自身與後代防循環) */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Parent</span>
                        <select
                            value={node.parentId ?? ''}
                            onChange={(e) => updateNull(node.id, { parentId: e.target.value || null })}
                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none"
                        >
                            <option value="">（場景根）</option>
                            {nulls
                                .filter(n => !isSelfOrDescendant(nulls, node.id, n.id))
                                .map(n => (
                                    <option key={n.id} value={n.id}>{n.name}</option>
                                ))}
                        </select>
                    </div>

                    {/* 位置(= 軸心) */}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">位置</span>
                        {([0, 1, 2] as const).map(axis => (
                            <NumberField
                                key={axis}
                                value={Math.round(node.pos[axis] * 1000) / 1000}
                                onCommit={(v) => {
                                    const pos = [...node.pos] as [number, number, number];
                                    pos[axis] = v;
                                    updateNull(node.id, { pos });
                                }}
                                className="w-full min-w-0"
                                placeholder={'XYZ'[axis]}
                            />
                        ))}
                    </div>

                    {/* 旋轉(UI 用度,store 存弧度) */}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">旋轉°</span>
                        {([0, 1, 2] as const).map(axis => (
                            <NumberField
                                key={axis}
                                value={Math.round(THREE.MathUtils.radToDeg(node.rot[axis]) * 10) / 10}
                                onCommit={(v) => {
                                    const rot = [...node.rot] as [number, number, number];
                                    rot[axis] = THREE.MathUtils.degToRad(v);
                                    updateNull(node.id, { rot });
                                }}
                                className="w-full min-w-0"
                                placeholder={'XYZ'[axis]}
                            />
                        ))}
                    </div>

                    {/* 以物件位置為軸心 */}
                    {stageObjects.length > 0 && (
                        <div className="flex items-center gap-1">
                            <select
                                value={alignTarget[node.id] ?? ''}
                                onChange={(e) => setAlignTarget(prev => ({ ...prev, [node.id]: e.target.value }))}
                                className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-white focus:border-violet-500 focus:outline-none"
                            >
                                <option value="">選擇物件…</option>
                                {stageObjects.map(o => (
                                    <option key={o.id} value={o.id}>{getObjectLabel(o)}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => handleAlign(node)}
                                disabled={!alignTarget[node.id]}
                                className="text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-2 py-1 rounded flex-shrink-0"
                                title="把此 Null 移到所選物件的位置"
                            >
                                對齊
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ===== 物件掛載 =====

function ParentingSection() {
    const nulls = useStore((s) => s.nulls);
    const stageObjects = useStore((s) => s.stageObjects);
    const setObjectParent = useStore((s) => s.setObjectParent);
    const updateObject = useStore((s) => s.updateObject);

    if (stageObjects.length === 0) {
        return <p className="text-gray-500 text-xs text-center py-2">尚未上傳任何模型</p>;
    }

    return (
        <div className="space-y-1.5">
            <p className="text-[10px] text-gray-500 mb-1">
                掛載時物件會保持原位(座標自動轉換),之後跟著 Null 一起動。
                <span className="text-gray-600">「×-1」= 鏡像跟隨:機關偏移反向作用,適合對稱機關(左右對開門掛同一個 Null,各往反方向開)。</span>
            </p>
            {stageObjects.map(obj => (
                <div key={obj.id} className="flex items-center gap-2 bg-gray-800 rounded p-2">
                    <span className="text-xs text-gray-300 truncate flex-1" title={getObjectLabel(obj)}>
                        {getObjectLabel(obj)}
                    </span>
                    {/* ×-1 鏡像跟隨(掛載於 Null 時可用) */}
                    {obj.parentId && nulls.some(n => n.id === obj.parentId) && (
                        <button
                            onClick={() => updateObject(obj.id, { rigMirror: !obj.rigMirror })}
                            className={`text-[10px] px-1.5 py-1 rounded font-mono flex-shrink-0 transition-colors ${obj.rigMirror
                                ? 'bg-amber-600/80 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'}`}
                            title={obj.rigMirror ? '鏡像跟隨中:機關偏移 ×-1 作用' : '切換為鏡像跟隨(機關偏移 ×-1)'}
                        >
                            ×-1
                        </button>
                    )}
                    <select
                        value={obj.parentId ?? ''}
                        onChange={(e) => setObjectParent(obj.id, e.target.value || null)}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none w-32 flex-shrink-0"
                    >
                        <option value="">（無）</option>
                        {nulls.map(n => (
                            <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                    </select>
                </div>
            ))}
        </div>
    );
}

// ===== 機關定義 =====

// target 編碼:'null:{id}' 或 'object:{id}:{instanceIndex}'
function encodeTarget(rig: Pick<RigControl, 'targetType' | 'targetId' | 'instanceIndex'>): string {
    return rig.targetType === 'null'
        ? `null:${rig.targetId}`
        : `object:${rig.targetId}:${rig.instanceIndex ?? 0}`;
}

function decodeTarget(key: string): Pick<RigControl, 'targetType' | 'targetId' | 'instanceIndex'> | null {
    const parts = key.split(':');
    if (parts[0] === 'null' && parts[1]) return { targetType: 'null', targetId: parts[1], instanceIndex: 0 };
    if (parts[0] === 'object' && parts[1]) return { targetType: 'object', targetId: parts[1], instanceIndex: parseInt(parts[2] ?? '0', 10) || 0 };
    return null;
}

function RigsSection() {
    const nulls = useStore((s) => s.nulls);
    const stageObjects = useStore((s) => s.stageObjects);
    const rigs = useStore((s) => s.rigs);
    const rigValues = useStore((s) => s.rigValues);
    const addRig = useStore((s) => s.addRig);
    const updateRig = useStore((s) => s.updateRig);
    const removeRig = useStore((s) => s.removeRig);
    const setRigValue = useStore((s) => s.setRigValue);
    const reorderRigs = useStore((s) => s.reorderRigs);

    // 新增表單 state
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [targetKey, setTargetKey] = useState('');
    const [type, setType] = useState<RigType>('rotation');
    const [axis, setAxis] = useState<RigAxis>('y');
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(90);
    const [defaultValue, setDefaultValue] = useState(0);
    const [color, setColor] = useState<string>(DEFAULT_RIG_COLOR);
    const [formError, setFormError] = useState('');

    // 拖拉排序 state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    // 長按刪除(沿用專案慣例)
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleLongPressStart = (id: string) => {
        setDeletingId(id);
        deleteTimerRef.current = setTimeout(() => {
            removeRig(id);
            setDeletingId(null);
        }, 800);
    };
    const handleLongPressEnd = () => {
        if (deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = null;
        }
        setDeletingId(null);
    };

    const targetName = (rig: RigControl): string => {
        if (rig.targetType === 'null') {
            const n = nulls.find(n => n.id === rig.targetId);
            return n ? `◇ ${n.name}` : '⚠️ 目標已刪除';
        }
        const o = stageObjects.find(o => o.id === rig.targetId);
        if (!o) return '⚠️ 目標已刪除';
        const idx = o.instances.length > 1 ? ` #${(rig.instanceIndex ?? 0) + 1}` : '';
        return `${getObjectLabel(o)}${idx}`;
    };

    const handleSubmit = () => {
        const target = decodeTarget(targetKey);
        if (!name.trim()) { setFormError('請輸入機關名稱'); return; }
        if (!target) { setFormError('請選擇目標'); return; }

        const isVis = type === 'visibility';
        if (!isVis) {
            if (!(min < max)) { setFormError('下限必須小於上限'); return; }
            if (defaultValue < min || defaultValue > max) { setFormError('預設值必須在上下限之間'); return; }
        }

        const rig: RigControl = {
            id: `rig_${Date.now()}`,
            name: name.trim(),
            targetType: target.targetType,
            targetId: target.targetId,
            instanceIndex: target.instanceIndex ?? 0,
            type,
            axis,
            // visibility: 固定 0~1,預設值即「初始是否顯示」
            min: isVis ? 0 : min,
            max: isVis ? 1 : max,
            step: getRigStep(type),
            defaultValue: isVis ? defaultValue : defaultValue,
            color,
        };
        addRig(rig);

        // 重置表單
        setName('');
        setFormError('');
        setShowForm(false);
    };

    // 切換類型時給合理的預設範圍
    const handleTypeChange = (t: RigType) => {
        setType(t);
        if (t === 'rotation') { setMin(0); setMax(90); setDefaultValue(0); }
        else if (t === 'translation') { setMin(0); setMax(3); setDefaultValue(0); }
        else { setMin(0); setMax(1); setDefaultValue(1); } // visibility:預設顯示
    };

    const unit = (t: RigType) => t === 'rotation' ? '°' : t === 'translation' ? 'm' : '';

    return (
        <div className="space-y-2">
            <button
                onClick={() => setShowForm(!showForm)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-1.5 text-xs font-semibold"
            >
                {showForm ? '收合表單' : '+ 新增機關'}
            </button>

            {/* 新增表單 */}
            {showForm && (
                <div className="bg-gray-800 rounded p-2 space-y-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="機關名稱,如「升降台高度」"
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                    />

                    <select
                        value={targetKey}
                        onChange={(e) => setTargetKey(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                    >
                        <option value="">選擇目標…</option>
                        {nulls.length > 0 && (
                            <optgroup label="Null 節點(建議:旋轉機關)">
                                {nulls.map(n => (
                                    <option key={n.id} value={`null:${n.id}`}>◇ {n.name}</option>
                                ))}
                            </optgroup>
                        )}
                        {stageObjects.length > 0 && (
                            <optgroup label="物件 Instance">
                                {stageObjects.flatMap(o =>
                                    o.instances.map((_, i) => (
                                        <option key={`${o.id}:${i}`} value={`object:${o.id}:${i}`}>
                                            {getObjectLabel(o)}{o.instances.length > 1 ? ` #${i + 1}` : ''}
                                        </option>
                                    ))
                                )}
                            </optgroup>
                        )}
                    </select>

                    {/* 類型 */}
                    <div className="flex gap-1">
                        {(['rotation', 'translation', 'visibility'] as RigType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => handleTypeChange(t)}
                                className={`flex-1 py-1 rounded text-xs ${type === t ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                <span className="flex items-center justify-center gap-1">
                                    {t === 'rotation' ? <><RotateIcon className="w-3 h-3" />旋轉</>
                                     : t === 'translation' ? <><TranslateIcon className="w-3 h-3" />位移</>
                                     : <>👁 顯示</>}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* 軸向(visibility 不需要)*/}
                    {type !== 'visibility' && (
                        <div className="flex gap-1">
                            {AXIS_OPTIONS.map(a => (
                                <button
                                    key={a}
                                    onClick={() => setAxis(a)}
                                    className={`flex-1 py-1 rounded text-xs uppercase ${axis === a ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    {a} 軸
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 顏色分類 */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 flex-shrink-0">顏色</span>
                        {RIG_COLORS.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setColor(c.id)}
                                title={c.label}
                                className="w-5 h-5 rounded-full flex-shrink-0 transition-transform hover:scale-110"
                                style={{
                                    background: `rgba(${c.rgb}, 0.55)`,
                                    boxShadow: color === c.id ? `0 0 0 2px rgba(${c.rgb}, 1)` : 'none',
                                }}
                            />
                        ))}
                    </div>

                    {/* 行程設定:visibility 改為單一「初始狀態」開關 */}
                    {type === 'visibility' ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">初始狀態</span>
                            <button
                                onClick={() => setDefaultValue(defaultValue >= 0.5 ? 0 : 1)}
                                className={`flex-1 py-1.5 rounded text-xs font-semibold ${defaultValue >= 0.5 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            >
                                {defaultValue >= 0.5 ? '👁 顯示' : '🚫 隱藏'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-gray-500 block">下限 ({unit(type)})</span>
                                <NumberField value={min} onCommit={setMin} className="w-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-gray-500 block">上限 ({unit(type)})</span>
                                <NumberField value={max} onCommit={setMax} className="w-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-gray-500 block">預設值</span>
                                <NumberField value={defaultValue} onCommit={setDefaultValue} className="w-full" />
                            </div>
                        </div>
                    )}

                    {formError && <p className="text-red-400 text-[10px]">{formError}</p>}

                    <button
                        onClick={handleSubmit}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-1.5 rounded text-xs font-semibold"
                    >
                        建立機關
                    </button>
                </div>
            )}

            {/* 機關列表(含即時預覽滑桿) */}
            {rigs.length === 0 && !showForm && (
                <p className="text-gray-500 text-xs text-center py-2">尚未建立任何機關</p>
            )}

            {rigs.map((rig, index) => {
                const value = rigValues[rig.id] ?? rig.defaultValue;
                const isDeleting = deletingId === rig.id;
                const rgb = rigColorRgb(rig.color);
                const isVis = rig.type === 'visibility';
                const isDragOver = overIndex === index && dragIndex !== null && dragIndex !== index;
                return (
                    <div
                        key={rig.id}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
                        onDragEnd={() => {
                            if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
                                reorderRigs(dragIndex, overIndex);
                            }
                            setDragIndex(null); setOverIndex(null);
                        }}
                        className={`bg-gray-800 rounded p-2 space-y-1.5 border-l-[3px] cursor-grab active:cursor-grabbing ${isDeleting ? 'ring-1 ring-red-500' : ''} ${isDragOver ? 'ring-1 ring-violet-400' : ''}`}
                        style={{ borderLeftColor: `rgba(${rgb}, 0.6)`, background: `rgba(${rgb}, 0.08)` }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs flex-shrink-0 select-none" title="拖拉排序">⠿</span>
                            <input
                                type="text"
                                value={rig.name}
                                onChange={(e) => updateRig(rig.id, { name: e.target.value })}
                                className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none"
                            />
                            <button
                                onMouseDown={() => handleLongPressStart(rig.id)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onTouchStart={() => handleLongPressStart(rig.id)}
                                onTouchEnd={handleLongPressEnd}
                                className={`text-xs px-2 py-1 rounded flex-shrink-0 transition-all ${isDeleting ? 'bg-red-600 text-white scale-110' : 'bg-red-900/40 text-red-400 hover:text-red-300'}`}
                                title="長按刪除"
                            >
                                刪除
                            </button>
                        </div>

                        <p className="text-[10px] text-gray-500">
                            {targetName(rig)} · {isVis ? '👁 顯示控制' : `${rig.type === 'rotation' ? '旋轉' : '位移'} ${rig.axis.toUpperCase()} 軸`}
                        </p>

                        {/* 顏色選擇(列表內可改) */}
                        <div className="flex items-center gap-1">
                            {RIG_COLORS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => updateRig(rig.id, { color: c.id })}
                                    title={c.label}
                                    className="w-4 h-4 rounded-full flex-shrink-0 transition-transform hover:scale-110"
                                    style={{
                                        background: `rgba(${c.rgb}, 0.55)`,
                                        boxShadow: (rig.color || 'violet') === c.id ? `0 0 0 2px rgba(${c.rgb}, 1)` : 'none',
                                    }}
                                />
                            ))}
                        </div>

                        {/* 即時預覽:visibility 顯示開關,其餘顯示滑桿 */}
                        {isVis ? (
                            <button
                                onClick={() => setRigValue(rig.id, value >= 0.5 ? 0 : 1)}
                                className={`w-full py-1.5 rounded text-xs font-semibold transition-colors ${value >= 0.5 ? 'text-white' : 'bg-gray-700 text-gray-400'}`}
                                style={value >= 0.5 ? { background: `rgba(${rgb}, 0.7)` } : undefined}
                            >
                                {value >= 0.5 ? '👁 顯示中' : '🚫 已隱藏'}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min={rig.min}
                                    max={rig.max}
                                    step={getRigStep(rig.type)}
                                    value={value}
                                    onChange={(e) => setRigValue(rig.id, parseFloat(e.target.value))}
                                    className="flex-1"
                                    style={{ accentColor: `rgba(${rgb}, 0.9)` }}
                                />
                                <span className="text-xs w-16 text-right flex-shrink-0 font-mono" style={{ color: `rgba(${rgb}, 1)` }}>
                                    {value.toFixed(rig.type === 'translation' ? 2 : 0)}{unit(rig.type)}
                                </span>
                            </div>
                        )}

                        {/* 行程設定(visibility 不需要)*/}
                        {!isVis && (
                        <div className="flex items-center gap-1">
                            <NumberField
                                value={rig.min}
                                onCommit={(v) => updateRig(rig.id, { min: v })}
                                className="w-full min-w-0"
                                placeholder="min"
                            />
                            <span className="text-gray-600 text-xs">~</span>
                            <NumberField
                                value={rig.max}
                                onCommit={(v) => updateRig(rig.id, { max: v })}
                                className="w-full min-w-0"
                                placeholder="max"
                            />
                            <span className="text-[10px] text-gray-500 flex-shrink-0">預設</span>
                            <NumberField
                                value={rig.defaultValue}
                                onCommit={(v) => updateRig(rig.id, { defaultValue: Math.min(Math.max(v, rig.min), rig.max) })}
                                className="w-full min-w-0"
                            />
                        </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ===== 主元件 =====

export function RigEditor() {
    const [tab, setTab] = useState<'nulls' | 'parenting' | 'rigs'>('rigs');

    return (
        <div className="bg-gray-900 text-white rounded-lg p-3 space-y-3">
            <p className="text-[10px] text-gray-500 leading-relaxed">
                流程:建立 Null 設定軸心 → 把物件掛載到 Null → 為 Null 或物件建立機關(命名 + 上下限)。
                分享後客戶端會看到對應的控制滑桿,只能在你設定的範圍內調整。
            </p>

            <div className="flex gap-1">
                {([
                    ['nulls', 'Null', NullIcon],
                    ['parenting', '掛載', LinkIcon],
                    ['rigs', '機關', RigIcon],
                ] as const).map(([key, label, Icon]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 ${tab === key ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'nulls' && <NullSection />}
            {tab === 'parenting' && <ParentingSection />}
            {tab === 'rigs' && <RigsSection />}
        </div>
    );
}
