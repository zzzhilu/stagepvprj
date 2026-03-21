import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MaterialId } from '@/lib/materials';

// Types based on SAD 5.1 & 5.2
export type ModelType = 'venues' | 'stage' | 'static_LED' | 'moving_LED' | 'moving_prop' | 'basic_camera';

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
    parentId?: string; // [NEW] ID of parent object for linked movement
}


export type TextureType = 'image' | 'video' | 'r2_video';

export interface ContentTexture {
    id: string;
    name: string;
    file_path: string;
    type: TextureType; // 'image', 'video', or 'r2_video'
    thumbnail_url?: string;
    file_size?: number; // bytes
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

// R2 Video for Image Progress feature
export interface R2Video {
    id: string;           // Unique video ID (for share links)
    filename: string;     // Original filename (for watermark)
    r2_url: string;       // Full R2 URL
    uploadedAt: number;   // Timestamp
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

export type RenderMode = 'wireframe' | 'beauty' | 'clay';

interface State {
    mode: 'admin' | 'client';
    isMobile: boolean;
    stageObjects: StageObject[];
    views: CameraView[];
    cues: StageCue[];          // [NEW] List of saved cues
    activeCueId: string | null; // [NEW] Current applied cue
    r2Videos: R2Video[];        // [NEW] R2 videos for Image Progress

    capturePending: boolean;
    activeViewId: string | null;
    contentTextures: ContentTexture[];
    activeContentId: string | null;
    renderMode: RenderMode;
    ambientIntensity: number;
    directionalIntensity: number;
    bloomIntensity: number;
    bloomThreshold: number;
    fov: number; // [NEW] Global FOV state

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
    transformMode: 'translate' | 'rotate' | 'scale';
    gizmoEnabled: boolean; // [NEW] Toggle for transform controls

    // Drawing & Screenshot State [NEW]
    drawingMode: boolean;
    screenshotToast: boolean;

    // Paper Figure State [NEW]
    paperFigures: PaperFigure[];
    paperFigureMode: boolean;

    // Perfect Render Mode [NEW]
    perfectRenderEnabled: boolean;
    reflectionMirror: number;      // 0-1
    reflectionBlur: number;        // 0-20
    reflectionMetalness: number;   // 0-1
    envPreset: string;             // 'studio' | 'city' | 'sunset' | 'warehouse' | 'forest' | 'apartment' | 'park' | 'lobby'
    envIntensity: number;          // 0-3
    contactShadow: boolean;
    toneMapping: boolean;
    spotLights: SpotLightConfig[];  // Controllable spotlights

    setMode: (mode: 'admin' | 'client') => void;
    setIsMobile: (isMobile: boolean) => void;
    addObject: (obj: StageObject) => void;
    updateObjectInstances: (id: string, instances: Instance[]) => void;
    updateObjectMaterial: (id: string, materialId: MaterialId) => void;

    // Cue Actions [NEW]
    addCue: (name: string) => void;
    updateCue: (id: string) => void;
    removeCue: (id: string) => void;
    applyCue: (id: string) => void;

    setSelectedObject: (id: string | null) => void;
    setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
    setGizmoEnabled: (enabled: boolean) => void; // [NEW]

    // Perfect Render Actions [NEW]
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
    linkObject: (childId: string, parentId: string | null) => void; // [NEW] Link/unlink parent

    addView: (view: CameraView) => void;
    removeObject: (id: string) => void;
    addContentTexture: (texture: ContentTexture) => void;
    removeContentTexture: (id: string) => void;
    setActiveContent: (id: string | null) => void;
    setRenderMode: (mode: RenderMode) => void;
    setAmbientIntensity: (intensity: number) => void;
    setDirectionalIntensity: (intensity: number) => void;
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

    // Paper Figure Actions [NEW]
    setPaperFigureMode: (enabled: boolean) => void;
    addPaperFigure: (figure: PaperFigure) => void;
    removePaperFigure: (id: string) => void;
    updatePaperFigurePosition: (id: string, position: [number, number, number]) => void;
    updatePaperFigureScale: (id: string, scale: number) => void;
    clearAllPaperFigures: () => void;
    setPaperFigures: (figures: PaperFigure[]) => void;

