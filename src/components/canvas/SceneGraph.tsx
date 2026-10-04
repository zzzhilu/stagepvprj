import { OrbitControls, PerspectiveCamera, TransformControls , useProgress } from '@react-three/drei';
import { useStore, StageObject } from '@/store/useStore';
import type { NullNode } from '@/store/useStore';
import { pickRenderer } from './pick-renderer';
import { PaperFigureRenderer } from './PaperFigureRenderer';
import { CameraCapture } from './CameraCapture';
import { VideoManager } from './VideoManager';
import { VideoTimelineController } from './VideoTimelineController';
import { StageLightRenderer, StageLightRendererHandle } from './StageLightRenderer';
import { WalkModeController } from './WalkModeController';
import { MeasurementScene } from '@/components/client/MeasurementOverlay';
import { EffectComposer, Bloom, SMAA, ToneMapping, N8AO, Vignette } from '@react-three/postprocessing';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useRef, useEffect, useCallback, createRef, useState, useMemo } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PerfectRenderEnvironment } from './PerfectRenderEnvironment';
import { ToneMappingMode } from 'postprocessing';
import { rigDelta, rigVisibility, addVec3 } from '@/lib/rig-utils';
import { CameraMarkers } from './CameraMarkers';
import { setParallaxBox, setParallaxEnabled } from '@/lib/parallax-envmap';
import { planarReflectionUniforms } from '@/lib/planar-reflection';
import { REFLECT_LAYER } from '@/lib/reflect-layer';
import { LedSpillLight } from './LedSpillLight';

// 精簡模式:LED 永遠保留 + 後台指定 keepIds;其餘不渲染(直接卸載,省 draw call/材質/useFrame)
/**
 * 舞台板平面反射(反射做在被 🪞 標記的物件自己的材質上,見 lib/planar-reflection.ts)。
 * 只反射 LED 素材:鏡像相機 layers 只設 REFLECT_LAYER,而僅 LED mesh 被加入該層,
 * 因此桁架/舞台/場館完全不參與反射渲染 —— 又快又乾淨(無法線暴露、無遞迴過曝)。
 * 全場一個反射平面(高度取第一個標記物件);每幀一次額外渲染,僅完美渲染 + beauty 模式啟用。
 */
const _mirrorNormal = new THREE.Vector3(0, 1, 0);
const _mirrorPlanePos = new THREE.Vector3();
const _mirrorCamPos = new THREE.Vector3();
const _mirrorRot = new THREE.Matrix4();
const _mirrorView = new THREE.Vector3();
const _mirrorLook = new THREE.Vector3();
const _mirrorTarget = new THREE.Vector3();
const _mirrorPlane = new THREE.Plane();
const _mirrorClip = new THREE.Vector4();
const _mirrorQ = new THREE.Vector4();
const _mirrorClearColor = new THREE.Color();
const _mirrorSize = new THREE.Vector2();
const MIRROR_BIAS = new THREE.Matrix4().set(
    0.5, 0, 0, 0.5,
    0, 0.5, 0, 0.5,
    0, 0, 0.5, 0.5,
    0, 0, 0, 1
);

