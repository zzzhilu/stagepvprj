import { useStore } from '@/store/useStore';

export function LightingControls() {
    const ambientIntensity = useStore((state) => state.ambientIntensity);
    const directionalIntensity = useStore((state) => state.directionalIntensity);
    const bloomIntensity = useStore((state) => state.bloomIntensity);
    const bloomThreshold = useStore((state) => state.bloomThreshold);
    const setAmbientIntensity = useStore((state) => state.setAmbientIntensity);
    const setDirectionalIntensity = useStore((state) => state.setDirectionalIntensity);
    const setBloomIntensity = useStore((state) => state.setBloomIntensity);
    const setBloomThreshold = useStore((state) => state.setBloomThreshold);

    return (
        <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <h3 className="text-lg font-bold mb-3">💡 全域照明 & 效果</h3>
            </div>

            <div className="p-4 space-y-4">
                {/* Ambient Light Control */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                            環境光 (Ambient)
                        </label>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/20 px-2 py-1 rounded">
                            {ambientIntensity.toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={ambientIntensity}
                        onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">0.0 (暗)</span>
                        <span className="text-xs text-gray-500">3.0 (亮)</span>
                    </div>
                </div>

                {/* Directional Light Control */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                            主光源 (Directional)
                        </label>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/20 px-2 py-1 rounded">
                            {directionalIntensity.toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={directionalIntensity}
                        onChange={(e) => setDirectionalIntensity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">0.0 (暗)</span>
                        <span className="text-xs text-gray-500">5.0 (亮)</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-violet-400 mb-3">✨ Bloom 輝光效果</h4>
                </div>

                {/* Bloom Intensity Control */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                            輝光強度 (Intensity)
                        </label>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/20 px-2 py-1 rounded">
                            {bloomIntensity.toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={bloomIntensity}
                        onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">0.0 (無)</span>
                        <span className="text-xs text-gray-500">2.0 (強)</span>
                    </div>
                </div>

                {/* Bloom Threshold Control */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                            輝光閾值 (Threshold)
                        </label>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/20 px-2 py-1 rounded">
                            {bloomThreshold.toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.2"
                        max="0.9"
                        step="0.05"
                        value={bloomThreshold}
                        onChange={(e) => setBloomThreshold(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">0.2 (大範圍)</span>
                        <span className="text-xs text-gray-500">0.9 (小範圍)</span>
                    </div>
                </div>

                {/* Reset Button */}
                <button
                    onClick={() => {
                        setAmbientIntensity(0.8);
                        setDirectionalIntensity(1.2);
                        setBloomIntensity(0.1);
                        setBloomThreshold(0.7);
                    }}
                    className="w-full mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    🔄 重置預設值
                </button>

                {/* Info */}
                <div className="text-xs text-gray-500 bg-gray-800/50 rounded p-2 mt-3">
                    <p>💡 <strong>環境光</strong>：整體基礎亮度</p>
                    <p className="mt-1">☀️ <strong>主光源</strong>：方向性照明強度</p>
                    <p className="mt-1">✨ <strong>輝光強度</strong>：發光效果強弱</p>
                    <p className="mt-1">🎯 <strong>輝光閾值</strong>：較低=更多物體發光</p>
                </div>
            </div>
        </div>
    );
}
