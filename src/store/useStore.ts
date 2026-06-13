import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as THREE from 'three';
import type { MaterialId, MaterialOverrides } from '@/lib/materials';
import { nullLocalMatrix, nullWorldMatrix, reparentTransform } from '@/lib/rig-utils';

// Types based on SAD 5.1 & 5.2
export type ModelType = 'venues' | 'stage' | 'static_LED' | 'moving_LED' | 'moving_prop' | 'basic_camera' | 'floor_plan' | 'prop' | 'band';

export interface Instance {
    pos: [number, number, number];
    rot: [number, number, number];
    scale: [number, number, number];
}

export interface ObjectTransform {
    id: string;
    pos: [number, number, number];
    rot: [number, number, number];
    scale: [number, number, number];
}

export interface StageCue {
    id: string;
    name: string;
    transforms: ObjectTransform[];
    lightStates?: StageLightState[];       // Snapshot of all light states per cue
    rigValues?: Record<string, number>;    // 機關值快照(rigId → 值);舊 cue 無此欄位 = 不動機關
    thumbnail_url?: string;
    order: number;
}

export interface StageObject {
    id: string; // unique ID for internal tracking
    model_path: string;
    material_id: MaterialId;
    instances: Instance[];
    type: ModelType; // Model category type
    meshNames?: string[]; // Optional: specific mesh names to filter from the GLB
    name?: string; // 顯示名稱:上傳時取自 3D 軟體的 mesh/檔案命名,可由使用者修改
    rigMirror?: boolean; // 鏡像跟隨:掛載於 Null 時,機關偏移以 ×-1 作用(對稱機關,如左右對開門)
    materialOverrides?: MaterialOverrides; // 材質參數微調(基底 material_id 之上的覆寫)
    parentId?: string | null; // 掛載的 Null 節點或父物件 ID;一旦有 parent,instances 的 pos/rot 即為相對 parent 的本地座標
    curvature?: number; // [NEW] Arc curvature for projection screens (-1 to 1)
}

// ===== 機關系統 (Rig System) =====

/** Null 空物件:場景層級節點,位置即旋轉軸心,可巢狀 */
export interface NullNode {
    id: string;                    // `null_${Date.now()}`
    name: string;                  // 使用者命名,如「主升降軸」
    parentId: string | null;       // 掛在另一個 Null 底下;null = 場景根
    pos: [number, number, number]; // 相對 parent 的位置 = 旋轉軸心
    rot: [number, number, number]; // 基底旋轉(弧度)
}

export type RigType = 'rotation' | 'translation';
export type RigAxis = 'x' | 'y' | 'z';

/** 機關:一個受限的可動自由度,目標可為 Null 或物件 instance */
export interface RigControl {
    id: string;                    // `rig_${Date.now()}`
    name: string;                  // 「升降台高度」
    targetType: 'null' | 'object';
    targetId: string;              // NullNode.id 或 StageObject.id
    instanceIndex?: number;        // targetType === 'object' 時指定 instance(預設 0)
    type: RigType;
    axis: RigAxis;
    min: number;                   // translation: scene units;rotation: 度
    max: number;
    step?: number;                 // 滑桿步進
    defaultValue: number;          // 須在 [min, max] 內
}


export type TextureType = 'image' | 'video' | 'r2_video' | 'gif';

export interface ContentTexture {
    id: string;
    name: string;
    file_path: string;
    type: TextureType; // 'image', 'video', or 'r2_video'
    thumbnail_url?: string;
    file_size?: number; // bytes
    timelineCues?: VideoTimelineCue[]; // [NEW] Time-based cue sequence
    
    // Multi-screen / Mapping Properties
    targetNodeId?: string; // target stage object internal ID to apply to
    width?: number;
    height?: number;
    x?: number;
    y?: number;
}

export interface SpotLightConfig {
    name: string;                           // Display name (主燈 Key, 補光 Fill, 背光 Rim)
    position: [number, number, number];     // XYZ position
    intensity: number;                      // 0-10
    angle: number;                          // 0-Math.PI/2 (spotlight cone angle)
    distance: number;                       // 0-50 (max range)
    color: string;                          // hex color
    enabled: boolean;                       // on/off toggle
    castShadow: boolean;                    // shadow toggle
}

// === Stage Lighting System ===
export type StageLightType = 'spot' | 'point' | 'rect' | 'strip';

export interface StageLightState {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    intensity: number;
    color: string;
    enabled: boolean;
}

export interface StageLight {
    id: string;
    name: string;
    type: StageLightType;
    position: [number, number, number];
    rotation: [number, number, number];     // Euler rotation for direction (default: pointing down)
    intensity: number;                      // 0-30
    color: string;                          // hex color
    enabled: boolean;
    castShadow: boolean;
    parentId?: string;                      // Follow parent object (e.g. truss)

    // SpotLight specific
    angle?: number;        // 0-Math.PI/2
    penumbra?: number;     // 0-1
    distance?: number;     // 0-100

    // RectAreaLight / StripLight specific
    width?: number;
    height?: number;       // strip uses fixed 0.1
}

// R2 Video for Image Progress feature
export interface VideoTimelineCue {
    id: string;        // Unique ID for the timeline cue marker
    time: number;      // Video timecode in seconds
    cueId: string;     // Target StageCue ID to transition to
    duration?: number; // [NEW] Transition duration in seconds to this cue
}

export interface VideoFolder {
    id: string;
    name: string;
    createdAt: number;
    isCollapsed: boolean;
}

