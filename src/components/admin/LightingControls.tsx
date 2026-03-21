import { useStore } from '@/store/useStore';

export function LightingControls() {
    const ambientIntensity = useStore((state) => state.ambientIntensity);
    const directionalIntensity = useStore((state) => state.directionalIntensity);
    const mainLightAzimuth = useStore((state) => state.mainLightAzimuth);
    const mainLightElevation = useStore((state) => state.mainLightElevation);
    const bloomIntensity = useStore((state) => state.bloomIntensity);
    const bloomThreshold = useStore((state) => state.bloomThreshold);
    const setAmbientIntensity = useStore((state) => state.setAmbientIntensity);
    const setDirectionalIntensity = useStore((state) => state.setDirectionalIntensity);
    const setMainLightAzimuth = useStore((state) => state.setMainLightAzimuth);
    const setMainLightElevation = useStore((state) => state.setMainLightElevation);
    const setBloomIntensity = useStore((state) => state.setBloomIntensity);
    const setBloomThreshold = useStore((state) => state.setBloomThreshold);

    return (
        <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> 全域照明 & 效果</h3>
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
                            主光源強度 (Directional)
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

                {/* Main Light Direction Controls */}
                <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        主光源方向
                    </h4>
                </div>

                {/* Azimuth (horizontal rotation) */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                            水平角度 (Azimuth)
                        </label>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/20 px-2 py-1 rounded">
                            {mainLightAzimuth}°
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="360"
                        step="5"
                        value={mainLightAzimuth}
                        onChange={(e) => setMainLightAzimuth(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">0° (前)</span>
                        <span className="text-xs text-gray-500">180° (後)</span>
                        <span className="text-xs text-gray-500">360°</span>
                    </div>
                </div>

                {/* Elevation (vertical angle) */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                            垂直角度 (Elevation)
                        </label>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/20 px-2 py-1 rounded">
                            {mainLightElevation}°
                        </span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={mainLightElevation}
                        onChange={(e) => setMainLightElevation(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">10° (低)</span>
                        <span className="text-xs text-gray-500">90° (正上方)</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> Bloom 輝光效果</h4>
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
                        setMainLightAzimuth(45);
                        setMainLightElevation(55);
                        setBloomIntensity(0.1);
                        setBloomThreshold(0.7);
                    }}
                    className="w-full mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> 重置預設值
                </button>

                {/* Info */}
                <div className="text-xs text-gray-500 bg-gray-800/50 rounded p-2 mt-3">
                    <p><svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> <strong>環境光</strong>：整體基礎亮度</p>
                    <p className="mt-1"><svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> <strong>主光源</strong>：方向性照明強度</p>
                    <p className="mt-1"><svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> <strong>輝光強度</strong>：發光效果強弱</p>
                    <p className="mt-1"><svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> <strong>輝光閾值</strong>：較低=更多物體發光</p>
                </div>
            </div>
        </div>
    );
}
