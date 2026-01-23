'use client';

import { useStore, StageObject } from '@/store/useStore';
import { useState, useEffect } from 'react';

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
                        {obj.model_path.split('/').pop()?.replace('.glb', '') || obj.id.slice(0, 8)}
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

export default function ObjectInspector() {
    const selectedObjectId = useStore((state) => state.selectedObjectId);
    const stageObjects = useStore((state) => state.stageObjects);
    const updateObjectTransform = useStore((state) => state.updateObjectTransform);
    const transformMode = useStore((state) => state.transformMode);
    const setTransformMode = useStore((state) => state.setTransformMode);

    // Local state for inputs to avoid stuttering while typing
    const [localTransform, setLocalTransform] = useState<{
        pos: [number, number, number];
        rot: [number, number, number];
        scale: [number, number, number];
    } | null>(null);

    const selectedObject = stageObjects.find(obj => obj.id === selectedObjectId);

    // Sync local state when selection changes or store updates (if not editing)
    useEffect(() => {
        if (selectedObject && selectedObject.instances[0]) {
            const inst = selectedObject.instances[0];
            setLocalTransform({
                pos: [...inst.pos],
                rot: [...inst.rot],
                scale: [...inst.scale]
            });
        } else {
            setLocalTransform(null);
        }
    }, [selectedObject, selectedObjectId]); // Depend on selectedObject deep change? No, just reference.

    // We also need to listen to store updates if gizmo moves it. 
    // Since useStore returns a new object reference on update, useEffect [selectedObject] should handle it.

    if (!selectedObjectId || !selectedObject || !localTransform) {
        return (
            <div className="p-4 text-gray-500 text-sm italic text-center">
                尚未選取物件
                <br />
                請點擊場景中的模型
            </div>
        );
    }

    const handleChange = (type: 'pos' | 'rot' | 'scale', axis: 0 | 1 | 2, value: string) => {
        const numVal = parseFloat(value);
        if (isNaN(numVal)) return;

        const newTrans = { ...localTransform };

        if (type === 'rot') {
            // Convert degrees to radians for storage? 
            // The store likely uses radians for Three.js. 
            // Wait, existing code usually works with radians in Three.js but degrees in UI.
            // Let's assume store uses Radians (standard). UI shows Degrees.
            const rad = numVal * (Math.PI / 180);
            newTrans[type][axis] = rad;
        } else {
            newTrans[type][axis] = numVal;
        }

        setLocalTransform(newTrans);
        updateObjectTransform(selectedObjectId, newTrans.pos, newTrans.rot, newTrans.scale);
    };

    const toDegrees = (rad: number) => Math.round(rad * (180 / Math.PI));

    return (
        <div className="p-4 space-y-6 bg-gray-900 rounded-lg border border-gray-700">
            <div>
                <h3 className="text-white font-bold mb-1 truncate" title={selectedObject.id}>
                    {selectedObject.model_path.split('/').pop()?.replace('.glb', '') || '未命名物件'}
                </h3>
                <p className="text-xs text-gray-500">ID: {selectedObject.id.slice(0, 8)}</p>
            </div>

            {/* Transform Modes */}
            <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
                <button
                    onClick={() => setTransformMode('translate')}
                    className={`flex-1 py-1 text-xs font-semibold rounded ${transformMode === 'translate' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    移動 (T)
                </button>
                <button
                    onClick={() => setTransformMode('rotate')}
                    className={`flex-1 py-1 text-xs font-semibold rounded ${transformMode === 'rotate' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    旋轉 (R)
                </button>
                <button
                    onClick={() => setTransformMode('scale')}
                    className={`flex-1 py-1 text-xs font-semibold rounded ${transformMode === 'scale' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    縮放 (S)
                </button>
            </div>

            {/* Position */}
            <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">位置 (Position)</label>
                <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis} className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">{axis}</span>
                            <input
                                type="number"
                                step={1}
                                value={Math.round(localTransform.pos[i] * 100) / 100} // Round for display
                                onChange={(e) => handleChange('pos', i as 0 | 1 | 2, e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded px-2 pl-6 py-1 text-xs text-white focus:border-violet-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">旋轉 (Rotation °)</label>
                <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis} className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">{axis}</span>
                            <input
                                type="number"
                                step={1}
                                value={toDegrees(localTransform.rot[i])}
                                onChange={(e) => handleChange('rot', i as 0 | 1 | 2, e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded px-2 pl-6 py-1 text-xs text-white focus:border-violet-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Scale */}
            <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">縮放 (Scale)</label>
                <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis} className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">{axis}</span>
                            <input
                                type="number"
                                step={0.1}
                                value={Math.round(localTransform.scale[i] * 100) / 100}
                                onChange={(e) => handleChange('scale', i as 0 | 1 | 2, e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded px-2 pl-6 py-1 text-xs text-white focus:border-violet-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Link to Parent */}
            <LinkToParentDropdown
                selectedObjectId={selectedObjectId}
                stageObjects={stageObjects}
                currentParentId={selectedObject.parentId}
            />
        </div>
    );
}
