import { useGLTF } from '@react-three/drei';
import { StageObject, useStore, rectToUv } from '@/store/useStore';
import * as THREE from 'three';
import { createMaterial, createPerfectMaterial, MATERIAL_LIBRARY, createMeshLEDAlphaMap, applyMaterialOverrides } from '@/lib/materials';
import { useMemo, useEffect, useState, useRef, forwardRef } from 'react';
import { globalVideoElement } from './VideoManager';
import { useFrame } from '@react-three/fiber';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { rigDelta, rigVisibility, addVec3 } from '@/lib/rig-utils';
import { getObjectDisplayName } from '@/lib/object-utils';

// [效能] useFrame 每幀重用的臨時物件(單執行緒,跨實例共享安全);消除每幀 new 造成的 GC 卡頓
const _tmpBasePos = new THREE.Vector3();
const _tmpBaseRot = new THREE.Euler();
const _tmpTargetPos = new THREE.Vector3();
const _tmpTargetRot = new THREE.Euler();
const _tmpCurQuat = new THREE.Quaternion();
const _tmpTgtQuat = new THREE.Quaternion();

// Calculate lerp speed based on distance (0.5s - 1.5s)
function calculateLerpSpeed(distance: number): number {
    const minDuration = 0.5;
    const maxDuration = 1.5;
    const duration = Math.min(maxDuration, Math.max(minDuration, distance * 0.1));
    return 1 / duration;
}

// Helper to compute final position with parent offset
function computeWorldTransform(
    object: StageObject,
    allObjects: StageObject[]
): { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] } {
    const inst = object.instances[0] || { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };

    if (!object.parentId) {
        return { pos: inst.pos, rot: inst.rot, scale: inst.scale };
    }

    const parent = allObjects.find(o => o.id === object.parentId);
    if (!parent || !parent.instances[0]) {
        return { pos: inst.pos, rot: inst.rot, scale: inst.scale };
    }

    const parentInst = parent.instances[0];

    // Add parent offset to child position
    const worldPos: [number, number, number] = [
        parentInst.pos[0] + inst.pos[0],
        parentInst.pos[1] + inst.pos[1],
        parentInst.pos[2] + inst.pos[2]
    ];

    // Add parent rotation to child rotation
    const worldRot: [number, number, number] = [
        parentInst.rot[0] + inst.rot[0],
        parentInst.rot[1] + inst.rot[1],
        parentInst.rot[2] + inst.rot[2]
    ];

    return { pos: worldPos, rot: worldRot, scale: inst.scale };
}

const globalImageTextureCache: Record<string, THREE.Texture> = {};
const globalGifCache: Record<string, {
    fullFrames: { imageData: ImageData; delay: number }[];
    gifWidth: number;
    gifHeight: number;
}> = {};