export interface R2Video {
    id: string;           // Unique video ID (for share links)
    filename: string;     // Original filename (for watermark)
    r2_url: string;       // Full R2 URL
    uploadedAt: number;   // Timestamp
    folderId?: string;    // [NEW] Folder assignment
    cueId?: string;       // [NEW] Associated cue ID for sharing with a specific scene state
    timelineCues?: VideoTimelineCue[]; // [NEW] Time-based cue sequence
}


export interface GDriveVideo {
    id: string;           // Global internal unique ID
    driveFileId: string;  // Google Drive File ID
    filename: string;
    thumbnail_url?: string;
    uploadedAt: number;
    folderId?: string;
    cueId?: string;
    cuePoint?: number | null;
    size?: string;
    timelineCues?: VideoTimelineCue[];
}

// Paper Figure (Billboard Sprite) for scale reference
export interface PaperFigure {
    id: string;
    position: [number, number, number];
    scale: number;   // uniform scale (default 1)
    color: string;   // hex color
}

export interface CameraView {
    id: string;
    name: string;
    camera: {
        position: [number, number, number];
        target: [number, number, number];
        fov: number;
    };
    thumbnail_url?: string;
    order: number;
}

export interface MaterialSlot {
    id: string;
    name: string;
    materialId: MaterialId;
}

export type RenderMode = 'wireframe' | 'beauty' | 'clay';

interface State {
    mode: 'admin' | 'client';
    isMobile: boolean;
    stageObjects: StageObject[];
    views: CameraView[];
    cues: StageCue[];          // [NEW] List of saved cues
    activeCueId: string | null; // [NEW] Current applied cue
    r2Videos: R2Video[];        // [NEW] R2 videos for Image Progress
    videoFolders: VideoFolder[]; // [NEW] Folders for R2 videos
    gdriveVideos: GDriveVideo[];
    gdriveFolders: Record<string, string>; // Maps projectId to folderId

    capturePending: boolean;
    activeViewId: string | null;
    contentTextures: ContentTexture[];
    activeContentId: string | null;
    renderMode: RenderMode;
    ambientIntensity: number;
    directionalIntensity: number;
    mainLightAzimuth: number;      // horizontal angle in degrees (0-360)
    mainLightElevation: number;    // vertical angle in degrees (10-90)
    bloomIntensity: number;
    bloomThreshold: number;
    fov: number; // [NEW] Global FOV state

    // 機關系統 (Rig System)
    nulls: NullNode[];                    // Null 空物件(跨端同步)
    rigs: RigControl[];                   // 機關定義(跨端同步)
    rigValues: Record<string, number>;    // rigId → 當前值(runtime,不同步、不持久化)

    // Loading State
    isLoading: boolean;
    loadingMessage: string;

    videoPlaying: boolean;
    videoVolume: number;
    videoCurrentTime: number;
    videoDuration: number;
    isRecordingMode: boolean;

    // Editor State [NEW]
    selectedObjectId: string | null;
    selectedLightId: string | null;  // Selected stage light for TransformControls
    selectedNullId: string | null;   // Selected rig Null node for TransformControls
    transformMode: 'translate' | 'rotate' | 'scale';
    gizmoEnabled: boolean; // [NEW] Toggle for transform controls

    // Drawing & Screenshot State [NEW]
    drawingMode: boolean;
    screenshotToast: boolean;

    // Measurement Mode [NEW]
    measureMode: boolean;

    // Camera Stream State [NEW]
    cameraStreamActive: boolean;
    cameraStreamDeviceId: string | null;
    cameraStreamError: string | null;

    // Paper Figure State [NEW]
    paperFigures: PaperFigure[];
    paperFigureMode: boolean;

    // Walk Mode (First Person) [NEW]
    walkMode: boolean;
    walkMoveInput: { x: number; y: number }; // joystick input for mobile

    // Floor Plan Texture [NEW]
    floorPlanTextureUrl: string | null;

    // Perfect Render Mode [NEW]
    perfectRenderEnabled: boolean;
    reflectionMirror: number;      // 0-1
    reflectionBlur: number;        // 0-20
    reflectionMetalness: number;   // 0-1
    envPreset: string;             // 'studio' | 'city' | 'sunset' | 'warehouse' | 'forest' | 'apartment' | 'park' | 'lobby'
    envIntensity: number;          // 0-3
    contactShadow: boolean;
    toneMapping: boolean;
    spotLights: SpotLightConfig[];  // Legacy - kept for migration
    stageLights: StageLight[];     // Dynamic stage lighting system
    materialSlots: MaterialSlot[]; // [NEW] Custom material slots

    setMode: (mode: 'admin' | 'client') => void;
    setIsMobile: (isMobile: boolean) => void;
    addObject: (obj: StageObject) => void;
    updateObjectInstances: (id: string, instances: Instance[]) => void;
    updateObjectMaterial: (id: string, materialId: MaterialId) => void;

    // Material Slots Actions
    addMaterialSlot: (slot: MaterialSlot) => void;
    updateMaterialSlot: (id: string, updates: Partial<MaterialSlot>) => void;
    removeMaterialSlot: (id: string) => void;
    setMaterialSlots: (slots: MaterialSlot[]) => void;

    // Cue Actions [NEW]
    addCue: (name: string) => void;
    updateCue: (id: string) => void;
    removeCue: (id: string) => void;
    applyCue: (id: string) => void;

    setSelectedObject: (id: string | null) => void;
    setSelectedLight: (id: string | null) => void;  // Select stage light
    setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
    setGizmoEnabled: (enabled: boolean) => void; // [NEW]

