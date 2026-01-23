'use client';

import { useStore } from '@/store/useStore';
import { useState, useRef, useEffect } from 'react';

export default function CueManager() {
    const cues = useStore((state) => state.cues);
    const activeCueId = useStore((state) => state.activeCueId);
    const addCue = useStore((state) => state.addCue);
    const updateCue = useStore((state) => state.updateCue);
    const removeCue = useStore((state) => state.removeCue);
    const applyCue = useStore((state) => state.applyCue);

    const [isCreating, setIsCreating] = useState(false);
    const [newCueName, setNewCueName] = useState('');

    // Auto-Play State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const CUE_HOLD_DURATION = 3000; // 3 seconds per cue (includes transition time)

    // Auto-Play Logic
    useEffect(() => {
        if (isPlaying && cues.length > 0) {
            // Apply current cue
            applyCue(cues[currentPlayIndex].id);

            // Schedule next cue
            playIntervalRef.current = setTimeout(() => {
                const nextIndex = currentPlayIndex + 1;
                if (nextIndex < cues.length) {
                    setCurrentPlayIndex(nextIndex);
                } else {
                    // Reached end, stop playback
                    setIsPlaying(false);
                    setCurrentPlayIndex(0);
                }
            }, CUE_HOLD_DURATION);
        }

        return () => {
            if (playIntervalRef.current) {
                clearTimeout(playIntervalRef.current);
            }
        };
    }, [isPlaying, currentPlayIndex, cues, applyCue]);

    const handlePlay = () => {
        if (cues.length === 0) return;
        setCurrentPlayIndex(0);
        setIsPlaying(true);
    };

    const handleStop = () => {
        setIsPlaying(false);
        setCurrentPlayIndex(0);
        if (playIntervalRef.current) {
            clearTimeout(playIntervalRef.current);
        }
    };

    const handleCreate = () => {
        if (!newCueName.trim()) return;
        addCue(newCueName);
        setNewCueName('');
        setIsCreating(false);
    };

    const handleUpdate = (id: string, name: string) => {
        const isCue0 = cues.findIndex(c => c.id === id) === 0;

        if (isCue0) {
            if (!confirm(`警告：您正在覆蓋「${name}」(初始設定)。\n確定要變更嗎？`)) {
                return;
            }
        } else {
            if (!confirm(`確定要將目前的狀態更新到「${name}」嗎？`)) {
                return;
            }
        }

        updateCue(id);
    };

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`確定要刪除「${name}」嗎？`)) return;
        removeCue(id);
    };

    return (
        <div className="p-4 space-y-4">
            {/* Auto-Play Controls */}
            {cues.length > 0 && (
                <div className="flex gap-2 p-2 bg-gray-800 rounded-lg">
                    {!isPlaying ? (
                        <button
                            onClick={handlePlay}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold flex items-center justify-center gap-2"
                        >
                            <span>▶</span> 自動播放
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-semibold flex items-center justify-center gap-2 animate-pulse"
                        >
                            <span>■</span> 停止 ({currentPlayIndex + 1}/{cues.length})
                        </button>
                    )}
                </div>
            )}

            {/* Create Button */}
            {isCreating ? (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCueName}
                        onChange={(e) => setNewCueName(e.target.value)}
                        placeholder="場景名稱..."
                        className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 text-sm text-white focus:border-violet-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={!newCueName.trim()}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                    >
                        OK
                    </button>
                    <button
                        onClick={() => setIsCreating(false)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                        X
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                >
                    <span className="text-lg">+</span> 新增場景 (Cue)
                </button>
            )}

            {/* List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cues.length === 0 && (
                    <div className="text-gray-500 text-xs text-center py-4">
                        尚未建立任何場景
                    </div>
                )}

                {cues.map((cue, index) => (
                    <div
                        key={cue.id}
                        className={`group relative p-3 rounded-lg border transition-all ${activeCueId === cue.id
                            ? 'bg-violet-900/40 border-violet-500'
                            : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                            }`}
                    >
                        <div
                            className="flex justify-between items-center cursor-pointer mb-2"
                            onClick={() => applyCue(cue.id)}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${index === 0 ? 'bg-yellow-600/30 text-yellow-400' : 'bg-gray-700 text-gray-400'
                                    }`}>
                                    {index}
                                </span>
                                <span className="text-sm font-medium text-white">{cue.name}</span>
                            </div>
                            {activeCueId === cue.id && (
                                <span className="text-xs text-violet-400 font-bold">ACTIVE</span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 border-t border-gray-700 pt-2 mt-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleUpdate(cue.id, cue.name); }}
                                className="flex-1 text-xs bg-blue-900/30 hover:bg-blue-800 text-blue-200 py-1 rounded border border-blue-800/50"
                                title="將當前舞台狀態覆蓋此 Cue"
                            >
                                覆蓋設定
                            </button>
                            {index !== 0 && ( // Protect Cue 0 from deletion? Proposal didn't stricter forbid data deletion, just warn on overwrite. But usually Cue 0 is foundational. Let's allow delete for flexiblity but maybe hide it for safety? User said overwrite warn. Let's allowing deleting others.
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(cue.id, cue.name); }}
                                    className="text-xs bg-red-900/30 hover:bg-red-800 text-red-200 px-3 py-1 rounded border border-red-800/50"
                                >
                                    刪除
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
