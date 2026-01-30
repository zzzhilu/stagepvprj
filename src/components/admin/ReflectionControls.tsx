'use client';

import { useStore } from '@/store/useStore';

export function ReflectionControls() {
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const reflectionMirror = useStore((state) => state.reflectionMirror);
    const reflectionBlur = useStore((state) => state.reflectionBlur);
    const reflectionMetalness = useStore((state) => state.reflectionMetalness);
    const setReflectionMirror = useStore((state) => state.setReflectionMirror);
    const setReflectionBlur = useStore((state) => state.setReflectionBlur);
    const setReflectionMetalness = useStore((state) => state.setReflectionMetalness);

    if (!perfectRenderEnabled) return null;

    return (
        <div className="bg-gray-900 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
                <span>🔮</span> 反射設定
            </h4>

            {/* Mirror Strength */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">鏡面強度</span>
                    <span className="text-xs text-white font-mono bg-gray-800 px-2 py-0.5 rounded">
                        {reflectionMirror.toFixed(2)}
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={reflectionMirror}
                    onChange={(e) => setReflectionMirror(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
            </div>

            {/* Blur Amount */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">模糊程度</span>
                    <span className="text-xs text-white font-mono bg-gray-800 px-2 py-0.5 rounded">
                        {reflectionBlur}
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={reflectionBlur}
                    onChange={(e) => setReflectionBlur(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
            </div>

            {/* Metalness */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">地板金屬感</span>
                    <span className="text-xs text-white font-mono bg-gray-800 px-2 py-0.5 rounded">
                        {reflectionMetalness.toFixed(2)}
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={reflectionMetalness}
                    onChange={(e) => setReflectionMetalness(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
            </div>
        </div>
    );
}