function PlanarMirror() {
    const perfectRenderEnabled = useStore((s) => s.perfectRenderEnabled);
    const renderMode = useStore((s) => s.renderMode);
    const reflectionMirror = useStore((s) => s.reflectionMirror);
    const reflectionBlur = useStore((s) => s.reflectionBlur);
    // 指紋 selector:只在「第一個標記物件 / 其設定高度 / 包圍盒底面」變化時 re-render
    const planeKey = useStore((s) => {
        const t = s.stageObjects.find((o) => o.planarReflector);
        if (!t) return '';
        const y = t.reflectorConfig?.y ?? s.objectBounds[t.id]?.min[1];
        return `${t.id}|${y ?? ''}`;
    });
    const [targetId, yStr] = planeKey.split('|');
    const planeY = yStr !== undefined && yStr !== '' ? parseFloat(yStr) : NaN;
    const active = perfectRenderEnabled && renderMode === 'beauty' && !!targetId && Number.isFinite(planeY);

    // 診斷:標記了卻沒有高度(未設 Y 且尚無包圍盒)→ 提示而非靜默失敗
    useEffect(() => {
        if (perfectRenderEnabled && targetId && !Number.isFinite(planeY)) {
            console.warn('[PlanarMirror] 已標記物件但尚無反射高度(未設定 Y 且無包圍盒資料):', targetId);
        }
    }, [perfectRenderEnabled, targetId, planeY]);

    const mirror = useMemo(() => {
        if (!active) return null;
        const rt = new THREE.WebGLRenderTarget(1024, 1024, {
            // 開啟 mipmap:模糊改用硬體三線性 mip 插值(等同 roughness 的模糊原理)
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
            magFilter: THREE.LinearFilter,
        });
        const camera = new THREE.PerspectiveCamera();
        camera.layers.set(REFLECT_LAYER); // 關鍵:鏡像相機只看 LED 圖層
        return { rt, camera };
    }, [active]);

    useEffect(() => {
        const u = planarReflectionUniforms;
        if (!mirror) {
            u.uMirrorActive.value = 0;
            return;
        }
        u.uMirrorMap.value = mirror.rt.texture;
        return () => {
            u.uMirrorActive.value = 0;
            u.uMirrorMap.value = null;
            mirror.rt.dispose();
        };
    }, [mirror]);

    // 滑桿即時更新 uniform(不重建)
    useEffect(() => {
        planarReflectionUniforms.uMirrorStrength.value = reflectionMirror; // 鏡面強度
        planarReflectionUniforms.uMirrorBlur.value = reflectionBlur * 0.3; // 滑桿 0–20 → mip LOD 0–6
    }, [reflectionMirror, reflectionBlur]);

    // 預設優先序(0):在主畫面 / 後製 composer 渲染之前更新反射畫面 → 同一幀內一致(demand 模式不會停在舊畫面)
    useFrame(({ gl, scene, camera }) => {
        const u = planarReflectionUniforms;
        if (!mirror || !(camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            u.uMirrorActive.value = 0;
            return;
        }
        _mirrorCamPos.setFromMatrixPosition(camera.matrixWorld);
        // 相機在平面下方:看不到反射面,跳過渲染
        if (_mirrorCamPos.y <= planeY + 1e-3) {
            u.uMirrorActive.value = 0;
            return;
        }

        // 反射貼圖解析度跟隨畫布(半解析度,反射本就模糊)
        gl.getDrawingBufferSize(_mirrorSize);
        const w = THREE.MathUtils.clamp(Math.round(_mirrorSize.x * 0.5), 256, 2048);
        const h = THREE.MathUtils.clamp(Math.round(_mirrorSize.y * 0.5), 256, 2048);
        if (mirror.rt.width !== w || mirror.rt.height !== h) mirror.rt.setSize(w, h);
        u.uMirrorTexel.value.set(1 / w, 1 / h);
        u.uMirrorPlaneY.value = planeY;

        // 鏡像相機(移植自 three Reflector:對 y = planeY 平面鏡射主相機)
        const vc = mirror.camera;
        _mirrorPlanePos.set(0, planeY, 0);
        _mirrorRot.extractRotation(camera.matrixWorld);
        _mirrorView.subVectors(_mirrorPlanePos, _mirrorCamPos).reflect(_mirrorNormal).negate().add(_mirrorPlanePos);
        _mirrorLook.set(0, 0, -1).applyMatrix4(_mirrorRot).add(_mirrorCamPos);
        _mirrorTarget.subVectors(_mirrorPlanePos, _mirrorLook).reflect(_mirrorNormal).negate().add(_mirrorPlanePos);
        vc.position.copy(_mirrorView);
        vc.up.set(0, 1, 0).applyMatrix4(_mirrorRot).reflect(_mirrorNormal);
        vc.lookAt(_mirrorTarget);
        vc.far = camera.far;
        vc.updateMatrixWorld();
        vc.projectionMatrix.copy(camera.projectionMatrix);

        // 世界座標 → 反射貼圖投影座標(材質 shader 用)
        u.uMirrorMatrix.value.copy(MIRROR_BIAS).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);

        // 斜近裁切面:平面以下的物件(例如落地 LED 被舞台板擋住的下半段)不進反射
        _mirrorPlane.setFromNormalAndCoplanarPoint(_mirrorNormal, _mirrorPlanePos).applyMatrix4(vc.matrixWorldInverse);
        _mirrorClip.set(_mirrorPlane.normal.x, _mirrorPlane.normal.y, _mirrorPlane.normal.z, _mirrorPlane.constant);
        const e = vc.projectionMatrix.elements;
        _mirrorQ.set(
            (Math.sign(_mirrorClip.x) + e[8]) / e[0],
            (Math.sign(_mirrorClip.y) + e[9]) / e[5],
            -1,
            (1 + e[10]) / e[14]
        );
        _mirrorClip.multiplyScalar(2 / _mirrorClip.dot(_mirrorQ));
        e[2] = _mirrorClip.x;
        e[6] = _mirrorClip.y;
        e[10] = _mirrorClip.z + 1;
        e[14] = _mirrorClip.w;
        vc.projectionMatrixInverse.copy(vc.projectionMatrix).invert();

        // 渲染(只有 LED 層;背景清成黑色,避免背景色被加到反射上)
        const prevTarget = gl.getRenderTarget();
        const prevXr = gl.xr.enabled;
        const prevShadowAuto = gl.shadowMap.autoUpdate;
        const prevBackground = scene.background;
        gl.getClearColor(_mirrorClearColor);
        const prevClearAlpha = gl.getClearAlpha();

        gl.xr.enabled = false;
        gl.shadowMap.autoUpdate = false;
        scene.background = null;
        gl.setClearColor(0x000000, 1);
        gl.setRenderTarget(mirror.rt);
        gl.state.buffers.depth.setMask(true);
        if (gl.autoClear === false) gl.clear();
        gl.render(scene, vc);

        gl.setRenderTarget(prevTarget);
        gl.setClearColor(_mirrorClearColor, prevClearAlpha);
        scene.background = prevBackground;
        gl.shadowMap.autoUpdate = prevShadowAuto;
        gl.xr.enabled = prevXr;
        u.uMirrorActive.value = 1;
    });

    return null;
}