    // Perfect Render Actions [NEW]
    setFloorPlanTexture: (url: string | null) => void; // [NEW]
    setPerfectRenderEnabled: (enabled: boolean) => void;
    setReflectionMirror: (value: number) => void;
    setReflectionBlur: (value: number) => void;
    setReflectionMetalness: (value: number) => void;
    setEnvPreset: (preset: string) => void;
    setEnvIntensity: (intensity: number) => void;
    setContactShadow: (enabled: boolean) => void;
    setToneMapping: (enabled: boolean) => void;
    updateSpotLight: (index: number, config: Partial<SpotLightConfig>) => void;
    updateObjectTransform: (id: string, pos: [number, number, number], rot: [number, number, number], scale: [number, number, number]) => void;

    // Stage Light CRUD
    addStageLight: (light: StageLight) => void;
    removeStageLight: (id: string) => void;
    updateStageLight: (id: string, updates: Partial<StageLight>) => void;
    duplicateStageLight: (id: string) => void;
    setStageLights: (lights: StageLight[]) => void;
    linkObject: (childId: string, parentId: string | null) => void; // [NEW] Link/unlink parent

    addView: (view: CameraView) => void;
    removeObject: (id: string) => void;
    updateObject: (id: string, patch: Partial<Omit<StageObject, 'id'>>) => void;

    // 機關系統 actions
    addNull: (node: NullNode) => void;
    updateNull: (id: string, patch: Partial<Omit<NullNode, 'id'>>) => void;
    removeNull: (id: string) => void;
    setObjectParent: (objectId: string, parentId: string | null) => void;
    addRig: (rig: RigControl) => void;
    updateRig: (id: string, patch: Partial<Omit<RigControl, 'id'>>) => void;
    removeRig: (id: string) => void;
    setRigValue: (rigId: string, value: number) => void;
    resetRigValues: () => void;
    animateRigValues: (target: Record<string, number>, duration?: number) => void;
    moveRig: (id: string, direction: -1 | 1) => void;
    setSelectedNull: (id: string | null) => void;

    // UI 共享狀態:左側小工具列展開(供 RigPanel 等浮動面板避讓)
    toolbarExpanded: boolean;
    setToolbarExpanded: (expanded: boolean) => void;

    // UI 共享狀態:左下 Cues/視角面板展開(供 RigPanel 收合按鈕對齊)
    bottomPanelExpanded: boolean;
    setBottomPanelExpanded: (expanded: boolean) => void;

    // 載入狀態:資產完成後是否已實際渲染出首幀(真實 loading 畫面的最終關卡)
    firstFrameRendered: boolean;
    setFirstFrameRendered: (rendered: boolean) => void;

    addContentTexture: (texture: ContentTexture) => void;
    removeContentTexture: (id: string) => void;
    updateContentTexture: (id: string, updates: Partial<ContentTexture>) => void;
    setActiveContent: (id: string | null) => void;
    setRenderMode: (mode: RenderMode) => void;
    setAmbientIntensity: (intensity: number) => void;
    setDirectionalIntensity: (intensity: number) => void;
    setMainLightAzimuth: (azimuth: number) => void;
    setMainLightElevation: (elevation: number) => void;
    setBloomIntensity: (intensity: number) => void;
    setBloomThreshold: (threshold: number) => void;
    setFov: (fov: number) => void; // [NEW]
    setVideoPlaying: (playing: boolean) => void;
    setVideoVolume: (volume: number) => void;
    setVideoCurrentTime: (time: number) => void;
    setVideoDuration: (duration: number) => void;
    setRecordingMode: (recording: boolean) => void;

    triggerCapture: () => void;
    confirmCapture: (cameraData: { position: [number, number, number], target: [number, number, number], fov: number }) => void;
    removeView: (id: string) => void;
    setActiveView: (id: string | null) => void;

    // Drawing & Screenshot Actions [NEW]
    setDrawingMode: (enabled: boolean) => void;
    showScreenshotToast: () => void;

    // Measurement Mode Actions [NEW]
    setMeasureMode: (enabled: boolean) => void;

    // Camera Stream Actions [NEW]
    setCameraStreamActive: (active: boolean) => void;
    setCameraStreamDeviceId: (deviceId: string | null) => void;
    setCameraStreamError: (error: string | null) => void;

    // Paper Figure Actions [NEW]
    setPaperFigureMode: (enabled: boolean) => void;
    addPaperFigure: (figure: PaperFigure) => void;
    removePaperFigure: (id: string) => void;
    updatePaperFigurePosition: (id: string, position: [number, number, number]) => void;
    updatePaperFigureScale: (id: string, scale: number) => void;
    clearAllPaperFigures: () => void;
    setPaperFigures: (figures: PaperFigure[]) => void;

    // Walk Mode Actions [NEW]
    setWalkMode: (enabled: boolean) => void;
    setWalkMoveInput: (input: { x: number; y: number }) => void;

    setLoading: (loading: boolean, message?: string) => void;
    loadState: (state: Partial<State>) => void;

    // Batch setters for loading project data
    setStageObjects: (objects: StageObject[]) => void;
    setViews: (views: CameraView[]) => void;
    setContentTextures: (textures: ContentTexture[]) => void;
    setCues: (cues: StageCue[]) => void; // [NEW]

    // R2 Video Actions [NEW]
    setR2Videos: (videos: R2Video[]) => void;
    setVideoFolders: (folders: VideoFolder[]) => void;
    addR2Video: (video: R2Video) => void;
    removeR2Video: (id: string) => void;
    updateR2Video: (id: string, updates: Partial<R2Video>) => void;
    addVideoFolder: (folder: VideoFolder) => void;
    updateVideoFolder: (id: string, updates: Partial<VideoFolder>) => void;
    removeVideoFolder: (id: string) => void;

    // GDrive Actions
    setGDriveVideos: (videos: GDriveVideo[]) => void;
    setAllGDriveFolders: (mapping: Record<string, string>) => void;
    setGDriveFolder: (projectId: string, folderId: string) => void;
    addGDriveVideo: (video: GDriveVideo) => void;
    removeGDriveVideo: (id: string) => void;
    updateGDriveVideo: (id: string, updates: Partial<GDriveVideo>) => void;

