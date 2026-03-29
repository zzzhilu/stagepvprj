'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import * as THREE from 'three';

const MOVE_SPEED = 4; // meters per second
const LOOK_SPEED = 0.003; // radians per pixel
const WALL_DISTANCE = 0.2; // minimum distance from walls (meters)
const WASD_KEYS = new Set(['w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);

/**
 * WalkModeController — Free-fly first-person camera with wall collision
 * 
 * Camera moves freely in the direction it's facing, including vertical.
 * Collides with solid walls (keeps 0.2m distance) but passes through
 * LED/emissive surfaces, paper figures, helpers, and gizmos.
 */
export function WalkModeController() {
    const { camera, gl, scene } = useThree();
    const walkMode = useStore(s => s.walkMode);
    const setWalkMode = useStore(s => s.setWalkMode);

    const keysPressed = useRef(new Set<string>());
    const isMouseDragging = useRef(false);
    const prevMouse = useRef({ x: 0, y: 0 });
    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
    const flyDir = useRef(new THREE.Vector3());
    const rightDir = useRef(new THREE.Vector3());
    const moveVec = useRef(new THREE.Vector3());
    const initialized = useRef(false);

    // Reusable raycaster for wall collision
    const raycaster = useRef(new THREE.Raycaster());

    /**
     * Collect solid meshes for collision (excludes LED, helpers, gizmos, paper figures).
     * LED surfaces are identified by their parent StageObject's material_id.
     */
    const getCollidables = (): THREE.Object3D[] => {
        const stageObjects = useStore.getState().stageObjects;
        // Build a Set of model_paths that are emissive (LED screens)
        const emissiveModelPaths = new Set<string>();
        stageObjects.forEach(obj => {
            if (obj.material_id === 'emissive' || obj.material_id === 'emissiveMesh') {
                emissiveModelPaths.add(obj.model_path);
            }
        });

        const meshes: THREE.Object3D[] = [];
        scene.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh) || !obj.visible) return;

            // Skip helpers, gizmos, transform controls
            const skip = obj.userData?.isHelper ||
                obj.userData?.isGizmo ||
                obj.userData?.isPaperFigure ||
                obj.parent?.userData?.isTransformControls ||
                obj.parent?.userData?.isPaperFigure;
            if (skip) return;

            // Skip emissive/LED meshes — check parent group's source model
            // The mesh is inside a <group> rendered by StageObjectRenderer.
            // We check if any ancestor group corresponds to an emissive StageObject.
            let isLED = false;
            let parent = obj.parent;
            while (parent) {
                // StageObjectRenderer renders meshes with material set by material_id.
                // LED materials: MeshBasicMaterial with toneMapped=false, or emissive MeshPhysicalMaterial
                const mat = obj.material as THREE.Material;
                if (mat && 'toneMapped' in mat && (mat as any).toneMapped === false) {
                    isLED = true;
                    break;
                }
                parent = parent.parent;
            }
            if (isLED) return;

            // Skip ground plane (very large planes)
            const geo = obj.geometry;
            if (geo) {
                geo.computeBoundingBox();
                const bb = geo.boundingBox;
                if (bb) {
                    const sizeX = bb.max.x - bb.min.x;
                    const sizeZ = bb.max.z - bb.min.z;
                    const sizeY = bb.max.y - bb.min.y;
                    // Ground plane is 100x100 and nearly flat
                    if (sizeX > 50 && sizeZ > 50 && sizeY < 0.1) return;
                }
            }

            meshes.push(obj);
        });
        return meshes;
    };

    /**
     * Check if moving in `dir` by `dist` would collide with a wall.
     * Returns the safe distance to move (clamped to keep WALL_DISTANCE from surface).
     */
    const checkCollision = (
        origin: THREE.Vector3,
        dir: THREE.Vector3,
        dist: number,
        collidables: THREE.Object3D[]
    ): number => {
        if (dist <= 0) return 0;

        raycaster.current.set(origin, dir);
        raycaster.current.far = dist + WALL_DISTANCE;
        raycaster.current.near = 0;

        const hits = raycaster.current.intersectObjects(collidables, false);
        if (hits.length === 0) return dist;

        // Clamp to keep WALL_DISTANCE from the nearest wall
        const hitDist = hits[0].distance - WALL_DISTANCE;
        return Math.max(0, Math.min(dist, hitDist));
    };

    // ---- Initialize from current camera pos ----
    useEffect(() => {
        if (walkMode && !initialized.current) {
            euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
            initialized.current = true;
        }
        if (!walkMode) {
            initialized.current = false;
        }
    }, [walkMode, camera]);

    // ---- Auto-enter walk mode on WASD ----
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (WASD_KEYS.has(e.key)) {
                keysPressed.current.add(e.key.toLowerCase());
                if (!useStore.getState().walkMode) {
                    euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
                    setWalkMode(true);
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [camera, setWalkMode]);

    // ---- Mouse drag rotation + mid/right click exit ----
    useEffect(() => {
        if (!walkMode) {
            isMouseDragging.current = false;
            return;
        }

        const canvas = gl.domElement;

        const onMouseDown = (e: MouseEvent) => {
            if (e.button === 1 || e.button === 2) {
                keysPressed.current.clear();
                setWalkMode(false);
                return;
            }
            if (e.button === 0) {
                isMouseDragging.current = true;
                prevMouse.current = { x: e.clientX, y: e.clientY };
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isMouseDragging.current) return;
            const dx = e.clientX - prevMouse.current.x;
            const dy = e.clientY - prevMouse.current.y;
            prevMouse.current = { x: e.clientX, y: e.clientY };

            euler.current.y -= dx * LOOK_SPEED;
            euler.current.x -= dy * LOOK_SPEED;
            euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
            camera.quaternion.setFromEuler(euler.current);
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button === 0) isMouseDragging.current = false;
        };

        const onContextMenu = (e: MouseEvent) => e.preventDefault();

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('contextmenu', onContextMenu);

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('contextmenu', onContextMenu);
        };
    }, [walkMode, camera, gl, setWalkMode]);

    // ---- Touch drag for mobile ----
    useEffect(() => {
        if (!walkMode) return;

        const canvas = gl.domElement;
        let touchId: number | null = null;
        const prevTouch = { x: 0, y: 0 };

        const onTouchStart = (e: TouchEvent) => {
            const touch = e.changedTouches[0];
            if (!touch) return;
            if (touch.clientX > window.innerWidth * 0.35) {
                touchId = touch.identifier;
                prevTouch.x = touch.clientX;
                prevTouch.y = touch.clientY;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === touchId) {
                    const dx = touch.clientX - prevTouch.x;
                    const dy = touch.clientY - prevTouch.y;
                    prevTouch.x = touch.clientX;
                    prevTouch.y = touch.clientY;

                    euler.current.y -= dx * LOOK_SPEED;
                    euler.current.x -= dy * LOOK_SPEED;
                    euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
                    camera.quaternion.setFromEuler(euler.current);
                    break;
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    break;
                }
            }
        };

        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', onTouchMove, { passive: true });
        canvas.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
    }, [walkMode, camera, gl]);

    // ---- Per-frame: free-fly movement with wall collision ----
    useFrame((_, delta) => {
        if (!walkMode) return;

        const dt = Math.min(delta, 0.1);

        // Get full 3D look direction (including vertical pitch)
        camera.getWorldDirection(flyDir.current);

        // Horizontal direction (for WASD left/right strafing)
        const horizDir = flyDir.current.clone();
        horizDir.y = 0;
        horizDir.normalize();
        rightDir.current.crossVectors(horizDir, camera.up).normalize();

        moveVec.current.set(0, 0, 0);

        const keys = keysPressed.current;
        // W/S move in the full 3D look direction (fly towards where you're looking)
        if (keys.has('w')) moveVec.current.add(flyDir.current);
        if (keys.has('s')) moveVec.current.sub(flyDir.current);
        // A/D strafe horizontally
        if (keys.has('d')) moveVec.current.add(rightDir.current);
        if (keys.has('a')) moveVec.current.sub(rightDir.current);

        // Mobile joystick input — also uses full 3D fly direction
        const joyInput = useStore.getState().walkMoveInput;
        if (joyInput.x !== 0 || joyInput.y !== 0) {
            moveVec.current.addScaledVector(flyDir.current, joyInput.y);
            moveVec.current.addScaledVector(rightDir.current, joyInput.x);
        }

        // Apply movement with wall collision
        if (moveVec.current.lengthSq() > 0) {
            moveVec.current.normalize();
            const desiredDist = MOVE_SPEED * dt;

            // Collect collidable walls (excludes LED surfaces)
            const collidables = getCollidables();

            // Check collision along movement direction
            const safeDist = checkCollision(
                camera.position,
                moveVec.current,
                desiredDist,
                collidables
            );

            if (safeDist > 0) {
                camera.position.addScaledVector(moveVec.current, safeDist);
            }
        }
    });

    return null;
}