/**
 * 完美渲染「自動重啟」保險。
 *
 * 「載入即預設開啟完美渲染」存在初始化競態(材質編譯順序、溢光燈掛載時序等),
 * 已修復 tone mapping 路徑但仍有殘餘(首次載入 LED 溢光可能不生效)。
 * 已驗證的 workaround 是手動關開一次完美渲染 —— 此元件將其自動化:
 * 舞台載入完成(objectBounds 首次有資料)後 1 秒,自動關閉 200ms 再開啟,僅執行一次。
 * 代價是畫面閃爍一瞬,換取客戶第一眼看到正確的光照。
 */
function PerfectRenderKickstart() {
    const perfectRenderEnabled = useStore((s) => s.perfectRenderEnabled);
    const hasBounds = useStore((s) => Object.keys(s.objectBounds).length > 0);
    const done = useRef(false);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        if (done.current || !perfectRenderEnabled || !hasBounds) return;
        done.current = true; // 僅首次(預設開啟)觸發;之後用戶手動開關不再干預
        const t1 = setTimeout(() => {
            useStore.getState().setPerfectRenderEnabled(false);
            const t2 = setTimeout(() => {
                useStore.getState().setPerfectRenderEnabled(true);
            }, 200);
            timers.current.push(t2);
        }, 1000);
        timers.current.push(t1);
    }, [perfectRenderEnabled, hasBounds]);

    // 卸載清理所有計時器(避免半開半關殘留)
    useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

    return null;
}

function liteVisible(obj: { id: string; type: string }, liteMode: boolean, keepIds: string[]): boolean {
    if (!liteMode) return true;
    if (obj.type === 'static_LED' || obj.type === 'moving_LED') return true;
    return keepIds.includes(obj.id);
}

/**
 * 首幀信號:資產載入完成後,實際渲染出第一幀時通知 store。
 * 載入進行中會把旗標歸零,確保旗標語意 = 「資產完成後的首幀」。
 * AssetLoadingOverlay 以此作為隱藏 loading 畫面的最終關卡。
 */
function FirstFrameGate() {
    const { active } = useProgress();
    const setFirstFrameRendered = useStore((state) => state.setFirstFrameRendered);
    const framesAfterIdleRef = useRef(0);

    useFrame(() => {
        const flag = useStore.getState().firstFrameRendered;
        if (active) {
            // 載入活動中:歸零(進入新一輪載入)
            framesAfterIdleRef.current = 0;
            if (flag) setFirstFrameRendered(false);
        } else {
            // 無載入活動:連續渲染數幀後判定首幀已穩定呈現
            framesAfterIdleRef.current += 1;
            if (framesAfterIdleRef.current >= 2 && !flag) {
                setFirstFrameRendered(true);
            }
        }
    });

    return null;
}

/**
 * Null 虛影標記:八面體線框 + 軸向輔助線。
 * Admin 模式恆顯示;gizmo 開啟時可點選(選取後出現 TransformControls)。
 */
function NullMarker({
    node,
    isSelected,
    gizmoEnabled,
    setSelectedNull,
}: {
    node: NullNode;
    isSelected: boolean;
    gizmoEnabled: boolean;
    setSelectedNull: (id: string | null) => void;
}) {
    return (
        <group>
            <axesHelper args={[isSelected ? 1.5 : 0.8]} />
            {/* 可點擊的虛影本體 */}
            <mesh
                onClick={(e) => {
                    if (!gizmoEnabled) return;
                    e.stopPropagation();
                    setSelectedNull(isSelected ? null : node.id);
                }}
                onPointerOver={(e) => {
                    if (!gizmoEnabled) return;
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    document.body.style.cursor = 'auto';
                }}
            >
                <octahedronGeometry args={[0.35, 0]} />
                <meshBasicMaterial
                    color={isSelected ? '#8b5cf6' : '#9ca3af'}
                    wireframe
                    transparent
                    opacity={isSelected ? 1 : 0.55}
                    depthTest={false}
                />
            </mesh>
            {/* 放大點擊判定範圍的隱形球 */}
            <mesh
                visible={false}
                onClick={(e) => {
                    if (!gizmoEnabled) return;
                    e.stopPropagation();
                    setSelectedNull(isSelected ? null : node.id);
                }}
            >
                <sphereGeometry args={[0.5, 8, 8]} />
            </mesh>
        </group>
    );
}

/**
 * Null 節點 → 巢狀 <group> 遞迴渲染。
 * 外層 group = 基底 pos/rot(TransformControls 操作對象,寫回 store);
 * 內層 group = 機關偏移(rig delta),沿 Null 自身的本地軸作用。
 */