    // Timeline Cues [NEW]
    addTimelineCue: (videoId: string, cue: VideoTimelineCue) => void;
    removeTimelineCue: (videoId: string, cueId: string) => void;
    updateTimelineCue: (videoId: string, cueId: string, updates: Partial<VideoTimelineCue>) => void;
}

// ===== 機關值動畫(cue 切換時平滑過渡)=====
let rigAnimFrame: number | null = null;
function cancelRigAnimation() {
    if (rigAnimFrame !== null && typeof window !== 'undefined') {
        cancelAnimationFrame(rigAnimFrame);
        rigAnimFrame = null;
    }
}

/** 快照所有機關的有效值(未調整過的補上 defaultValue,確保 cue 完整且可重現) */
function snapshotRigValues(rigs: RigControl[], rigValues: Record<string, number>): Record<string, number> {
    const snapshot: Record<string, number> = {};
    rigs.forEach(r => { snapshot[r.id] = rigValues[r.id] ?? r.defaultValue; });
    return snapshot;
}

export const useStore = create<State>()(
    persist(
        (set, get) => ({
            mode: 'client',
            isMobile: false,
            stageObjects: [],
            views: [],
            cues: [],
            activeCueId: null,
            r2Videos: [],
            videoFolders: [],
            gdriveVideos: [],
            gdriveFolders: {},
            materialSlots: [],
            capturePending: false,
            activeViewId: null,
            contentTextures: [],
            activeContentId: null,
            renderMode: 'beauty',
            ambientIntensity: 0.8,
            directionalIntensity: 1.2,
            mainLightAzimuth: 45,
            mainLightElevation: 55,
            bloomIntensity: 0,
            bloomThreshold: 0.7,
            fov: 50, // Default FOV

            selectedObjectId: null,
            selectedLightId: null,
            selectedNullId: null,
            toolbarExpanded: false,
            bottomPanelExpanded: false,
            firstFrameRendered: false,
            transformMode: 'translate',
            gizmoEnabled: false, // [NEW] Default off

            // Drawing & Screenshot defaults
            drawingMode: false,
            screenshotToast: false,

            // Measurement Mode default
            measureMode: false,

            // Camera Stream defaults [NEW]
            cameraStreamActive: false,
            cameraStreamDeviceId: null,
            cameraStreamError: null,

            // Paper Figure defaults
            paperFigures: [],
            paperFigureMode: false,

            // Walk Mode defaults
            walkMode: false,
            walkMoveInput: { x: 0, y: 0 },

            // Floor Plan Texture default
            floorPlanTextureUrl: null,

            // Perfect Render defaults
            perfectRenderEnabled: false,
            reflectionMirror: 0.6,
            reflectionBlur: 8,
            reflectionMetalness: 0.8,
            envPreset: 'studio',
            envIntensity: 1.0,
            contactShadow: true,
            toneMapping: true,
            spotLights: [
                { name: '主燈 Key', position: [0, 12, 0] as [number, number, number], intensity: 3, angle: 0.6, distance: 30, color: '#ffffff', enabled: false, castShadow: true },
                { name: '補光 Fill', position: [8, 8, 8] as [number, number, number], intensity: 1.5, angle: 0.5, distance: 25, color: '#ffeedd', enabled: false, castShadow: false },
                { name: '背光 Rim', position: [-5, 6, -8] as [number, number, number], intensity: 1.0, angle: 0.4, distance: 20, color: '#ddeeff', enabled: false, castShadow: false },
            ],
            stageLights: [],

            // 機關系統
            nulls: [],
            rigs: [],
            rigValues: {},

            // Loading State
            isLoading: false,
            loadingMessage: '',

            videoPlaying: true,
            videoVolume: 0,
            videoCurrentTime: 0,
            videoDuration: 0,
            isRecordingMode: false,

            setMode: (mode) => set({ mode }),
            setIsMobile: (isMobile) => set({ isMobile }),
            addObject: (obj) => set((state) => ({
                stageObjects: [...state.stageObjects, obj],
                // When adding object, if Cue 0 exists, maybe we should update it? 
                // For now, let's keep it simple. User needs to update Cue 0 manually or we auto-update on save.
            })),
            updateObjectInstances: (id, instances) => set((state) => ({
                stageObjects: state.stageObjects.map(obj => obj.id === id ? { ...obj, instances } : obj)
            })),
            updateObjectMaterial: (id, materialId) => set((state) => ({
                stageObjects: state.stageObjects.map(obj => obj.id === id ? { ...obj, material_id: materialId } : obj)
            })),

            // --- Cue Actions ---
            addCue: (name) => set((state) => {
                const transforms: ObjectTransform[] = state.stageObjects.map(obj => {
                    const inst = obj.instances[0] || { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
                    return {
                        id: obj.id,
                        pos: inst.pos,
                        rot: inst.rot,
                        scale: inst.scale
                    };
                });

                // Snapshot light states
                const lightStates: StageLightState[] = state.stageLights.map(l => ({
                    id: l.id,
                    position: [...l.position] as [number, number, number],
                    rotation: [...l.rotation] as [number, number, number],
                    intensity: l.intensity,
                    color: l.color,
                    enabled: l.enabled,
                }));

                const newCue: StageCue = {
                    id: `cue_${Date.now()}`,
                    name,
                    transforms,
                    lightStates,
                    rigValues: snapshotRigValues(state.rigs, state.rigValues),
                    order: state.cues.length
                };

                return {
                    cues: [...state.cues, newCue],
                    activeCueId: newCue.id
                };
            }),

            updateCue: (id) => set((state) => {
                const transforms: ObjectTransform[] = state.stageObjects.map(obj => {
                    const inst = obj.instances[0] || { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
                    return {
                        id: obj.id,
                        pos: inst.pos,
                        rot: inst.rot,
                        scale: inst.scale
                    };
                });

                const lightStates: StageLightState[] = state.stageLights.map(l => ({
                    id: l.id,
                    position: [...l.position] as [number, number, number],
                    rotation: [...l.rotation] as [number, number, number],
                    intensity: l.intensity,
                    color: l.color,
                    enabled: l.enabled,
                }));

                return {
                    cues: state.cues.map(c => c.id === id
                        ? { ...c, transforms, lightStates, rigValues: snapshotRigValues(state.rigs, state.rigValues) }
                        : c)
                };
            }),

            removeCue: (id) => set((state) => ({
                cues: state.cues.filter(c => c.id !== id),
                activeCueId: state.activeCueId === id ? null : state.activeCueId
            })),

            applyCue: (id) => {
                const cue = get().cues.find(c => c.id === id);
                if (!cue) return;

                set((state) => {

                // Update all stage objects based on cue data
                const newObjects = state.stageObjects.map(obj => {
                    const transform = cue.transforms.find(t => t.id === obj.id);
                    if (transform) {
                        return {
                            ...obj,
                            instances: [{
                                pos: transform.pos,
                                rot: transform.rot,
                                scale: transform.scale
                            }]
                        };
                    }
                    return obj;
                });

                // Restore light states if present in cue
                let newLights = state.stageLights;
                if (cue.lightStates && cue.lightStates.length > 0) {
                    newLights = state.stageLights.map(light => {
                        const saved = cue.lightStates!.find(ls => ls.id === light.id);
                        if (saved) {
                            return {
                                ...light,
                                position: saved.position,
                                rotation: saved.rotation,
                                intensity: saved.intensity,
                                color: saved.color,
                                enabled: saved.enabled,
                            };
                        }
                        return light;
                    });
                }

                return {
                    stageObjects: newObjects,
                    stageLights: newLights,
                    activeCueId: id
                };
                });

                // 機關值:平滑動畫過渡到 cue 的快照(滑桿與場景同步動)
                if (cue.rigValues && Object.keys(cue.rigValues).length > 0) {
                    get().animateRigValues(cue.rigValues, 800);
                }
            },

            setSelectedObject: (id) => set({ selectedObjectId: id, selectedLightId: null, selectedNullId: null }),
            setSelectedLight: (id) => set({ selectedLightId: id, selectedObjectId: null, selectedNullId: null }),
            setSelectedNull: (id) => set({ selectedNullId: id, selectedObjectId: null, selectedLightId: null }),
            setTransformMode: (mode) => set({ transformMode: mode }),
            setGizmoEnabled: (enabled) => set({
                gizmoEnabled: enabled,
                selectedObjectId: enabled ? null : null,
                selectedLightId: enabled ? null : null,
                selectedNullId: enabled ? null : null,
            }),

            // Floor Plan Texture Action
            setFloorPlanTexture: (url) => set({ floorPlanTextureUrl: url }),

            // Perfect Render Actions
            setPerfectRenderEnabled: (enabled) => set({ perfectRenderEnabled: enabled }),
            setReflectionMirror: (value) => set({ reflectionMirror: value }),
            setReflectionBlur: (value) => set({ reflectionBlur: value }),
            setReflectionMetalness: (value) => set({ reflectionMetalness: value }),
            setEnvPreset: (preset) => set({ envPreset: preset }),
            setEnvIntensity: (intensity) => set({ envIntensity: intensity }),
            setContactShadow: (enabled) => set({ contactShadow: enabled }),
            setToneMapping: (enabled) => set({ toneMapping: enabled }),
            updateSpotLight: (index, config) => set((state) => ({
                spotLights: state.spotLights.map((light, i) =>
                    i === index ? { ...light, ...config } : light
                ),
            })),

            // --- Stage Light CRUD ---
            addStageLight: (light) => set((state) => ({
                stageLights: [...state.stageLights, light]
            })),
            removeStageLight: (id) => set((state) => ({
                stageLights: state.stageLights.filter(l => l.id !== id),
                selectedLightId: state.selectedLightId === id ? null : state.selectedLightId,
            })),
            updateStageLight: (id, updates) => set((state) => ({
                stageLights: state.stageLights.map(l =>
                    l.id === id ? { ...l, ...updates } : l
                ),
            })),
            duplicateStageLight: (id) => set((state) => {
                const src = state.stageLights.find(l => l.id === id);
                if (!src) return {};
                const dup: StageLight = {
                    ...src,
                    id: `light_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name: `${src.name} (copy)`,
                    position: [src.position[0] + 1, src.position[1], src.position[2]] as [number, number, number],
                };
                return { stageLights: [...state.stageLights, dup] };
            }),
            setStageLights: (lights) => set({ stageLights: lights }),

            updateObjectTransform: (id, pos, rot, scale) => set((state) => ({
                stageObjects: state.stageObjects.map(obj => {
                    if (obj.id === id) {
                        return {
                            ...obj,
                            instances: [{ pos, rot, scale }]
                        };
                    }
                    return obj;
                })
            })),

            linkObject: (childId, parentId) => set((state) => ({
                stageObjects: state.stageObjects.map(obj => {
                    if (obj.id === childId) {
                        return {
                            ...obj,
                            parentId: parentId ?? undefined
                        };
                    }
                    return obj;
                })
            })),

            addView: (view) => set((state) => ({ views: [...state.views, view] })),

            updateObject: (id, patch) => set((state) => ({
                stageObjects: state.stageObjects.map(obj =>
                    obj.id === id ? { ...obj, ...patch, id: obj.id } : obj
                )
            })),

            removeObject: (id) => set((state) => ({
                stageObjects: state.stageObjects.filter(obj => obj.id !== id),
                // 級聯清除指向此物件的機關
                rigs: state.rigs.filter(r => !(r.targetType === 'object' && r.targetId === id))
            })),

            // ===== 機關系統 actions =====
            addNull: (node) => set((state) => ({ nulls: [...state.nulls, node] })),

            updateNull: (id, patch) => set((state) => ({
                nulls: state.nulls.map(n => n.id === id ? { ...n, ...patch, id: n.id } : n)
            })),

            // 刪除 Null:子節點與子物件重新掛回其 parent,世界位置保持不變;
            // 指向此 Null 的機關一併清除。
            removeNull: (id) => set((state) => {
                const node = state.nulls.find(n => n.id === id);
                if (!node) return {};

                const nodeLocal = nullLocalMatrix(node);
                const identity = new THREE.Matrix4();

                const nulls = state.nulls
                    .filter(n => n.id !== id)
                    .map(n => {
                        if (n.parentId !== id) return n;
                        // 在 node.parentId 的空間裡:新本地變換 = nodeLocal ∘ 原本地變換
                        const { pos, rot } = reparentTransform(n.pos, n.rot, nodeLocal, identity);
                        return { ...n, parentId: node.parentId, pos, rot };
                    });

                const stageObjects = state.stageObjects.map(o => {
                    if (o.parentId !== id) return o;
                    const instances = o.instances.map(inst => {
                        const { pos, rot } = reparentTransform(inst.pos, inst.rot, nodeLocal, identity);
                        return { ...inst, pos, rot };
                    });
                    return { ...o, parentId: node.parentId, instances };
                });

                const rigs = state.rigs.filter(r => !(r.targetType === 'null' && r.targetId === id));

                return {
                    nulls, stageObjects, rigs,
                    selectedNullId: state.selectedNullId === id ? null : state.selectedNullId,
                };
            }),

            // 換 parent 但保持世界位置不變(Object3D.attach 語意)。
            // 座標轉換以「基底」transform 為準,不含機關偏移。
            setObjectParent: (objectId, parentId) => set((state) => {
                const obj = state.stageObjects.find(o => o.id === objectId);
                if (!obj) return {};
                if ((obj.parentId ?? null) === parentId) return {};

                const fromWorld = nullWorldMatrix(obj.parentId ?? null, state.nulls);
                const toWorld = nullWorldMatrix(parentId, state.nulls);

                const instances = obj.instances.map(inst => {
                    const { pos, rot } = reparentTransform(inst.pos, inst.rot, fromWorld, toWorld);
                    return { ...inst, pos, rot };
                });

                return {
                    stageObjects: state.stageObjects.map(o =>
                        o.id === objectId ? { ...o, parentId, instances } : o
                    )
                };
            }),

            addRig: (rig) => set((state) => ({ rigs: [...state.rigs, rig] })),

            updateRig: (id, patch) => set((state) => ({
                rigs: state.rigs.map(r => r.id === id ? { ...r, ...patch, id: r.id } : r)
            })),

            removeRig: (id) => set((state) => {
                const rigValues = { ...state.rigValues };
                delete rigValues[id];
                return { rigs: state.rigs.filter(r => r.id !== id), rigValues };
            }),

            setRigValue: (rigId, value) => {
                cancelRigAnimation(); // 手動拖動優先,中斷 cue 動畫
                set((state) => ({
                    rigValues: { ...state.rigValues, [rigId]: value }
                }));
            },

            resetRigValues: () => {
                cancelRigAnimation();
                set({ rigValues: {} });
            },

            // 機關值補間動畫:easeInOutQuad,驅動 store 更新 → 滑桿 UI 與 3D 場景同步反應
            animateRigValues: (target, duration = 800) => {
                cancelRigAnimation();
                if (typeof window === 'undefined' || duration <= 0) {
                    set((state) => ({ rigValues: { ...state.rigValues, ...target } }));
                    return;
                }

                const stateNow = get();
                const from: Record<string, number> = {};
                for (const id of Object.keys(target)) {
                    const rig = stateNow.rigs.find(r => r.id === id);
                    if (!rig || !Number.isFinite(target[id])) continue; // 已刪除的機關或壞值跳過
                    from[id] = stateNow.rigValues[id] ?? rig.defaultValue;
                }
                const keys = Object.keys(from);
                if (keys.length === 0) return;

                const start = performance.now();
                const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
                const step = (now: number) => {
                    const t = Math.min(1, (now - start) / duration);
                    const e = ease(t);
                    const next: Record<string, number> = {};
                    keys.forEach(k => { next[k] = from[k] + (target[k] - from[k]) * e; });
                    set((state) => ({ rigValues: { ...state.rigValues, ...next } }));
                    rigAnimFrame = t < 1 ? requestAnimationFrame(step) : null;
                };
                rigAnimFrame = requestAnimationFrame(step);
            },

            setToolbarExpanded: (expanded) => set({ toolbarExpanded: expanded }),
            setBottomPanelExpanded: (expanded) => set({ bottomPanelExpanded: expanded }),
            setFirstFrameRendered: (rendered) => set({ firstFrameRendered: rendered }),

            // 調整機關在列表/客戶端面板中的顯示順序(陣列順序即顯示順序,會隨專案同步)
            moveRig: (id, direction) => set((state) => {
                const idx = state.rigs.findIndex(r => r.id === id);
                if (idx < 0) return {};
                const j = idx + direction;
                if (j < 0 || j >= state.rigs.length) return {};
                const rigs = [...state.rigs];
                [rigs[idx], rigs[j]] = [rigs[j], rigs[idx]];
                return { rigs };
            }),

            addContentTexture: (texture) => set((state) => ({
                contentTextures: [...state.contentTextures, texture],
                // Auto-select first uploaded content
                activeContentId: state.activeContentId ?? texture.id
            })),
            removeContentTexture: (id) => set((state) => ({
                contentTextures: state.contentTextures.filter(t => t.id !== id),
                // Clear selection if deleted content was active
                activeContentId: state.activeContentId === id ? null : state.activeContentId
            })),
            updateContentTexture: (id, updates) => set((state) => ({
                contentTextures: state.contentTextures.map(t =>
                    t.id === id ? { ...t, ...updates } : t
                )
            })),
            setActiveContent: (id) => set({ activeContentId: id }),
            setRenderMode: (mode) => set({ renderMode: mode }),
            setAmbientIntensity: (intensity) => set({ ambientIntensity: intensity }),
            setDirectionalIntensity: (intensity) => set({ directionalIntensity: intensity }),
            setMainLightAzimuth: (azimuth) => set({ mainLightAzimuth: azimuth }),
            setMainLightElevation: (elevation) => set({ mainLightElevation: elevation }),
            setBloomIntensity: (intensity) => set({ bloomIntensity: intensity }),
            setBloomThreshold: (threshold) => set({ bloomThreshold: threshold }),
            setFov: (fov) => set({ fov }),
            setVideoPlaying: (playing) => set({ videoPlaying: playing }),
            setVideoVolume: (volume) => set({ videoVolume: volume }),
            setVideoCurrentTime: (time) => set({ videoCurrentTime: time }),
            setVideoDuration: (duration) => set({ videoDuration: duration }),
            setRecordingMode: (recording) => set({ isRecordingMode: recording }),

            triggerCapture: () => set({ capturePending: true }),
            confirmCapture: (data) => set((state) => {
                const newView: CameraView = {
                    id: `view_${Date.now()}`,
                    name: `View ${state.views.length + 1}`,
                    camera: data,
                    order: state.views.length + 1
                };
                return { views: [...state.views, newView], capturePending: false };
            }),
            removeView: (id) => set((state) => ({
                views: state.views.filter(v => v.id !== id),
                activeViewId: state.activeViewId === id ? null : state.activeViewId
            })),
            setActiveView: (id) => set({ activeViewId: id }),

            // Drawing & Screenshot
            setDrawingMode: (enabled) => set({ drawingMode: enabled }),
            showScreenshotToast: () => {
                set({ screenshotToast: true });
                setTimeout(() => set({ screenshotToast: false }), 2000);
            },

            // Measurement Mode (mutually exclusive with other interactive modes)
            setMeasureMode: (enabled) => set({
                measureMode: enabled,
                ...(enabled ? { drawingMode: false, paperFigureMode: false, walkMode: false } : {}),
            }),

            // Camera Stream Actions [NEW]
            setCameraStreamActive: (active) => set({ cameraStreamActive: active }),
            setCameraStreamDeviceId: (deviceId) => set({ cameraStreamDeviceId: deviceId }),
            setCameraStreamError: (error) => {
                set({ cameraStreamError: error });
                if (error) {
                    setTimeout(() => set({ cameraStreamError: null }), 2000);
                }
            },

            // Paper Figure Actions
            setPaperFigureMode: (enabled) => set({ paperFigureMode: enabled }),
            addPaperFigure: (figure) => set((state) => ({
                paperFigures: [...state.paperFigures, figure]
            })),
            removePaperFigure: (id) => set((state) => ({
                paperFigures: state.paperFigures.filter(f => f.id !== id)
            })),
            updatePaperFigurePosition: (id, position) => set((state) => ({
                paperFigures: state.paperFigures.map(f => f.id === id ? { ...f, position } : f)
            })),
            updatePaperFigureScale: (id, scale) => set((state) => ({
                paperFigures: state.paperFigures.map(f => f.id === id ? { ...f, scale } : f)
            })),
            clearAllPaperFigures: () => set({ paperFigures: [] }),
            setPaperFigures: (figures) => set({ paperFigures: figures }),

            // Walk Mode Actions
            setWalkMode: (enabled) => set({ walkMode: enabled }),
            setWalkMoveInput: (input) => set({ walkMoveInput: input }),

            setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),
            loadState: (newState) => set((state) => ({
                ...state,
                ...newState,
                // Ensure activeCueId is reset if not loading it? 
                // Actually if loading project, we might want to preserve it or reset to null.
                // Let's trust newState.
            })),

            // Batch setters for loading project data
            setStageObjects: (objects) => set({ stageObjects: objects }),
            setViews: (views) => set({ views }),
            setContentTextures: (textures) => set({ contentTextures: textures }),
            setCues: (cues) => set({ cues }), // [NEW]

            // R2 Video Actions [NEW]
            setR2Videos: (videos) => set({ r2Videos: videos }),
            setVideoFolders: (folders) => set({ videoFolders: folders }),
            addR2Video: (video) => set((state) => ({
                r2Videos: [...state.r2Videos, video]
            })),
            removeR2Video: (id) => set((state) => ({
                r2Videos: state.r2Videos.filter(v => v.id !== id),
            })),
            updateR2Video: (id, updates) => set((state) => ({
                r2Videos: state.r2Videos.map(v =>
                    v.id === id ? { ...v, ...updates } : v
                ),
            })),
            addVideoFolder: (folder) => set((state) => ({
                videoFolders: [...state.videoFolders, folder]
            })),
            updateVideoFolder: (id, updates) => set((state) => ({
                videoFolders: state.videoFolders.map(f =>
                    f.id === id ? { ...f, ...updates } : f
                ),
            })),
            removeVideoFolder: (id) => set((state) => ({
                videoFolders: state.videoFolders.filter(f => f.id !== id),
                // Move videos back to uncategorized by dropping the folderId
                r2Videos: state.r2Videos.map(v => v.folderId === id ? { ...v, folderId: undefined } : v)
            })),

            // GDrive Actions
            setGDriveVideos: (videos) => set({ gdriveVideos: videos }),
            setAllGDriveFolders: (mapping) => set({ gdriveFolders: mapping }),
            setGDriveFolder: (projectId, folderId) => set((state) => ({
                gdriveFolders: { ...state.gdriveFolders, [projectId]: folderId }
            })),
            addGDriveVideo: (video) => set((state) => ({
                gdriveVideos: [...state.gdriveVideos, video]
            })),
            removeGDriveVideo: (id) => set((state) => ({
                gdriveVideos: state.gdriveVideos.filter(v => v.id !== id),
            })),
            updateGDriveVideo: (id, updates) => set((state) => ({
                gdriveVideos: state.gdriveVideos.map(v =>
                    v.id === id ? { ...v, ...updates } : v
                ),
            })),

            // Timeline Cues
            addTimelineCue: (videoId, cue) => set((state) => {
                const mapCues = (cues: VideoTimelineCue[] = []) => [...cues, cue].sort((a, b) => a.time - b.time);
                return {
                    r2Videos: state.r2Videos.map(v => v.id === videoId ? { ...v, timelineCues: mapCues(v.timelineCues) } : v),
                    gdriveVideos: state.gdriveVideos.map(v => v.id === videoId ? { ...v, timelineCues: mapCues(v.timelineCues) } : v),
                    contentTextures: state.contentTextures.map(t => t.id === videoId ? { ...t, timelineCues: mapCues(t.timelineCues) } : t),
                };
            }),
            removeTimelineCue: (videoId, cueId) => set((state) => {
                const filterCues = (cues: VideoTimelineCue[] = []) => cues.filter(c => c.id !== cueId);
                return {
                    r2Videos: state.r2Videos.map(v => v.id === videoId ? { ...v, timelineCues: filterCues(v.timelineCues) } : v),
                    gdriveVideos: state.gdriveVideos.map(v => v.id === videoId ? { ...v, timelineCues: filterCues(v.timelineCues) } : v),
                    contentTextures: state.contentTextures.map(t => t.id === videoId ? { ...t, timelineCues: filterCues(t.timelineCues) } : t),
                };
            }),
            updateTimelineCue: (videoId, cueId, updates) => set((state) => {
                const updateCues = (cues: VideoTimelineCue[] = []) => cues.map(c => c.id === cueId ? { ...c, ...updates } : c).sort((a, b) => a.time - b.time);
                return {
                    r2Videos: state.r2Videos.map(v => v.id === videoId ? { ...v, timelineCues: updateCues(v.timelineCues) } : v),
                    gdriveVideos: state.gdriveVideos.map(v => v.id === videoId ? { ...v, timelineCues: updateCues(v.timelineCues) } : v),
                    contentTextures: state.contentTextures.map(t => t.id === videoId ? { ...t, timelineCues: updateCues(t.timelineCues) } : t),
                };
            }),

            // Material Slots Actions
            addMaterialSlot: (slot) => set((state) => ({ materialSlots: [...state.materialSlots, slot] })),
            updateMaterialSlot: (id, updates) => set((state) => ({ 
                materialSlots: state.materialSlots.map(s => s.id === id ? { ...s, ...updates } : s) 
            })),
            removeMaterialSlot: (id) => set((state) => ({ 
                materialSlots: state.materialSlots.filter(s => s.id !== id) 
            })),
            setMaterialSlots: (slots) => set({ materialSlots: slots }),
        }),
        {
            name: 'stage-preview-storage', // localStorage key
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Persist these fields (contentTextures now safe with Cloudinary URLs)
                stageObjects: state.stageObjects,
                views: state.views,
                activeViewId: state.activeViewId,
                contentTextures: state.contentTextures,
                activeContentId: state.activeContentId,
                cues: state.cues, // [NEW]
                activeCueId: state.activeCueId, // [NEW]
                fov: state.fov, // [NEW]
                r2Videos: state.r2Videos, // [NEW]
                videoFolders: state.videoFolders, // [NEW]
                gdriveVideos: state.gdriveVideos,
                gdriveFolders: state.gdriveFolders,
                paperFigures: state.paperFigures, // [NEW]
                floorPlanTextureUrl: state.floorPlanTextureUrl, // [NEW]
                stageLights: state.stageLights, // Stage lighting system
                materialSlots: state.materialSlots, // Custom material slots
                // 機關系統:定義持久化,rigValues(當前值)刻意不持久化
                nulls: state.nulls,
                rigs: state.rigs,
            }),
            // Migration: convert old spotLights to stageLights on hydration
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                // If stageLights is empty but old spotLights exist, migrate them
                if ((!state.stageLights || state.stageLights.length === 0) && state.spotLights && state.spotLights.length > 0) {
                    state.stageLights = state.spotLights.map((old, i) => ({
                        id: `light_migrated_${i}_${Date.now()}`,
                        name: old.name,
                        type: 'spot' as StageLightType,
                        position: old.position,
                        rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
                        intensity: old.intensity,
                        color: old.color,
                        enabled: false, // Disabled by default - lighting system not ready for client display
                        castShadow: old.castShadow,
                        angle: old.angle,
                        penumbra: 0.8,
                        distance: old.distance,
                    }));
                }
            },
        }
    )
);