export const StageObjectRenderer = forwardRef<THREE.Group, {
    object: StageObject;
    onClick?: (e: any) => void;
    envMap?: THREE.CubeTexture | THREE.Texture | null;
}>(({ object, onClick, envMap }, forwardedRef) => {
    const renderMode = useStore((state) => state.renderMode);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const stageObjects = useStore((state) => state.stageObjects);
    const floorPlanTextureUrl = useStore((state) => state.floorPlanTextureUrl);
    const cameraStreamActive = useStore((state) => state.cameraStreamActive);
    const setHoveredObjectName = useStore((state) => state.setHoveredObjectName);
    const cameraStreamMode = useStore((state) => state.cameraStreamMode);
    const screenCropRatio = useStore((state) => state.screenCropRatio);
    const screenCropOverride = useStore((state) => state.screenCropOverride);
    // 客戶端臨時覆蓋優先,否則用後台預設
    const effectiveCropRatio = screenCropOverride !== null ? screenCropOverride : screenCropRatio;
    const rigs = useStore((state) => state.rigs);
    // [效能重構] 不再全量訂閱 rigValues(拖任一機關滑桿會讓所有物件 re-render)。
    // - transform 機關:useFrame 內以 getState() 讀最新值(transient update,零 re-render)
    // - visibility 機關:訂閱「僅此物件相關值」的指紋字串,無關滑桿不觸發 re-render
    const visFingerprint = useStore((state) => {
        let fp = '';
        for (const r of state.rigs) {
            if (r.type !== 'visibility' || r.targetType !== 'object' || r.targetId !== object.id) continue;
            fp += r.id + ':' + (state.rigValues[r.id] ?? r.defaultValue) + ';';
        }
        return fp;
    });
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);

    // Animation refs for smooth lerping
    const groupRef = useRef<THREE.Group>(null);
    const currentPos = useRef(new THREE.Vector3());
    const currentRot = useRef(new THREE.Euler());
    const isInitialized = useRef(false);

    // Merge forwarded ref with internal ref
    useEffect(() => {
        if (forwardedRef) {
            if (typeof forwardedRef === 'function') {
                forwardedRef(groupRef.current);
            } else {
                forwardedRef.current = groupRef.current;
            }
        }
    }, [forwardedRef]);

    // Use useGLTF hook with Draco decoder path
    const gltfData = useGLTF(object.model_path, 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    // Get active texture for emissive materials (using selected content)
    const activeTexture = useMemo(() => {
        if (activeContentId) {
            const selected = contentTextures.find(t => t.id === activeContentId);
            if (selected) {
                console.log('Active texture selected:', selected);
                return selected;
            }
        }
        return null;
    }, [contentTextures, activeContentId]);

    // Create and manage video texture using global video element
    // Supports both content videos AND camera stream
    useEffect(() => {
        const isContentVideo = activeTexture && (activeTexture.type === 'video' || activeTexture.type === 'r2_video');

        // Need either a content video OR an active camera stream
        if (!isContentVideo && !cameraStreamActive) {
            if (videoTexture) {
                videoTexture.dispose();
                setVideoTexture(null);
            }
            return;
        }

        let currentTexture: THREE.VideoTexture | null = null;
        let onSeeked: (() => void) | null = null;
        let onTimeUpdate: (() => void) | null = null;

        // Wait for global video element to be available
        const checkVideo = setInterval(() => {
            if (globalVideoElement && globalVideoElement.readyState >= 1) {
                clearInterval(checkVideo);
                const texture = new THREE.VideoTexture(globalVideoElement);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.flipY = false;

                setVideoTexture(texture);
                currentTexture = texture;

                // Force update on seek or manual time change when paused (content videos only)
                if (!cameraStreamActive) {
                    onSeeked = () => {
                        if (currentTexture && globalVideoElement?.paused) {
                            currentTexture.needsUpdate = true;
                        }
                    };
                    
                    onTimeUpdate = () => {
                        if (currentTexture && globalVideoElement?.paused) {
                            currentTexture.needsUpdate = true;
                        }
                    };

                    globalVideoElement.addEventListener('seeked', onSeeked);
                    globalVideoElement.addEventListener('timeupdate', onTimeUpdate);
                }

                console.log('[StageObject] Video texture created —', cameraStreamActive ? 'CAMERA' : 'CONTENT');
            }
        }, 100);

        return () => {
            clearInterval(checkVideo);
            if (onSeeked && globalVideoElement) {
                globalVideoElement.removeEventListener('seeked', onSeeked);
            }
            if (onTimeUpdate && globalVideoElement) {
                globalVideoElement.removeEventListener('timeupdate', onTimeUpdate);
            }
            if (currentTexture) {
                currentTexture.dispose();
            } else if (videoTexture) { // Fallback just in case
                videoTexture.dispose();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTexture?.type, activeTexture?.file_path, cameraStreamActive]);

    // Create static image texture (for non-GIF images)
    const imageTexture = useMemo(() => {
        if (!activeTexture || activeTexture.type !== 'image') return null;

        const url = activeTexture.file_path;
        if (globalImageTextureCache[url]) {
            console.log('Using cached image texture for:', url);
            return globalImageTextureCache[url];
        }

        console.log('Loading image texture from:', url);
        const texture = new THREE.TextureLoader().load(
            url,
            (tex) => {
                console.log('Image texture loaded successfully', tex);
            },
            undefined,
            (err) => {
                console.error('Image texture loading error:', err);
            }
        );

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.flipY = false; // Important: GLTF uses top-left origin

        globalImageTextureCache[url] = texture;
        return texture;
    }, [activeTexture?.type, activeTexture?.file_path]);

    // Animated GIF texture using gifuct-js decoder
    // Decodes GIF binary → pre-renders all frames → plays back at correct timing
    const gifCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const gifTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const gifFramesRef = useRef<{ imageData: ImageData; delay: number }[]>([]);
    const gifFrameIndexRef = useRef(0);
    const gifLastTimeRef = useRef(0);
    const [gifReady, setGifReady] = useState(false);

    useEffect(() => {
        if (!activeTexture || activeTexture.type !== 'gif') {
            if (gifTextureRef.current) {
                gifTextureRef.current.dispose();
                gifTextureRef.current = null;
            }
            gifCanvasRef.current = null;
            gifFramesRef.current = [];
            gifFrameIndexRef.current = 0;
            setGifReady(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const url = activeTexture.file_path;
                let fullFrames: { imageData: ImageData; delay: number }[] = [];
                let gifWidth = 0;
                let gifHeight = 0;

                if (globalGifCache[url]) {
                    console.log('Using cached GIF data for:', url);
                    const cached = globalGifCache[url];
                    fullFrames = cached.fullFrames;
                    gifWidth = cached.gifWidth;
                    gifHeight = cached.gifHeight;
                } else {
                    // Fetch GIF as binary
                    const response = await fetch(url);
                    const buffer = await response.arrayBuffer();
                    if (cancelled) return;

                    // Decode with gifuct-js
                    const gif = parseGIF(buffer);
                    const rawFrames = decompressFrames(gif, true);
                    if (cancelled || rawFrames.length === 0) return;

                    gifWidth = gif.lsd.width;
                    gifHeight = gif.lsd.height;

                    // Pre-render all frames with proper disposal handling
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = gifWidth;
                    tempCanvas.height = gifHeight;
                    const tempCtx = tempCanvas.getContext('2d')!;

                    for (let i = 0; i < rawFrames.length; i++) {
                        const frame = rawFrames[i];

                        // Handle disposal of previous frame
                        if (i > 0) {
                            const prev = rawFrames[i - 1];
                            if (prev.disposalType === 2) {
                                tempCtx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
                            }
                        }

                        // Composite this frame's patch onto the canvas
                        const frameImageData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
                        frameImageData.data.set(frame.patch);
                        tempCtx.putImageData(frameImageData, frame.dims.left, frame.dims.top);

                        // Save full canvas state as this frame
                        fullFrames.push({
                            imageData: tempCtx.getImageData(0, 0, gifWidth, gifHeight),
                            delay: Math.max(frame.delay, 20), // Minimum 20ms
                        });
                    }
                    
                    if (cancelled) return;

                    globalGifCache[url] = { fullFrames, gifWidth, gifHeight };
                }

                // Create display canvas and texture
                const canvas = document.createElement('canvas');
                canvas.width = gifWidth;
                canvas.height = gifHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.putImageData(fullFrames[0].imageData, 0, 0);

                const texture = new THREE.CanvasTexture(canvas);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.flipY = false;

                gifCanvasRef.current = canvas;
                gifFramesRef.current = fullFrames;
                gifFrameIndexRef.current = 0;
                gifLastTimeRef.current = performance.now();
                gifTextureRef.current = texture;
                setGifReady(true);
                console.log(`GIF loaded and prepared: ${fullFrames.length} frames, ${gifWidth}x${gifHeight}`);
            } catch (err) {
                console.error('GIF decode error:', err);
            }
        })();

        return () => {
            cancelled = true;
            if (gifTextureRef.current) {
                gifTextureRef.current.dispose();
                gifTextureRef.current = null;
            }
            gifCanvasRef.current = null;
            gifFramesRef.current = [];
            setGifReady(false);
        };
    }, [activeTexture?.type, activeTexture?.file_path]);

    // Advance GIF frames at correct timing
    useFrame(() => {
        if (!gifReady || gifFramesRef.current.length === 0 || !gifCanvasRef.current || !gifTextureRef.current) return;

        const now = performance.now();
        const currentFrame = gifFramesRef.current[gifFrameIndexRef.current];

        if (now - gifLastTimeRef.current >= currentFrame.delay) {
            // Advance to next frame
            gifFrameIndexRef.current = (gifFrameIndexRef.current + 1) % gifFramesRef.current.length;
            gifLastTimeRef.current = now;

            const nextFrame = gifFramesRef.current[gifFrameIndexRef.current];
            const ctx = gifCanvasRef.current.getContext('2d');
            if (ctx) {
                ctx.putImageData(nextFrame.imageData, 0, 0);
                gifTextureRef.current.needsUpdate = true;
            }
        }
    });

    // Select active texture map - support 'video', 'r2_video', 'gif', and camera stream
    const rawTextureMap = cameraStreamActive
        ? videoTexture  // Camera stream takes priority
        : (activeTexture?.type === 'video' || activeTexture?.type === 'r2_video')
            ? videoTexture
            : activeTexture?.type === 'gif'
                ? (gifReady ? gifTextureRef.current : null)
                : imageTexture;

    // LED 排列:有 active 排列且此物件在排列中,依矩形讀大圖(覆蓋預設 repeat/offset)
    const ledLayouts = useStore((state) => state.ledLayouts);
    const activeLedLayoutId = useStore((state) => state.activeLedLayoutId);
    const clientLayoutOverride = useStore((state) => state.clientLayoutOverride);
    // 客戶端臨時覆蓋優先:undefined=跟隨後台存檔;null=強制預設(關閉);string=指定排列
    const effectiveLayoutId = clientLayoutOverride !== undefined ? clientLayoutOverride : activeLedLayoutId;
    const activeLayout = effectiveLayoutId ? ledLayouts.find(l => l.id === effectiveLayoutId) : null;
    const layoutRect = activeLayout?.rects.find(r => r.objectId === object.id);
    // 有 active 排列時:此 LED 不在排列中(沒被加進畫布)→ 黑屏;在排列中但 enabled=false 也黑屏(相容舊資料)
    const layoutDisabled = !!activeLayout && (!layoutRect || layoutRect.enabled === false);

    // [效能重構] clone 只在「來源/顯示與否」變化時發生一次,並 dispose 舊 clone。
    // UV 參數(排列/裁切/預設 repeat/offset)改由下方 effect 直接 mutate——
    // repeat/offset 是 uniform,不需要 clone 也不需要 needsUpdate(needsUpdate 會強制整張圖重新上傳 GPU)。
    // 舊寫法把裁切比例/排列放進 clone 依賴,拖一格滑桿 = 每個 LED 重新 clone + GPU 重傳,是效能風暴。
    const textureMap = useMemo(() => {
        if (!rawTextureMap) return null;
        if (layoutDisabled) return null; // 排列中不啟用 → 不貼內容(黑屏)
        // Skip targetNodeId filter when camera is active (camera goes to all LEDs)
        if (!cameraStreamActive && activeTexture?.targetNodeId && activeTexture.targetNodeId !== object.id) {
            return null;
        }
        const cloned = rawTextureMap.clone();
        cloned.needsUpdate = true; // 換源時上傳一次即可
        return cloned;
    }, [rawTextureMap, cameraStreamActive, activeTexture?.targetNodeId, object.id, layoutDisabled]);

    // dispose 舊 clone,避免 texture 物件累積
    useEffect(() => {
        const t = textureMap;
        return () => { t?.dispose(); };
    }, [textureMap]);

    // UV 參數套用:直接 mutate repeat/offset(即時生效,零 GPU 重傳)
    useEffect(() => {
        if (!textureMap) return;
        // 螢幕擷取裁切:保留底部 cropRatio(flipY=false → 保留底部 = Y 從 (1-crop) 到 1)
        const cropActive = cameraStreamActive && cameraStreamMode === 'screen' && effectiveCropRatio < 1;
        const cropScale = cropActive ? effectiveCropRatio : 1;
        const cropBase = cropActive ? (1 - effectiveCropRatio) : 0;

        if (activeLayout && layoutRect && layoutRect.enabled) {
            // 排列:依像素矩形換算 UV;Y 再映射進裁切後的有效範圍
            const uv = rectToUv(layoutRect, activeLayout.canvasWidth, activeLayout.canvasHeight);
            textureMap.repeat.set(uv.repeat[0], uv.repeat[1] * cropScale);
            textureMap.offset.set(uv.offset[0], cropBase + uv.offset[1] * cropScale);
        } else {
            const w = activeTexture?.width ?? 1;
            const h = activeTexture?.height ?? 1;
            const x = activeTexture?.x ?? 0;
            const y = activeTexture?.y ?? 0;
            textureMap.repeat.set(w, h * cropScale);
            textureMap.offset.set(x, cropBase + y * cropScale);
        }
    }, [textureMap, activeTexture, cameraStreamActive, cameraStreamMode, effectiveCropRatio, activeLayout, layoutRect]);

    // Floor plan texture
    const floorPlanTexture = useMemo(() => {
        if (object.type !== 'floor_plan' || !floorPlanTextureUrl) return null;

        const texture = new THREE.TextureLoader().load(
            floorPlanTextureUrl,
            (tex) => console.log('Floor plan texture loaded'),
            undefined,
            (err) => console.error('Floor plan texture error:', err)
        );
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.flipY = false;
        return texture;
    }, [object.type, floorPlanTextureUrl]);

    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);

    // Create material based on render mode
    const material = useMemo(() => {
        switch (renderMode) {
            case 'wireframe':
                return new THREE.MeshBasicMaterial({
                    color: '#00ffff',
                    wireframe: true,
                    side: THREE.DoubleSide,
                });
            case 'clay':
                return new THREE.MeshStandardMaterial({
                    color: '#cccccc',
                    roughness: 0.8,
                    metalness: 0.0,
                    side: THREE.DoubleSide,
                });
            case 'beauty':
            default:
                // Floor plan with uploaded texture
                if (object.type === 'floor_plan') {
                    const MatClass = perfectRenderEnabled ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
                    const matParams: any = {
                        color: '#111111',
                        roughness: 1.0,
                        metalness: 0.0,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.7,
                    };
                    if (floorPlanTexture) {
                        matParams.map = floorPlanTexture;
                        matParams.color = '#ffffff'; // White so texture renders at full brightness
                    } else {
                        matParams.opacity = 0.5;
                    }
                    if (perfectRenderEnabled) {
                        matParams.envMapIntensity = 0.3;
                    }
                    return new MatClass(matParams);
                }
                // For emissive material with texture
                if (object.material_id === 'emissive') {
                    console.log('Creating emissive material, has texture:', !!textureMap);

                    if (textureMap) {
                        if (perfectRenderEnabled) {
                            // Perfect mode: slight emissive glow + minimal environment reflection
                            return new THREE.MeshPhysicalMaterial({
                                color: new THREE.Color('#000000'),
                                roughness: 0.1,
                                metalness: 0.0,
                                side: THREE.FrontSide,
                                emissive: new THREE.Color('#ffffff'),
                                emissiveMap: textureMap,
                                emissiveIntensity: 1.0,
                                envMapIntensity: 0.05,
                                toneMapped: false,
                            });
                        } else {
                            // Normal mode: color-accurate display (no lighting influence)
                            return new THREE.MeshBasicMaterial({
                                map: textureMap,
                                side: THREE.FrontSide,
                                toneMapped: false,
                            });
                        }
                    } else if (layoutDisabled) {
                        // 排列中未加入此 LED → 真正黑屏(不發光),而非待機亮橘色
                        return new THREE.MeshBasicMaterial({
                            color: new THREE.Color('#000000'),
                            side: THREE.FrontSide,
                            toneMapped: false,
                        });
                    } else {
                        // Fallback: no texture, show solid emissive color
                        return new THREE.MeshBasicMaterial({
                            color: new THREE.Color('#ffaa00'),
                            side: THREE.FrontSide,
                            toneMapped: false,
                        });
                    }
                }
                // For emissiveMesh (transparent grid LED)
                if (object.material_id === 'emissiveMesh') {
                    const alphaMap = createMeshLEDAlphaMap();

                    if (textureMap) {
                        if (perfectRenderEnabled) {
                            return new THREE.MeshPhysicalMaterial({
                                color: new THREE.Color('#000000'),
                                roughness: 0.1,
                                metalness: 0.0,
                                side: THREE.FrontSide,
                                emissive: new THREE.Color('#ffffff'),
                                emissiveMap: textureMap,
                                emissiveIntensity: 1.0,
                                envMapIntensity: 0.05,
                                toneMapped: false,
                                transparent: true,
                                alphaMap: alphaMap,
                            });
                        } else {
                            return new THREE.MeshBasicMaterial({
                                map: textureMap,
                                side: THREE.FrontSide,
                                toneMapped: false,
                                transparent: true,
                                alphaMap: alphaMap,
                            });
                        }
                    } else if (layoutDisabled) {
                        // 排列中未加入 → 黑屏(不發光)
                        return new THREE.MeshBasicMaterial({
                            color: new THREE.Color('#000000'),
                            side: THREE.FrontSide,
                            toneMapped: false,
                            transparent: true,
                            alphaMap: alphaMap,
                        });
                    } else {
                        return new THREE.MeshBasicMaterial({
                            color: new THREE.Color('#ffaa00'),
                            side: THREE.FrontSide,
                            toneMapped: false,
                            transparent: true,
                            alphaMap: alphaMap,
                        });
                    }
                }
                // Use perfect material when perfect render is enabled
                return perfectRenderEnabled
                    ? createPerfectMaterial(object.material_id)
                    : createMaterial(object.material_id);
        }
    }, [renderMode, object.material_id, object.type, textureMap, floorPlanTexture, perfectRenderEnabled, layoutDisabled]);

    // Apply realtime envMap to non-emissive materials for LED reflection
    useEffect(() => {
        if (!material || !envMap || !perfectRenderEnabled) return;
        if (object.material_id === 'emissive' || object.type === 'floor_plan') return;
        if (renderMode !== 'beauty') return;

        const mat = material as THREE.MeshStandardMaterial;
        if (mat.envMap !== envMap) {
            mat.envMap = envMap;
            mat.envMapIntensity = 1.5;
            mat.needsUpdate = true;
        }
    }, [material, envMap, perfectRenderEnabled, object.material_id, object.type, renderMode]);

    // 材質參數微調:就地 mutate(不重建材質、不重編譯 shader),滑桿拖動即時反映。
    // 特殊功能材質(LED 螢幕/投影幕/平面圖)維持各自路徑,不套用覆寫。
    const overridesJson = JSON.stringify(object.materialOverrides ?? null);
    useEffect(() => {
        if (!material || Array.isArray(material)) return;
        if (
            object.material_id === 'emissive' ||
            object.material_id === 'emissiveMesh' ||
            object.material_id === 'projectionScreen' ||
            object.type === 'floor_plan'
        ) return;
        const def = MATERIAL_LIBRARY[object.material_id];
        if (!def) return;
        applyMaterialOverrides(material as THREE.MeshStandardMaterial, def, object.materialOverrides);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [material, overridesJson, object.material_id, object.type]);

    const nodes = gltfData?.nodes ?? {};

    // Find all meshes in the loaded GLTF(memoize:供 geometry clone 依賴,避免每次 render 重算)
    const meshNodes = useMemo(() => {
        let list = Object.values(nodes).filter((node): node is THREE.Mesh =>
            (node as THREE.Object3D).type === 'Mesh'
        );
        if (object.meshNames && object.meshNames.length > 0) {
            list = list.filter(mesh => object.meshNames!.includes(mesh.name));
        }
        return list;
    }, [nodes, object.meshNames]);

    // ⚠️ 關鍵修復:geometry 只在來源變更時 clone 一次,並在替換/卸載時 dispose。
    // 原本在 render JSX 內 clone 且從不釋放,機關滑桿拖動(每秒數十次 re-render)
    // 會讓 GPU buffer 無限堆積 → VRAM 耗盡 → 模型消失 / WebGL context lost。
    const clonedGeometries = useMemo(
        () => meshNodes.map(n => n.geometry.clone()),
        [meshNodes]
    );
    useEffect(() => {
        const geos = clonedGeometries;
        return () => { geos.forEach(g => g.dispose()); };
    }, [clonedGeometries]);

    // Compute target transform
    const worldTransform = useMemo(() =>
        computeWorldTransform(object, stageObjects),
        [object, stageObjects]
    );

    // 此物件是否有任何 transform 機關(多數物件沒有 → useFrame 快路徑跳過 rigDelta)
    const hasObjectRig = useMemo(
        () => rigs.some(r => r.targetType === 'object' && r.targetId === object.id && r.type !== 'visibility'),
        [rigs, object.id]
    );

    // visibility 機關結果(依指紋更新,僅相關滑桿變化才重算)
    const objVisible = useMemo(() => {
        const st = useStore.getState();
        return rigVisibility(st.rigs, st.rigValues, 'object', object.id, 0) !== false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visFingerprint, object.id]);

    // 計算物件世界空間包圍盒,寫入 store 供 Null「對齊到特徵點」使用。
    const setObjectBounds = useStore((state) => state.setObjectBounds);
    useEffect(() => {
        const grp = groupRef.current;
        if (!grp || clonedGeometries.length === 0) return;
        const id = requestAnimationFrame(() => {
            if (!groupRef.current) return;
            groupRef.current.updateWorldMatrix(true, false);
            const world = groupRef.current.matrixWorld;
            const box = new THREE.Box3();
            const v = new THREE.Vector3();
            let has = false;
            for (const geo of clonedGeometries) {
                if (!geo.boundingBox) geo.computeBoundingBox();
                const bb = geo.boundingBox;
                if (!bb) continue;
                for (let i = 0; i < 8; i++) {
                    v.set(
                        i & 1 ? bb.max.x : bb.min.x,
                        i & 2 ? bb.max.y : bb.min.y,
                        i & 4 ? bb.max.z : bb.min.z,
                    ).applyMatrix4(world);
                    box.expandByPoint(v);
                    has = true;
                }
            }
            if (has && isFinite(box.min.x) && isFinite(box.max.x)) {
                setObjectBounds(object.id, [box.min.x, box.min.y, box.min.z], [box.max.x, box.max.y, box.max.z]);
            }
        });
        return () => cancelAnimationFrame(id);
    }, [clonedGeometries, object.id, setObjectBounds, worldTransform]);

    // Animate position/rotation using useFrame
    useFrame((_, delta) => {
        if (!groupRef.current) return;

        // [效能] 模組級臨時物件重用(見檔案頂部 _tmp*),每幀零分配,消除 GC 間歇卡頓。
        _tmpBasePos.set(worldTransform.pos[0], worldTransform.pos[1], worldTransform.pos[2]);
        _tmpBaseRot.set(worldTransform.rot[0], worldTransform.rot[1], worldTransform.rot[2]);

        // 物件級機關:多數物件沒有機關 → 快路徑跳過 rigDelta(避免每幀分配)
        if (hasObjectRig) {
            const rigState = useStore.getState();
            const rigOffset = rigDelta(rigState.rigs, rigState.rigValues, 'object', object.id, 0);
            _tmpTargetPos.set(
                _tmpBasePos.x + rigOffset.pos[0],
                _tmpBasePos.y + rigOffset.pos[1],
                _tmpBasePos.z + rigOffset.pos[2]
            );
            _tmpTargetRot.set(
                _tmpBaseRot.x + rigOffset.rot[0],
                _tmpBaseRot.y + rigOffset.rot[1],
                _tmpBaseRot.z + rigOffset.rot[2]
            );
        } else {
            _tmpTargetPos.copy(_tmpBasePos);
            _tmpTargetRot.copy(_tmpBaseRot);
        }

        // Initialize on first frame
        if (!isInitialized.current) {
            currentPos.current.copy(_tmpTargetPos);
            currentRot.current.copy(_tmpTargetRot);
            groupRef.current.position.copy(_tmpTargetPos);
            groupRef.current.rotation.copy(_tmpTargetRot);
            isInitialized.current = true;
            return;
        }

        // [效能] 收斂跳過:已到位的物件不再每幀算 lerp/slerp
        const distSq = currentPos.current.distanceToSquared(_tmpTargetPos);
        const rotDiff = Math.abs(currentRot.current.x - _tmpTargetRot.x)
            + Math.abs(currentRot.current.y - _tmpTargetRot.y)
            + Math.abs(currentRot.current.z - _tmpTargetRot.z);
        if (distSq < 1e-8 && rotDiff < 1e-6) return;

        // Calculate distance for speed adjustment
        const distance = Math.sqrt(distSq);
        const speed = calculateLerpSpeed(distance);
        const lerpFactor = Math.min(1, speed * delta * 5);

        // Lerp position
        currentPos.current.lerp(_tmpTargetPos, lerpFactor);
        groupRef.current.position.copy(currentPos.current);

        // Slerp rotation (quaternion,重用臨時物件)
        _tmpCurQuat.setFromEuler(currentRot.current);
        _tmpTgtQuat.setFromEuler(_tmpTargetRot);
        _tmpCurQuat.slerp(_tmpTgtQuat, lerpFactor);
        groupRef.current.quaternion.copy(_tmpCurQuat);
        currentRot.current.setFromQuaternion(_tmpCurQuat);
    });

    // Back-face black material for emissive objects (LED screens show black on back)
    const backFaceMaterial = useMemo(() => {
        if (object.material_id !== 'emissive' && object.material_id !== 'emissiveMesh') return null;
        if (renderMode === 'wireframe' || renderMode === 'clay') return null;

        const MatClass = perfectRenderEnabled ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
        const params: any = {
            color: '#000000',
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.BackSide,
        };

        // For emissiveMesh, apply the same grid alphaMap to the back face
        if (object.material_id === 'emissiveMesh') {
            params.transparent = true;
            params.alphaMap = createMeshLEDAlphaMap();
        }

        return new MatClass(params);
    }, [object.material_id, renderMode, perfectRenderEnabled]);

    const isEmissiveType = object.material_id === 'emissive' || object.material_id === 'emissiveMesh';

    // 條件回傳一律放在所有 hooks 之後(hooks 順序在每次 render 必須一致)
    if (!gltfData) return null;
    if (meshNodes.length === 0) {
        return (
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="orange" wireframe />
            </mesh>
        );
    }

    return (
        <group
            ref={groupRef}
            scale={worldTransform.scale}
            onClick={onClick}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredObjectName(getObjectDisplayName(object) || object.id); }}
            onPointerOut={() => setHoveredObjectName(null)}
            visible={objVisible}
        >
            {meshNodes.map((node, i) => {
                const geometry = clonedGeometries[i];
                if (!geometry) return null;

                return (
                    <group key={node.uuid}>
                        {/* Front face - main material */}
                        <mesh
                            geometry={geometry}
                            material={material}
                            castShadow={perfectRenderEnabled}
                            receiveShadow={perfectRenderEnabled && !isEmissiveType}
                        />
                        {/* Back face - black for emissive objects */}
                        {backFaceMaterial && (
                            <mesh
                                geometry={geometry}
                                material={backFaceMaterial}
                                castShadow={perfectRenderEnabled}
                            />
                        )}
                    </group>
                );
            })}
        </group>
    );
});

StageObjectRenderer.displayName = 'StageObjectRenderer';