function NullGroup({
    node,
    objectRefs,
    nullRefs,
    realtimeEnvMap,
    gizmoEnabled,
    setSelectedObject,
}: {
    node: NullNode;
    objectRefs: React.MutableRefObject<Map<string, { current: THREE.Group | null }>>;
    nullRefs: React.MutableRefObject<Map<string, { current: THREE.Group | null }>>;
    realtimeEnvMap: THREE.CubeTexture | null;
    gizmoEnabled: boolean;
    setSelectedObject: (id: string | null) => void;
}) {
    const nulls = useStore((state) => state.nulls);
    const stageObjects = useStore((state) => state.stageObjects);
    const rigs = useStore((state) => state.rigs);
    // [效能重構] 不全量訂閱 rigValues——只訂「作用於此 Null 的機關值」指紋,
    // 拖無關滑桿不會讓整棵 Null 樹 re-render。
    const rigFingerprint = useStore((state) => {
        let fp = '';
        for (const r of state.rigs) {
            if (r.targetType !== 'null' || r.targetId !== node.id) continue;
            fp += r.id + ':' + (state.rigValues[r.id] ?? r.defaultValue) + ';';
        }
        return fp;
    });
    // delta/可見性依指紋重算(getState 取值,無關變化不觸發)
    const { delta, nullVisible } = useMemo(() => {
        const st = useStore.getState();
        return {
            delta: rigDelta(st.rigs, st.rigValues, 'null', node.id),
            nullVisible: rigVisibility(st.rigs, st.rigValues, 'null', node.id),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rigFingerprint, node.id]);
    const mode = useStore((state) => state.mode);
    const selectedNullId = useStore((state) => state.selectedNullId);
    const setSelectedNull = useStore((state) => state.setSelectedNull);


    const childNulls = nulls.filter(n => n.parentId === node.id);
    const liteMode = useStore((state) => state.liteMode);
    const liteModeKeepIds = useStore((state) => state.liteModeKeepIds);
    const allChildObjects = stageObjects.filter(o => o.parentId === node.id && liteVisible(o, liteMode, liteModeKeepIds));
    const childObjects = allChildObjects.filter(o => !o.rigMirror);
    const mirroredObjects = allChildObjects.filter(o => o.rigMirror);

    // 鏡像跟隨:機關偏移 ×-1(位移反向、旋轉反向),供對稱機關使用
    const negDelta = {
        pos: [-delta.pos[0], -delta.pos[1], -delta.pos[2]] as [number, number, number],
        rot: [-delta.rot[0], -delta.rot[1], -delta.rot[2]] as [number, number, number],
    };

    const nullRef = nullRefs.current.get(node.id);

    return (
        <group
            ref={(el) => { if (nullRef) nullRef.current = el; }}
            position={node.pos}
            rotation={node.rot}
        >
            {/* Admin 模式:顯示可點選的軸心虛影(客戶端看不到) */}
            {mode === 'admin' && (
                <NullMarker
                    node={node}
                    isSelected={selectedNullId === node.id}
                    gizmoEnabled={gizmoEnabled}
                    setSelectedNull={setSelectedNull}
                />
            )}

            {/* 機關偏移層:位移/旋轉沿 Null 自身本地軸作用;可見性控制子物件顯示 */}
            <group position={delta.pos} rotation={delta.rot} visible={nullVisible !== false}>

            {childNulls.map(n => (
                <NullGroup
                    key={n.id}
                    node={n}
                    objectRefs={objectRefs}
                    nullRefs={nullRefs}
                    realtimeEnvMap={realtimeEnvMap}
                    gizmoEnabled={gizmoEnabled}
                    setSelectedObject={setSelectedObject}
                />
            ))}

            {childObjects.map(obj => {
                const objRef = objectRefs.current.get(obj.id);
                const Renderer = pickRenderer(obj.model_path);

                return (
                    <ErrorBoundary
                        key={obj.id}
                        fallback={
                            <mesh position={obj.instances[0]?.pos || [0, 0, 0]}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial color="red" wireframe />
                            </mesh>
                        }
                    >
                        <Renderer
                            ref={objRef}
                            object={obj}
                            envMap={realtimeEnvMap}
                            onClick={(e: ThreeEvent<MouseEvent>) => {
                                // 後台隨時可點擊選中(不再要求開啟變換工具),方便快速定位模型改數值
                                if (mode === 'admin') {
                                    e.stopPropagation();
                                    setSelectedObject(obj.id);
                                }
                            }}
                        />
                    </ErrorBoundary>
                );
            })}
            </group>
            {/* 鏡像跟隨層:同一個機關,偏移以 ×-1 作用 */}
            {mirroredObjects.length > 0 && (
                <group position={negDelta.pos} rotation={negDelta.rot}>
                    {mirroredObjects.map(obj => {
                        const objRef = objectRefs.current.get(obj.id);
                        const Renderer = pickRenderer(obj.model_path);
                        return (
                            <ErrorBoundary
                                key={obj.id}
                                fallback={
                                    <mesh position={obj.instances[0]?.pos || [0, 0, 0]}>
                                        <boxGeometry args={[1, 1, 1]} />
                                        <meshStandardMaterial color="red" wireframe />
                                    </mesh>
                                }
                            >
                                <Renderer
                                    ref={objRef}
                                    object={obj}
                                    envMap={realtimeEnvMap}
                                    onClick={(e: ThreeEvent<MouseEvent>) => {
                                        if (mode === 'admin') {
                                            e.stopPropagation();
                                            setSelectedObject(obj.id);
                                        }
                                    }}
                                />
                            </ErrorBoundary>
                        );
                    })}
                </group>
            )}
        </group>
    );
}

export function SceneGraph() {
    const stageObjects = useStore((state) => state.stageObjects);
    const nulls = useStore((state) => state.nulls);
    const ambientIntensity = useStore((state) => state.ambientIntensity);
    const directionalIntensity = useStore((state) => state.directionalIntensity);
    const mainLightAzimuth = useStore((state) => state.mainLightAzimuth);
    const mainLightElevation = useStore((state) => state.mainLightElevation);
    const bloomIntensity = useStore((state) => state.bloomIntensity);
    const bloomThreshold = useStore((state) => state.bloomThreshold);

    // Editor state for TransformControls
    const mode = useStore((state) => state.mode);
    const gizmoEnabled = useStore((state) => state.gizmoEnabled);
    const selectedObjectId = useStore((state) => state.selectedObjectId);
    const setSelectedObject = useStore((state) => state.setSelectedObject);
    const selectedLightId = useStore((state) => state.selectedLightId);
    const updateStageLight = useStore((state) => state.updateStageLight);
    const selectedNullId = useStore((state) => state.selectedNullId);
    const updateNull = useStore((state) => state.updateNull);
    const transformMode = useStore((state) => state.transformMode);
    const updateObjectTransform = useStore((state) => state.updateObjectTransform);

    // Perfect Render Mode state
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const perfectLightScale = useStore((state) => state.perfectLightScale);
    const toneMappingOn = useStore((state) => state.toneMapping);
    // 反射更新頻率自適應用:內容變化中(影片播放/攝影機直播)才需要高頻更新
    const videoPlayingRT = useStore((state) => state.videoPlaying);
    const cameraStreamActiveRT = useStore((state) => state.cameraStreamActive);

    const controlsRef = useRef<OrbitControlsImpl>(null);
    const cubeCameraRef = useRef<THREE.CubeCamera>(null);
    const [realtimeEnvMap, setRealtimeEnvMap] = useState<THREE.CubeTexture | null>(null);
    const frameCounter = useRef(0);
    const transformRef = useRef<any>(null);
    const lightTransformRef = useRef<any>(null);
    const stageLightRendererRef = useRef<StageLightRendererHandle>(null);
    const objectRefsRef = useRef<Map<string, { current: THREE.Group | null }>>(new Map());
    const liteModeTop = useStore((state) => state.liteMode);
    const liteKeepIdsTop = useStore((state) => state.liteModeKeepIds);
    const nullRefsRef = useRef<Map<string, { current: THREE.Group | null }>>(new Map());
    const nullTransformRef = useRef<any>(null);
    const activeViewId = useStore((state) => state.activeViewId);
    const views = useStore((state) => state.views);
    const setActiveView = useStore((state) => state.setActiveView);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const fov = useStore((state) => state.fov);
    const setFov = useStore((state) => state.setFov);

    // Drawing mode — disable orbit when drawing is active
    const drawingMode = useStore((state) => state.drawingMode);

    // Paper Figure mode
    const paperFigureMode = useStore((state) => state.paperFigureMode);

    // Walk Mode (first person)
    const walkMode = useStore((state) => state.walkMode);

    // Measurement Mode
    const measureMode = useStore((state) => state.measureMode);

    // Create/update refs for all objects (using mutable ref objects)
    useEffect(() => {
        stageObjects.forEach(obj => {
            if (!objectRefsRef.current.has(obj.id)) {
                objectRefsRef.current.set(obj.id, { current: null });
            }
        });

        // Clean up removed objects
        const currentIds = new Set(stageObjects.map(o => o.id));
        const keysToDelete: string[] = [];
        objectRefsRef.current.forEach((_, key) => {
            if (!currentIds.has(key)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => objectRefsRef.current.delete(key));
    }, [stageObjects]);

    // Create/update refs for all rig Null nodes (same pattern as objects)
    useEffect(() => {
        nulls.forEach(node => {
            if (!nullRefsRef.current.has(node.id)) {
                nullRefsRef.current.set(node.id, { current: null });
            }
        });
        const currentIds = new Set(nulls.map(n => n.id));
        const keysToDelete: string[] = [];
        nullRefsRef.current.forEach((_, key) => {
            if (!currentIds.has(key)) keysToDelete.push(key);
        });
        keysToDelete.forEach(key => nullRefsRef.current.delete(key));
    }, [nulls]);

    // CubeCamera for realtime LED reflections on stage surfaces
    useEffect(() => {
        if (!perfectRenderEnabled) {
            if (cubeCameraRef.current) {
                cubeCameraRef.current.renderTarget.dispose();
                cubeCameraRef.current = null;
                setRealtimeEnvMap(null);
                setParallaxEnabled(false);
            }
            return;
        }

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, { // 128:反射柔糊已足夠,像素/PMREM 成本降 4 倍
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
        });
        const cubeCamera = new THREE.CubeCamera(0.1, 300, cubeRenderTarget); // far 300:反射貼圖中遠景不可辨,大 far 只會爆炸性增加 6 面渲染成本
        cubeCamera.position.set(0, 1, 0); // Position at stage level
        cubeCameraRef.current = cubeCamera;
        setRealtimeEnvMap(cubeRenderTarget.texture);
        setParallaxEnabled(true); // 反射 parallax 校正隨 perfect render 啟用

        return () => {
            cubeRenderTarget.dispose();
            cubeCameraRef.current = null;
        };
    }, [perfectRenderEnabled]);

    // Animation state refs (to avoid re-renders during animation)
    const animationRef = useRef<{
        active: boolean;
        startTime: number;
        duration: number;
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        startTarget: THREE.Vector3;
        endTarget: THREE.Vector3;
        startFov: number;
        endFov: number;
    } | null>(null);

    // Initialize camera animation when view changes
    useEffect(() => {
        if (!activeViewId || !controlsRef.current || !cameraRef.current) return;

        const view = views.find(v => v.id === activeViewId);
        if (!view) return;

        animationRef.current = {
            active: true,
            startTime: performance.now(),
            duration: 800, // Reduced for snappier transitions
            startPos: cameraRef.current.position.clone(),
            endPos: new THREE.Vector3(...view.camera.position),
            startTarget: controlsRef.current.target.clone(),
            endTarget: new THREE.Vector3(...view.camera.target),
            startFov: cameraRef.current.fov,
            endFov: view.camera.fov,
        };
        // Update store FOV immediately so UI reflects target
        setFov(view.camera.fov);
    }, [activeViewId, views]);

    // Run animation in useFrame for sync with render loop
    useFrame(({ invalidate, gl, scene }) => {
        // CubeCamera update for realtime LED reflections (every 3 frames)
        if (cubeCameraRef.current && perfectRenderEnabled) {
            frameCounter.current++;
            // [反射即時性] 自適應更新頻率:
            //   內容變化中(影片播放/攝影機直播)→ 每 2 幀(約 30Hz,LED 影片反射跟得上畫面)
            //   靜止畫面 → 每 30 幀(場景沒變,不需重算;省下的預算給播放時用)
            // far=300 + res 128 已把單次成本壓低,故播放時可負擔高頻更新。
            const contentLive = videoPlayingRT || cameraStreamActiveRT;
            const interval = contentLive ? 4 : 30; // 4 幀(15Hz):每次 update 含 PMREM 重算,成本比預估高
            if (frameCounter.current % interval === 0) {
                cubeCameraRef.current.update(gl, scene);
            }
            // Parallax 包圍盒自動計算(每 60 幀,零訂閱):venues 物件聯集,適配 50m~500m 場館
            if (frameCounter.current % 60 === 1) {
                const st = useStore.getState();
                const ids = st.stageObjects.filter(o => o.type === 'venues').map(o => o.id);
                const useIds = ids.length > 0 ? ids : st.stageObjects.map(o => o.id);
                let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                for (const id of useIds) {
                    const b = st.objectBounds[id];
                    if (!b) continue;
                    minX = Math.min(minX, b.min[0]); minY = Math.min(minY, b.min[1]); minZ = Math.min(minZ, b.min[2]);
                    maxX = Math.max(maxX, b.max[0]); maxY = Math.max(maxY, b.max[1]); maxZ = Math.max(maxZ, b.max[2]);
                }
                if (Number.isFinite(minX) && maxX > minX) {
                    setParallaxBox([minX, minY, minZ], [maxX, maxY, maxZ], [0, 1, 0]);
                }
            }
        }

        const anim = animationRef.current;
        if (!anim || !anim.active || !cameraRef.current || !controlsRef.current) return;

        const elapsed = performance.now() - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        cameraRef.current.position.lerpVectors(anim.startPos, anim.endPos, ease);
        controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, ease);

        // Lerp FOV
        cameraRef.current.fov = THREE.MathUtils.lerp(anim.startFov, anim.endFov, ease);
        cameraRef.current.updateProjectionMatrix();

        controlsRef.current.update();

        // Request next frame (for demand frameloop)
        invalidate();

        if (progress >= 1) {
            anim.active = false;
        }
    });

    return (
        <>
            {/* CubeCamera for realtime LED reflections */}
            {cubeCameraRef.current && <primitive object={cubeCameraRef.current} />}

            {/* 3D 機位模型(導播參考) */}
            <PlanarMirror />
            <PerfectRenderKickstart />
            <LedSpillLight />
            <CameraMarkers />

            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                position={[0, 5, 20]}
                fov={fov}
                near={0.1}
                far={5000}
            />

            {/* OrbitControls with vertical rotation limits (disabled during drawing/walkMode) */}
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enabled={!drawingMode && !paperFigureMode && !walkMode}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={500}
                minPolarAngle={0.1}
                maxPolarAngle={Math.PI * 0.85}
                dampingFactor={0.05}
                enableDamping={true}
                onStart={() => {
                    // Clear active view when user starts interacting with camera
                    if (activeViewId) {
                        setActiveView(null);
                    }
                }}
            />

            {/* Walk Mode Controller — always mounted so WASD auto-enter works */}
            <WalkModeController />

            {/* Helper component to capture camera state when triggered from Admin UI */}
            <CameraCapture controlsRef={controlsRef} />

            {/* Video Manager and its Timeline Cue Controller */}
            <VideoManager />
            <FirstFrameGate />
            <VideoTimelineController />

            {/* Paper Figures (Billboard Sprites) */}
            <PaperFigureRenderer />

            {/* 3D Measurement Overlay */}
            <MeasurementScene />

            {/* Enhanced lighting for better model visibility */}
            {/* 完美渲染另有環境光 IBL,直接光按補償係數降低,避免同一組數值在兩模式亮度落差 */}
            <ambientLight intensity={ambientIntensity * (perfectRenderEnabled ? perfectLightScale : 1)} />
            <directionalLight
                position={[
                    20 * Math.cos(mainLightElevation * Math.PI / 180) * Math.sin(mainLightAzimuth * Math.PI / 180),
                    20 * Math.sin(mainLightElevation * Math.PI / 180),
                    20 * Math.cos(mainLightElevation * Math.PI / 180) * Math.cos(mainLightAzimuth * Math.PI / 180)
                ]}
                intensity={directionalIntensity * (perfectRenderEnabled ? perfectLightScale : 1)}
                castShadow={perfectRenderEnabled}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
                shadow-camera-near={0.1}
                shadow-camera-far={60}
                shadow-bias={-0.001}
            />
            <directionalLight position={[-10, 10, -5]} intensity={directionalIntensity * 0.4 * (perfectRenderEnabled ? perfectLightScale : 1)} />
            <hemisphereLight intensity={0.4} groundColor="#444" />

            {/* Perfect Render Environment - HDR, SpotLights, ContactShadows */}
            <PerfectRenderEnvironment />

            {/* Stage Light System - dynamic lights only in Perfect Render */}
            <StageLightRenderer ref={stageLightRendererRef} />

            {/* ===== 場景層級渲染 ===== */}
            {/* 根層 Null(無 parent 或 parent 已不存在 → fallback 到根層) */}
            {nulls
                .filter(n => !n.parentId || !nulls.some(p => p.id === n.parentId))
                .map(n => (
                    <NullGroup
                        key={n.id}
                        node={n}
                        objectRefs={objectRefsRef}
                        nullRefs={nullRefsRef}
                        realtimeEnvMap={realtimeEnvMap}
                        gizmoEnabled={gizmoEnabled}
                        setSelectedObject={setSelectedObject}
                    />
                ))}

            {/* 未掛載到任何 Null 的物件(含 parent 已被刪除的孤兒) */}
            {stageObjects
                .filter(obj => (!obj.parentId || !nulls.some(n => n.id === obj.parentId)) && liteVisible(obj, liteModeTop, liteKeepIdsTop))
                .map((obj) => {
                    const objRef = objectRefsRef.current.get(obj.id);
                    const Renderer = pickRenderer(obj.model_path);

                    return (
                        <ErrorBoundary
                            key={obj.id}
                            fallback={
                                <mesh position={obj.instances[0]?.pos || [0, 0, 0]}>
                                    <boxGeometry args={[1, 1, 1]} />
                                    <meshStandardMaterial color="red" wireframe />
                                </mesh>
                            }
                        >
                            <Renderer
                                ref={objRef}
                                object={obj}
                                envMap={realtimeEnvMap}
                                onClick={(e: ThreeEvent<MouseEvent>) => {
                                    if (mode === 'admin' && gizmoEnabled) {
                                        e.stopPropagation();
                                        setSelectedObject(obj.id);
                                    }
                                }}
                            />
                        </ErrorBoundary>
                    );
                })}

            {/* TransformControls for rig Null nodes (when Gizmo is enabled + null selected) */}
            {mode === 'admin' && gizmoEnabled && selectedNullId && (() => {
                const nullRef = nullRefsRef.current.get(selectedNullId);
                if (!nullRef || !nullRef.current) return null;

                return (
                    <TransformControls
                        ref={nullTransformRef}
                        object={nullRef.current}
                        mode={transformMode === 'scale' ? 'translate' : transformMode}
                        translationSnap={null}
                        rotationSnap={Math.PI / 180} // 1 degree
                        onObjectChange={() => {
                            const g = nullRef.current;
                            if (g) {
                                // group 是巢狀子節點,position/rotation 即為相對 parent 的本地座標,
                                // 直接寫回 NullNode 的基底 transform(機關偏移在內層 group,不受污染)
                                updateNull(selectedNullId, {
                                    pos: [g.position.x, g.position.y, g.position.z],
                                    rot: [g.rotation.x, g.rotation.y, g.rotation.z],
                                });
                            }
                        }}
                        onMouseDown={() => {
                            if (controlsRef.current) controlsRef.current.enabled = false;
                        }}
                        onMouseUp={() => {
                            if (controlsRef.current) controlsRef.current.enabled = true;
                        }}
                    />
                );
            })()}

            {/* TransformControls for Admin Mode (when Gizmo is enabled) */}
            {mode === 'admin' && gizmoEnabled && selectedObjectId && (() => {
                const objRef = objectRefsRef.current.get(selectedObjectId);
                if (!objRef || !objRef.current) return null;

                return (
                    <TransformControls
                        ref={transformRef}
                        object={objRef.current}
                        mode={transformMode}
                        translationSnap={1}
                        rotationSnap={Math.PI / 180} // 1 degree
                        scaleSnap={0.1}
                        onObjectChange={() => {
                            if (objRef.current) {
                                const obj = objRef.current;
                                updateObjectTransform(
                                    selectedObjectId,
                                    [obj.position.x, obj.position.y, obj.position.z],
                                    [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                                    [obj.scale.x, obj.scale.y, obj.scale.z]
                                );
                            }
                        }}
                        onMouseDown={() => {
                            // Disable OrbitControls while dragging
                            if (controlsRef.current) controlsRef.current.enabled = false;
                        }}
                        onMouseUp={() => {
                            // Re-enable OrbitControls
                            if (controlsRef.current) controlsRef.current.enabled = true;
                        }}
                    />
                );
            })()}

            {/* TransformControls for Stage Lights (when Gizmo is enabled + light selected) */}
            {mode === 'admin' && gizmoEnabled && selectedLightId && (() => {
                const lightObj = stageLightRendererRef.current?.getLightRef(selectedLightId);
                if (!lightObj) return null;

                return (
                    <TransformControls
                        ref={lightTransformRef}
                        object={lightObj}
                        mode={transformMode === 'scale' ? 'translate' : transformMode}
                        translationSnap={0.5}
                        rotationSnap={Math.PI / 36}
                        onObjectChange={() => {
                            if (lightObj) {
                                updateStageLight(selectedLightId, {
                                    position: [
                                        lightObj.position.x,
                                        lightObj.position.y,
                                        lightObj.position.z
                                    ] as [number, number, number],
                                    rotation: [
                                        lightObj.rotation.x,
                                        lightObj.rotation.y,
                                        lightObj.rotation.z
                                    ] as [number, number, number],
                                });
                            }
                        }}
                        onMouseDown={() => {
                            if (controlsRef.current) controlsRef.current.enabled = false;
                        }}
                        onMouseUp={() => {
                            if (controlsRef.current) controlsRef.current.enabled = true;
                        }}
                    />
                );
            })()}

            {/* Ground plane - simple dark surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
            </mesh>

            {/* Post-Processing Effects */}
            {perfectRenderEnabled ? (
                <EffectComposer multisampling={0}>
                    <N8AO
                        aoRadius={2}
                        distanceFalloff={1}
                        intensity={3}
                        color="black"
                        halfRes={false}
                        quality="medium"
                    />
                    {/* Tone mapping 必須在 composer 內做:EffectComposer 會接管輸出並忽略
                        gl.toneMapping(材質編譯期 define 的競態正是「載入即開啟完美渲染會卡
                        錯誤光照、重開才正常」的根因)。
                        順序:ACES 在 Bloom「之前」— 與既有調校時的機制一致(舊行為是材質內
                        先映射、Bloom 後處理),bloomIntensity/Threshold 現值直接適用,觀感不變。 */}
                    {toneMappingOn ? <ToneMapping mode={ToneMappingMode.ACES_FILMIC} /> : <></>}
                    <Bloom
                        intensity={bloomIntensity * 1.5}
                        luminanceThreshold={bloomThreshold}
                        luminanceSmoothing={0.9}
                        mipmapBlur={true}
                        resolutionX={1024}
                        resolutionY={1024}
                    />
                    <SMAA />
                    {/* 電影感暗角(僅完美渲染;無噪點,保持清晰) */}
                    <Vignette offset={0.28} darkness={0.55} eskil={false} />
                </EffectComposer>
            ) : bloomIntensity > 0 ? (
                <EffectComposer multisampling={0}>
                    <Bloom
                        intensity={bloomIntensity}
                        luminanceThreshold={bloomThreshold}
                        luminanceSmoothing={0.9}
                        mipmapBlur={true}
                        resolutionX={512}
                        resolutionY={512}
                    />
                    <SMAA />
                </EffectComposer>
            ) : null}
        </>
    );
}
