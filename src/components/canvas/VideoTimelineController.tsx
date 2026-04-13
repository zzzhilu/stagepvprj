import { useFrame } from '@react-three/fiber';
import { useStore, VideoTimelineCue } from '@/store/useStore';
import * as THREE from 'three';
import { useRef } from 'react';
import { globalVideoElement } from './VideoManager';

// Helper function for shortest path angle interpolation
function lerpAngle(start: number, end: number, t: number) {
    let diff = (end - start) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return start + diff * t;
}

export function VideoTimelineController() {
    const lastUpdateRef = useRef(0);
    const lastTimeRef = useRef(-1);

    useFrame(() => {
        const state = useStore.getState();
        const activeContentId = state.activeContentId;
        if (!activeContentId) return;

        const content = state.contentTextures.find(c => c.id === activeContentId);
        if (!content || !content.timelineCues || content.timelineCues.length === 0) return;

        // Use global video element time for more precision at 60fps, fallback to Zustand state if unmounted
        const videoTime = globalVideoElement ? globalVideoElement.currentTime : state.videoCurrentTime;
        
        // Skip if playhead hasn't moved
        if (videoTime === lastTimeRef.current) return;

        const now = performance.now();
        const isPaused = globalVideoElement ? globalVideoElement.paused : !state.videoPlaying;
        
        // Target ~15 FPS React updates to avoid React render lockups. 
        // 15 FPS = 66ms (StageObjectRenderer uses useFrame lerping to make 15FPS look like 60FPS)
        // If it's paused (e.g. scrubbing), we update immediately so UI matches the exact timeline frame.
        if (!isPaused && now - lastUpdateRef.current < 66) return;

        lastUpdateRef.current = now;
        lastTimeRef.current = videoTime;
        
        const cues = content.timelineCues;
        if (cues.length === 0) return;
        
        const sortedCues = [...cues].sort((a, b) => a.time - b.time);

        // Find the active cue based on videoTime (latest cue passed)
        let lastCueIdx = -1;
        for (let i = sortedCues.length - 1; i >= 0; i--) {
            if (videoTime >= sortedCues[i].time) {
                lastCueIdx = i;
                break;
            }
        }

        let timelineCueA: VideoTimelineCue;
        let timelineCueB: VideoTimelineCue;
        let progress = 1;

        if (lastCueIdx === -1) {
            // Before the first cue, just default to first cue state
            timelineCueA = sortedCues[0];
            timelineCueB = sortedCues[0];
            progress = 1;
        } else {
            timelineCueB = sortedCues[lastCueIdx];
            // Previous cue target
            timelineCueA = lastCueIdx > 0 ? sortedCues[lastCueIdx - 1] : sortedCues[0];

            const duration = timelineCueB.duration || 0;
            // Transition window starts exactly at the cue time and lasts for 'duration'
            if (duration > 0 && videoTime < timelineCueB.time + duration && timelineCueA.cueId !== timelineCueB.cueId) {
                progress = (videoTime - timelineCueB.time) / duration;
                progress = Math.max(0, Math.min(1, progress));
                // Apply ease-in-out quadratic easing
                progress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            } else {
                progress = 1;
            }
        }

        const stageCueA = state.cues.find(c => c.id === timelineCueA.cueId);
        const stageCueB = state.cues.find(c => c.id === timelineCueB.cueId);
        if (!stageCueB || !stageCueA) return;
        const targetCueB = stageCueB;

        let hasChanges = false;
        
        const newObjects = state.stageObjects.map(obj => {
            const transformA = stageCueA.transforms?.find(t => t.id === obj.id);
            if (!transformA) return obj; // Object not present in cueA, ignore

            const transformB = targetCueB.transforms?.find(t => t.id === obj.id) || transformA;

            const newPos: [number, number, number] = [
                THREE.MathUtils.lerp(transformA.pos[0], transformB.pos[0], progress),
                THREE.MathUtils.lerp(transformA.pos[1], transformB.pos[1], progress),
                THREE.MathUtils.lerp(transformA.pos[2], transformB.pos[2], progress)
            ];

            // Shortest angle path interpolation for rotation
            const newRot: [number, number, number] = [
                lerpAngle(transformA.rot[0], transformB.rot[0], progress),
                lerpAngle(transformA.rot[1], transformB.rot[1], progress),
                lerpAngle(transformA.rot[2], transformB.rot[2], progress)
            ];

            const newScale: [number, number, number] = [
                THREE.MathUtils.lerp(transformA.scale[0], transformB.scale[0], progress),
                THREE.MathUtils.lerp(transformA.scale[1], transformB.scale[1], progress),
                THREE.MathUtils.lerp(transformA.scale[2], transformB.scale[2], progress)
            ];

            const inst = obj.instances[0];
            if (inst) {
                const pDiff = Math.abs(inst.pos[0] - newPos[0]) + Math.abs(inst.pos[1] - newPos[1]) + Math.abs(inst.pos[2] - newPos[2]);
                const rDiff = Math.abs(inst.rot[0] - newRot[0]) + Math.abs(inst.rot[1] - newRot[1]) + Math.abs(inst.rot[2] - newRot[2]);
                const sDiff = Math.abs(inst.scale[0] - newScale[0]) + Math.abs(inst.scale[1] - newScale[1]) + Math.abs(inst.scale[2] - newScale[2]);
                
                // Only mark as changed if magnitude of change is significant (to prevent infinite loops with floating point matching)
                if (pDiff > 0.0001 || rDiff > 0.0001 || sDiff > 0.0001) {
                    hasChanges = true;
                    return {
                        ...obj,
                        instances: [{ ...inst, pos: newPos, rot: newRot, scale: newScale }]
                    };
                }
            }
            return obj;
        });

        let newLights = state.stageLights;
        if (stageCueA.lightStates) {
            newLights = state.stageLights.map(light => {
                const lightA = stageCueA.lightStates?.find(l => l.id === light.id);
                if (!lightA) return light;
                const lightB = targetCueB.lightStates?.find(l => l.id === light.id) || lightA;

                let updated = false;
                const outL = { ...light };

                if (lightA.position && lightB.position) {
                    const np: [number, number, number] = [
                        THREE.MathUtils.lerp(lightA.position[0], lightB.position[0], progress),
                        THREE.MathUtils.lerp(lightA.position[1], lightB.position[1], progress),
                        THREE.MathUtils.lerp(lightA.position[2], lightB.position[2], progress)
                    ];
                    if (Math.abs(light.position[0]-np[0])>0.001 || Math.abs(light.position[1]-np[1])>0.001 || Math.abs(light.position[2]-np[2])>0.001) {
                        outL.position = np;
                        updated = true;
                    }
                }

                if (lightA.rotation && lightB.rotation) {
                    const nr: [number, number, number] = [
                        lerpAngle(lightA.rotation[0], lightB.rotation[0], progress),
                        lerpAngle(lightA.rotation[1], lightB.rotation[1], progress),
                        lerpAngle(lightA.rotation[2], lightB.rotation[2], progress)
                    ];
                    
                    if (Math.abs(light.rotation[0]-nr[0])>0.001 || Math.abs(light.rotation[1]-nr[1])>0.001 || Math.abs(light.rotation[2]-nr[2])>0.001) {
                        outL.rotation = nr;
                        updated = true;
                    }
                }

                if (lightA.intensity !== undefined && lightB.intensity !== undefined) {
                    const ni = THREE.MathUtils.lerp(lightA.intensity, lightB.intensity, progress);
                    if (Math.abs(light.intensity - ni) > 0.01) {
                        outL.intensity = ni;
                        updated = true;
                    }
                }

                if (updated) {
                    hasChanges = true;
                    return outL;
                }
                return light;
            });
        }

        if (hasChanges) {
            useStore.setState({ 
                stageObjects: newObjects,
                stageLights: newLights
            });
        }
    });

    return null;
}
