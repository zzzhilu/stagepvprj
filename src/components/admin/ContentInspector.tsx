import { useStore } from '@/store/useStore';
import { useState, useEffect } from 'react';

export function ContentInspector() {
    const activeContentId = useStore((state) => state.activeContentId);
    const contentTextures = useStore((state) => state.contentTextures);
    const updateContentTexture = useStore((state) => state.updateContentTexture);

    const activeTexture = contentTextures.find(t => t.id === activeContentId);

    // Local state for smooth input handling before committing to store
    const [localState, setLocalState] = useState({
        targetNodeId: '',
        width: 0,
        height: 0,
        x: 0,
        y: 0
    });

    // Sync local state when active texture changes
    useEffect(() => {
        if (activeTexture) {
            setLocalState({
                targetNodeId: activeTexture.targetNodeId || '',
                width: activeTexture.width || 0,
                height: activeTexture.height || 0,
                x: activeTexture.x || 0,
                y: activeTexture.y || 0
            });
        }
    }, [activeTexture?.id, activeTexture?.targetNodeId, activeTexture?.width, activeTexture?.height, activeTexture?.x, activeTexture?.y]);

    if (!activeTexture) return null;

    // TODO: 媒體佈局設定功能尚未完善，暫時隱藏，避免誤觸。待往後開發完善後再開啟。
    return null;

    const handleUpdate = (updates: Partial<typeof localState>) => {
        if (!activeTexture) return;

        const newState = { ...localState, ...updates };
        setLocalState(newState);
        
        updateContentTexture(activeTexture.id, {
            targetNodeId: newState.targetNodeId,
            width: newState.width,
            height: newState.height,
            x: newState.x,
            y: newState.y
        });
    };

    return (
        <div className="bg-gray-800 p-4 border-t border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    媒體佈局設定 (多畫面投影)
                </h3>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">正在設定</label>
                    <div className="text-sm text-gray-200 bg-gray-900 px-2 py-1 rounded truncate">
                        {activeTexture.name}
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">目標螢幕 ID (Target Screen ID)</label>
                    <input
                        type="text"
                        value={localState.targetNodeId}
                        onChange={(e) => handleUpdate({ targetNodeId: e.target.value })}
                        placeholder="請輸入螢幕的 ID 或名稱"
                        className="w-full bg-gray-700 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-gray-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">X 座標位置</label>
                        <input
                            type="number"
                            value={localState.x}
                            onChange={(e) => handleUpdate({ x: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Y 座標位置</label>
                        <input
                            type="number"
                            value={localState.y}
                            onChange={(e) => handleUpdate({ y: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">寬度 (Width)</label>
                        <input
                            type="number"
                            value={localState.width}
                            onChange={(e) => handleUpdate({ width: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">高度 (Height)</label>
                        <input
                            type="number"
                            value={localState.height}
                            onChange={(e) => handleUpdate({ height: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                </div>
            </div>
            
            <p className="text-[10px] text-gray-500 mt-3">
                提示：選定螢幕 ID 後可將這支媒體對應到該螢幕上進行特定座標裁切播放。
            </p>
        </div>
    );
}

export default ContentInspector;