    setLoading: (loading: boolean, message?: string) => void;
    loadState: (state: Partial<State>) => void;

    // Batch setters for loading project data
    setStageObjects: (objects: StageObject[]) => void;
    setViews: (views: CameraView[]) => void;
    setContentTextures: (textures: ContentTexture[]) => void;
    setCues: (cues: StageCue[]) => void; // [NEW]

    // R2 Video Actions [NEW]
    setR2Videos: (videos: R2Video[]) => void;
    addR2Video: (video: R2Video) => void;
    removeR2Video: (id: string) => void;
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
            capturePending: false,
            activeViewId: null,
            contentTextures: [],
            activeContentId: null,
            renderMode: 'beauty',
            ambientIntensity: 0.8,
            directionalIntensity: 1.2,
            bloomIntensity: 0,
            bloomThreshold: 0.7,
            fov: 50, // Default FOV

            selectedObjectId: null,
            transformMode: 'translate',
            gizmoEnabled: false, // [NEW] Default off

            // Drawing & Screenshot defaults
            drawingMode: false,
            screenshotToast: false,

            // Paper Figure defaults
            paperFigures: [],
            paperFigureMode: false,

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
                { name: '主燈 Key', position: [0, 12, 0] as [number, number, number], intensity: 3, angle: 0.6, distance: 30, color: '#ffffff', enabled: true, castShadow: true },
                { name: '補光 Fill', position: [8, 8, 8] as [number, number, number], intensity: 1.5, angle: 0.5, distance: 25, color: '#ffeedd', enabled: true, castShadow: false },
                { name: '背光 Rim', position: [-5, 6, -8] as [number, number, number], intensity: 1.0, angle: 0.4, distance: 20, color: '#ddeeff', enabled: true, castShadow: false },
            ],

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
                    // Assuming instances[0] is the main transform for now as per current requirement (simpler model)
                    // If we have multiple instances per object, we might need a more complex structure.
                    // Based on "updateObjectTransform" below, we seem to be treating the first instance as THE object.
                    const inst = obj.instances[0] || { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
                    return {
                        id: obj.id,
                        pos: inst.pos,
                        rot: inst.rot,
                        scale: inst.scale
                    };
                });

                const newCue: StageCue = {
                    id: `cue_${Date.now()}`,
                    name,
                    transforms,
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

                return {
                    cues: state.cues.map(c => c.id === id ? { ...c, transforms } : c)
                };
            }),

            removeCue: (id) => set((state) => ({
                cues: state.cues.filter(c => c.id !== id),
                activeCueId: state.activeCueId === id ? null : state.activeCueId
            })),

            applyCue: (id) => set((state) => {
                const cue = state.cues.find(c => c.id === id);
                if (!cue) return {};

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

                return {
                    stageObjects: newObjects,
                    activeCueId: id
                };
            }),

            setSelectedObject: (id) => set({ selectedObjectId: id }),
            setTransformMode: (mode) => set({ transformMode: mode }),
            setGizmoEnabled: (enabled) => set({
                gizmoEnabled: enabled,
                selectedObjectId: enabled ? null : null // Clear selection when toggling
            }),

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

            removeObject: (id) => set((state) => ({
                stageObjects: state.stageObjects.filter(obj => obj.id !== id)
            })),
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
            setActiveContent: (id) => set({ activeContentId: id }),
            setRenderMode: (mode) => set({ renderMode: mode }),
            setAmbientIntensity: (intensity) => set({ ambientIntensity: intensity }),
            setDirectionalIntensity: (intensity) => set({ directionalIntensity: intensity }),
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
            addR2Video: (video) => set((state) => ({
                r2Videos: [...state.r2Videos, video]
            })),
            removeR2Video: (id) => set((state) => ({
                r2Videos: state.r2Videos.filter(v => v.id !== id)
            })),
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
                paperFigures: state.paperFigures, // [NEW]
            }),
        }
    )
);
