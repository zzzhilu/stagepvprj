import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MaterialId } from '@/lib/materials';

// Types based on SAD 5.1 & 5.2
export type ModelType = 'venues' | 'stage' | 'static_LED' | 'moving_LED' | 'basic_camera';

export interface Instance {
    pos: [number, number, number];
    rot: [number, number, number];
    scale: [number, number, number];
}

export interface StageObject {
    id: string; // unique ID for internal tracking
    model_path: string;
    material_id: MaterialId;
    instances: Instance[];
    type: ModelType; // Model category type
    meshNames?: string[]; // Optional: specific mesh names to filter from the GLB
}


export type TextureType = 'image' | 'video';

export interface ContentTexture {
    id: string;
    name: string;
    file_path: string;
    type: TextureType; // 'image' or 'video'
    thumbnail_url?: string;
    file_size?: number; // bytes
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
    capturePending: boolean;
    activeViewId: string | null;
    contentTextures: ContentTexture[];
    activeContentId: string | null; // Currently selected content for display
    renderMode: RenderMode;
    ambientIntensity: number;
    directionalIntensity: number;
    bloomIntensity: number;
    bloomThreshold: number;

    // Loading State
    isLoading: boolean;
    loadingMessage: string;

    videoPlaying: boolean;
    videoVolume: number;
    videoCurrentTime: number;
    videoDuration: number;
    isRecordingMode: boolean; // Recording checkbox state

    setMode: (mode: 'admin' | 'client') => void;
    setIsMobile: (isMobile: boolean) => void;
    addObject: (obj: StageObject) => void;
    updateObjectInstances: (id: string, instances: Instance[]) => void;
    updateObjectMaterial: (id: string, materialId: MaterialId) => void;
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
    setVideoPlaying: (playing: boolean) => void;
    setVideoVolume: (volume: number) => void;
    setVideoCurrentTime: (time: number) => void;
    setVideoDuration: (duration: number) => void;
    setRecordingMode: (recording: boolean) => void;

    triggerCapture: () => void;
    confirmCapture: (cameraData: { position: [number, number, number], target: [number, number, number], fov: number }) => void;
    removeView: (id: string) => void;
    setActiveView: (id: string | null) => void;

    setLoading: (loading: boolean, message?: string) => void;
    loadState: (state: Partial<State>) => void;

    // Batch setters for loading project data
    setStageObjects: (objects: StageObject[]) => void;
    setViews: (views: CameraView[]) => void;
    setContentTextures: (textures: ContentTexture[]) => void;
}

export const useStore = create<State>()(
    persist(
        (set) => ({
            mode: 'client',
            isMobile: false,
            stageObjects: [],
            views: [],
            capturePending: false,
            activeViewId: null,
            contentTextures: [],
            activeContentId: null,
            renderMode: 'beauty',
            ambientIntensity: 0.8,
            directionalIntensity: 1.2,
            bloomIntensity: 0.3,
            bloomThreshold: 0.5,


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
            addObject: (obj) => set((state) => ({ stageObjects: [...state.stageObjects, obj] })),
            updateObjectInstances: (id, instances) => set((state) => ({
                stageObjects: state.stageObjects.map(obj => obj.id === id ? { ...obj, instances } : obj)
            })),
            updateObjectMaterial: (id, materialId) => set((state) => ({
                stageObjects: state.stageObjects.map(obj => obj.id === id ? { ...obj, material_id: materialId } : obj)
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

            setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),
            loadState: (newState) => set((state) => ({
                ...state,
                ...newState,
                // Ensure we don't accidentally overwrite unrelated UI state if not provided
            })),

            // Batch setters for loading project data
            setStageObjects: (objects) => set({ stageObjects: objects }),
            setViews: (views) => set({ views }),
            setContentTextures: (textures) => set({ contentTextures: textures }),
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
            }),
        }
    )
);
