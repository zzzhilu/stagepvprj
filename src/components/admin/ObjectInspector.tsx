'use client';

import { useStore, StageObject } from '@/store/useStore';
import { useState, useEffect } from 'react';

// Helper to get object display name
function getObjectName(obj: StageObject) {
    // If ID is not an auto-generated one (starting with obj_), use it as the name
    // This covers the case of "moving led 1" etc.
    if (!obj.id.startsWith('obj_')) {
        return obj.id;
    }
    // Fallback to filename from URL for generic objects
    try {
        return decodeURIComponent(obj.model_path).split('/').pop()?.split('?')[0].replace('.glb', '') || `Object ${obj.id.slice(0, 6)}`;
    } catch (e) {
        return `Object ${obj.id.slice(0, 6)}`;
    }
}

// Helper component for Link to Parent dropdown
function LinkToParentDropdown({
    selectedObjectId,
    stageObjects,
    currentParentId
}: {
    selectedObjectId: string;
    stageObjects: StageObject[];
    currentParentId?: string;
}) {
    const linkObject = useStore((state) => state.linkObject);

    // Filter out self and already-linked children to prevent circular dependencies
    const availableParents = stageObjects.filter(obj =>
        obj.id !== selectedObjectId && obj.parentId !== selectedObjectId
    );

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        linkObject(selectedObjectId, value === '' ? null : value);
    };

    return (
        <div className="space-y-2 pt-2 border-t border-gray-700">
            <label className="text-xs text-gray-400 font-bold">連結到 (Link to Parent)</label>
            <select
                value={currentParentId || ''}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-violet-500 outline-none"
            >
                <option value="">無 (None)</option>
                {availableParents.map(obj => (
                    <option key={obj.id} value={obj.id}>
                        {getObjectName(obj)}
                    </option>
                ))}
            </select>
            {currentParentId && (
                <p className="text-[10px] text-gray-500">
                    此物件將跟隨父物件移動
                </p>
            )}
        </div>
    );
}

export function ObjectInspector() {
    const stageObjects = useStore((state) => state.stageObjects);
    const selectedObjectId = useStore((state) => state.selectedObjectId);
    const setSelectedObject = useStore((state) => state.setSelectedObject);
    const transformMode = useStore((state) => state.transformMode);
    const setTransformMode = useStore((state) => state.setTransformMode);
    const updateObjectTransform = useStore((state) => state.updateObjectTransform);

    const selectedObject = stageObjects.find(o => o.id === selectedObjectId);

    if (stageObjects.length === 0) {
        return (
            <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-bold text-white">物件屬性 (Object Inspector)</h3>
                <p className="text-xs text-gray-500">尚未載入任何模型</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">物件屬性 (Object Inspector)</h3>

            {/* Object List */}
            <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">選擇物件 (Select Object)</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                    {stageObjects.map((obj) => (
                        <button
                            key={obj.id}
                            onClick={() => setSelectedObject(obj.id)}
                            className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${selectedObjectId === obj.id
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{getObjectName(obj)}</span>
                                {obj.parentId && (
                                    <span className="text-[10px] opacity-60 flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> 已連結</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Selected Object Details */}
            {selectedObject && selectedObject.instances[0] && (
                <>
                    <div className="border-t border-gray-700 pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-violet-400">
                                {getObjectName(selectedObject)}
                            </h4>
                        </div>

                        {/* Transform Mode Toggle */}
                        <div className="flex gap-1 bg-gray-800 p-1 rounded">
                            <button
                                onClick={() => setTransformMode('translate')}
                                className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors ${transformMode === 'translate'
                                    ? 'bg-violet-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                移動
                            </button>
                            <button
                                onClick={() => setTransformMode('rotate')}
                                className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors ${transformMode === 'rotate'
                                    ? 'bg-violet-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                旋轉
                            </button>
                            <button
                                onClick={() => setTransformMode('scale')}
                                className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors ${transformMode === 'scale'
                                    ? 'bg-violet-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                縮放
                            </button>
                        </div>

                        {/* Position Controls */}
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold">位置 (Position)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[10px] text-gray-500">{axis}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.instances[0].pos[idx].toFixed(2)}
                                            onChange={(e) => {
                                                const newPos = [...selectedObject.instances[0].pos] as [number, number, number];
                                                newPos[idx] = parseFloat(e.target.value) || 0;
                                                updateObjectTransform(
                                                    selectedObject.id,
                                                    newPos,
                                                    selectedObject.instances[0].rot,
                                                    selectedObject.instances[0].scale
                                                );
                                            }}
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rotation Controls */}
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold">旋轉 (Rotation °)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[10px] text-gray-500">{axis}</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={((selectedObject.instances[0].rot[idx] * 180) / Math.PI).toFixed(1)}
                                            onChange={(e) => {
                                                const degrees = parseFloat(e.target.value) || 0;
                                                const radians = (degrees * Math.PI) / 180;
                                                const newRot = [...selectedObject.instances[0].rot] as [number, number, number];
                                                newRot[idx] = radians;
                                                updateObjectTransform(
                                                    selectedObject.id,
                                                    selectedObject.instances[0].pos,
                                                    newRot,
                                                    selectedObject.instances[0].scale
                                                );
                                            }}
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scale Controls */}
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold">縮放 (Scale)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[10px] text-gray-500">{axis}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.instances[0].scale[idx].toFixed(2)}
                                            onChange={(e) => {
                                                const newScale = [...selectedObject.instances[0].scale] as [number, number, number];
                                                newScale[idx] = parseFloat(e.target.value) || 1;
                                                updateObjectTransform(
                                                    selectedObject.id,
                                                    selectedObject.instances[0].pos,
                                                    selectedObject.instances[0].rot,
                                                    newScale
                                                );
                                            }}
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mesh Component Names */}
                        {selectedObject.meshNames && selectedObject.meshNames.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-gray-400 font-bold">模型元件 (Components)</label>
                                    <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{selectedObject.meshNames.length}</span>
                                </div>
                                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                    {selectedObject.meshNames.map((name, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/60 rounded text-[11px] text-gray-300"
                                        >
                                            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25" />
                                            </svg>
                                            <span className="truncate">{name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Link to Parent */}
                        <LinkToParentDropdown
                            selectedObjectId={selectedObject.id}
                            stageObjects={stageObjects}
                            currentParentId={selectedObject.parentId}
                        />
                    </div>
                </>
            )}

            {!selectedObject && (
                <p className="text-xs text-gray-500 text-center py-4">
                    請從上方列表選擇一個物件
                </p>
            )}
        </div>
    );
}



export default ObjectInspector;
