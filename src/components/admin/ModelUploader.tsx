'use client';

import { useStore, ModelType } from '@/store/useStore';
import { useState, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getMaterialOptions, type MaterialId } from '@/lib/materials';
import { MaterialSelector } from './MaterialSelector';
import { getDRACOLoader } from '@/lib/draco';


interface ParsedModel {
    type: ModelType;
    meshes: THREE.Mesh[];
    count: number;
}

interface CompressionStats {
    originalSize: number;
    compressedSize: number;
    ratio: string;
}

export function ModelUploader() {
    const addObject = useStore((state) => state.addObject);
    const removeObject = useStore((state) => state.removeObject);
    const updateObjectMaterial = useStore((state) => state.updateObjectMaterial);
    const stageObjects = useStore((state) => state.stageObjects);
    const setLoading = useStore((state) => state.setLoading);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // ... (keep existing state)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.glb')) {
            alert('只允許上傳 .glb 格式檔案 (Only .glb files allowed)');
            return;
        }

        setSelectedFile(file); // Store file for upload later

        setLoading(true, enableCompression ? '壓縮模型中...' : '解析模型中...');
        setParsedModels([]);
        setCompressionStats(null);

        try {
            // ... (keep existing validation logic)
            let arrayBuffer = await file.arrayBuffer();
            const dataView = new DataView(arrayBuffer);

            // GLB validation...
            if (dataView.byteLength < 4 || dataView.getUint32(0, true) !== 0x46546C67) {
                alert('無效的 GLB 檔案格式！\n請確保上傳的是正確的 GLB 3D 模型檔案。');
                setLoading(false);
                e.target.value = '';
                return;
            }

            const originalSize = arrayBuffer.byteLength;

            // Compress if enabled
            if (enableCompression) {
                // ... (keep existing compression logic)
                setLoading(true, '使用 Draco 壓縮中...');
                try {
                    const response = await fetch('/api/compress-glb', {
                        method: 'POST',
                        body: arrayBuffer,
                        headers: {
                            'Content-Type': 'application/octet-stream',
                        },
                    });

                    if (response.ok) {
                        const compressedBuffer = await response.arrayBuffer();
                        const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0');
                        const ratio = response.headers.get('X-Compression-Ratio') || '0';

                        setCompressionStats({
                            originalSize,
                            compressedSize,
                            ratio,
                        });

                        arrayBuffer = compressedBuffer;
                        console.log(`Compression: ${originalSize} → ${compressedSize} bytes (${ratio}% reduction)`);
                    } else {
                        console.warn('Compression failed, using original file');
                    }
                } catch (compressionError) {
                    console.warn('Compression error, using original file:', compressionError);
                }
            }

            // Create object URL for local preview
            const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            setModelUrl(url);

            // NB: If we compressed the file, we should update selectedFile to be the compressed one
            // so we upload the smaller version to Cloudinary!
            if (enableCompression && arrayBuffer.byteLength !== originalSize) {
                const compressedFile = new File([blob], file.name, { type: 'model/gltf-binary' });
                setSelectedFile(compressedFile);
            }

            setLoading(true, '載入 3D 模型...');

            // Load and parse (keep existing)
            const loader = new GLTFLoader();
            loader.setDRACOLoader(getDRACOLoader());

            loader.load(
                url,
                (gltf) => {
                    // ... (keep parsing logic)
                    const categorizedMeshes: Map<ModelType, THREE.Mesh[]> = new Map();

                    gltf.scene.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const mesh = child as THREE.Mesh;
                            const type = getModelType(mesh.name);

                            if (type) {
                                if (!categorizedMeshes.has(type)) {
                                    categorizedMeshes.set(type, []);
                                }
                                categorizedMeshes.get(type)!.push(mesh);
                            }
                        }
                    });

                    // Create ParsedModel objects
                    const parsed: ParsedModel[] = [];
                    categorizedMeshes.forEach((meshes, type) => {
                        parsed.push({
                            type,
                            meshes,
                            count: meshes.length
                        });
                    });

                    setParsedModels(parsed);
                    setLoading(false);
                },
                undefined,
                (error) => {
                    console.error('Error loading GLB:', error);
                    alert('載入 GLB 檔案失敗！');
                    setLoading(false);
                    e.target.value = '';
                }
            );
        } catch (error) {
            console.error('Error uploading model:', error);
            alert('上傳失敗！檔案可能已損壞。');
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleConfirmUpload = async () => {
        if (!selectedFile || parsedModels.length === 0) return;

        setLoading(true, '上傳模型至雲端 (Cloudinary)...');

        try {
            // Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('type', 'model'); // 'model' type maps to 'raw' in API

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '上傳失敗');
            }

            const result = await response.json();
            const cloudUrl = result.url;
            console.log('Model uploaded to:', cloudUrl);

            // Create StageObject for each type using cloud URL
            parsedModels.forEach(parsed => {
                const newObject = {
                    id: `obj_${parsed.type}_${Date.now()}`,
                    model_path: cloudUrl, // Use Cloudinary URL!
                    material_id: getDefaultMaterial(parsed.type),
                    type: parsed.type,
                    meshNames: parsed.meshes.map(m => m.name),
                    instances: [
                        {
                            pos: [0, 0, 0] as [number, number, number],
                            rot: [0, 0, 0] as [number, number, number],
                            scale: [1, 1, -1] as [number, number, number]
                        }
                    ]
                };

                addObject(newObject);
            });

            // Clear the UI
            setParsedModels([]);
            setModelUrl('');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Cloud upload failed:', error);
            alert(`雲端上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLongPressStart = (id: string) => {
        setDeletingId(id);
        deleteTimerRef.current = setTimeout(() => {
            removeObject(id);
            setDeletingId(null);
        }, 200);
    };

    const handleLongPressEnd = () => {
        if (deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = null;
        }
        setDeletingId(null);
    };

    // Group objects by type for display
    const groupedObjects = stageObjects.reduce((acc, obj) => {
        if (!acc[obj.type]) {
            acc[obj.type] = [];
        }
        acc[obj.type].push(obj);
        return acc;
    }, {} as Record<ModelType, typeof stageObjects>);

    const typeLabels: Record<ModelType, string> = {
        'venues': '場館 (Venue)',
        'stage': '舞台 (Stage)',
        'static_LED': '靜態LED (Static LED)',
        'moving_LED': '移動LED (Moving LED)',
        'basic_camera': '攝影機 (Camera)'
    };

    return (
        <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <h3 className="text-lg font-bold mb-3">📦 模型上傳</h3>

                <div className="mb-3">
                    <p className="text-xs text-blue-400 mb-2">
                        ℹ️ 上傳包含多個命名部件的 GLB 模型
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                        部件命名規則：moving led / static led / stage / venue
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-violet-500 file:text-white
                        hover:file:bg-violet-600
                        file:cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed
                        mb-3
                    "
                />

                {/* Compression Toggle */}
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enableCompression}
                        onChange={(e) => setEnableCompression(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-500 focus:ring-violet-500"
                    />
                    <span>🗜️ 啟用 Draco 壓縮</span>
                    <span className="text-xs text-yellow-500">(iOS Safari 可能不支援)</span>
                </label>

                {/* Compression Stats */}
                {compressionStats && (
                    <div className="bg-green-900/30 border border-green-700 rounded p-2 mb-3">
                        <p className="text-xs text-green-400 font-semibold mb-1">✅ 壓縮完成</p>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">原始大小:</span>
                            <span className="text-gray-300">{(compressionStats.originalSize / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">壓縮後:</span>
                            <span className="text-green-400">{(compressionStats.compressedSize / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">節省:</span>
                            <span className="text-green-400 font-bold">{compressionStats.ratio}%</span>
                        </div>
                    </div>
                )}

                {/* Loading indicator removed as it's now global */}

                {/* Parsed Models Preview */}
                {parsedModels.length > 0 && (
                    <div className="bg-gray-900 rounded p-3 mb-3">
                        <h4 className="text-sm font-semibold text-green-400 mb-2">
                            ✅ 解析完成！發現 {parsedModels.length} 種類型：
                        </h4>
                        <div className="space-y-1 mb-3">
                            {parsedModels.map((parsed, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-gray-800 p-2 rounded">
                                    <span className="text-gray-300">{typeLabels[parsed.type]}</span>
                                    <span className="text-blue-400 font-mono">{parsed.count} 個部件</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleConfirmUpload}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-semibold transition-colors"
                        >
                            確認上傳
                        </button>
                    </div>
                )}

                <p className="text-xs text-gray-500">
                    ℹ️ 所有模型將自動反轉 Z 軸
                </p>
            </div>

            {/* Uploaded Models List */}
            <div className="p-4 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-300">已載入的模型</h4>
                    <span className="text-xs text-gray-500">
                        共 {Object.keys(groupedObjects).length} 種類型
                    </span>
                </div>

                {stageObjects.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">尚未上傳任何模型</p>
                ) : (
                    <div className="space-y-2">
                        {Object.entries(groupedObjects).map(([type, objects]) => (
                            <div key={type} className="bg-gray-800 rounded p-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-violet-400">
                                        {typeLabels[type as ModelType]}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {objects.length} 項
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {objects.map(obj => {
                                        const displayName = obj.model_path.split('/').pop()?.substring(0, 30) || obj.id;
                                        const isDeleting = deletingId === obj.id;
                                        return (
                                            <div key={obj.id} className="p-2 bg-gray-900/30 rounded hover:bg-gray-900/50 transition-colors group">
                                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                                    <span className="truncate flex-1">{displayName}</span>
                                                    <button
                                                        onMouseDown={() => handleLongPressStart(obj.id)}
                                                        onMouseUp={handleLongPressEnd}
                                                        onMouseLeave={handleLongPressEnd}
                                                        onTouchStart={() => handleLongPressStart(obj.id)}
                                                        onTouchEnd={handleLongPressEnd}
                                                        className={`ml-2 opacity-0 group-hover:opacity-100 transition-all relative ${isDeleting ? 'text-red-500 scale-110' : 'text-red-400 hover:text-red-300'
                                                            }`}
                                                        title="長按 1 秒刪除"
                                                    >
                                                        {isDeleting && (
                                                            <div className="absolute inset-0 border-2 border-red-500 rounded animate-ping"></div>
                                                        )}
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <MaterialSelector
                                                    currentMaterial={obj.material_id}
                                                    onChange={(materialId) => handleMaterialChange(obj.id, materialId)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
