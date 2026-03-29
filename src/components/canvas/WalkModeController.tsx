'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import * as THREE from 'three';

const MOVE_SPEED = 4; // meters per second
const LOOK_SPEED = 0.003; // radians per pixel
const EYE_HEIGHT = 1.7; // meters above ground
const HEIGHT_SMOOTH = 8; // how fast camera follows terrain height
const MAX_STEP_UP = 2.2; // max height the camera can "step up" onto (e.g. a stage platform)
const MAX_DROP = 20; // max distance to look for ground below
const WASD_KEYS = new Set(['w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);

/**
 * WalkModeController — Terrain-following first-person camera
 * 
 * Instead of blocking on walls, the camera follows the surface:
 * - Walking towards a stage → camera rises onto the stage
 * - Walking off a stage → camera descends to ground level
 * - Raycasts DOWN from near the camera to find the NEAREST ground below
 * - Supports multi-story: only detects floors at/below current level
 * - Smoothly interpolates Y to ground + EYE_HEIGHT
 */
export function WalkModeController() {
    const { camera, gl, scene } = useThree();
    const walkMode = useStore(s => s.walkMode);
    const setWalkMode = useStore(s => s.setWalkMode);

    const keysPressed = useRef(new Set<string>());
    const isMouseDragging = useRef(false);
    const prevMouse = useRef({ x: 0, y: 0 });
    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
    const direction = useRef(new THREE.Vector3());
    const rightDir = useRef(new THREE.Vector3());
    const moveVec = useRef(new THREE.Vector3());
    const initialized = useRef(false);
    const targetY = useRef(0);

    // Reusable raycaster & vectors
    const raycaster = useRef(new THREE.Raycaster());
    const rayOrigin = useRef(new THREE.Vector3());
    const downDir = new THREE.Vector3(0, -1, 0);

    // ---- Collect scene meshes for raycasting ----
    const getCollidables = (): THREE.Object3D[] => {
        const meshes: THREE.Object3D[] = [];
        scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.visible) {
                const skip = obj.userData?.isHelper ||
                    obj.userData?.isGizmo ||
                    obj.parent?.userData?.isTransformControls;
                if (!skip) meshes.push(obj);
            }
        });
        return meshes;
    };

    /**
     * Find ground height at a given XZ position.
     * 
     * Casts DOWN from (feet + MAX_STEP_UP) so:
     * - Can step UP onto a stage platform (up to MAX_STEP_UP)
     * - Finds the floor UNDER the camera, not the highest roof
     * - Works correctly in multi-story buildings
     * 
     * @param feetY - current camera Y minus EYE_HEIGHT (approximate feet position)
     */
    const findGroundY = (x: number, z: number, feetY: number, collidables: THREE.Object3D[]): number | null => {
        // Cast from just above the max step-up height, straight down
        const rayStartY = feetY + MAX_STEP_UP;
        rayOrigin.current.set(x, rayStartY, z);
        raycaster.current.set(rayOrigin.current, downDir);
        raycaster.current.far = MAX_STEP_UP + MAX_DROP;

        const hits = raycaster.current.intersectObjects(collidables, false);
        if (hits.length === 0) return null;

        // First hit from this position = the ground closest to our feet
        return hits[0].point.y;
    };

    // ---- Initialize from current camera pos ----
    useEffect(() => {
        if (walkMode && !initialized.current) {
            euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
            targetY.current = camera.position.y;
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
                    targetY.current = camera.position.y;
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

    // ---- Per-frame: terrain-following movement ----
    useFrame((_, delta) => {
        if (!walkMode) return;

        const dt = Math.min(delta, 0.1);
        const collidables = getCollidables();

        // Calculate horizontal movement direction
        camera.getWorldDirection(direction.current);
        direction.current.y = 0;
        direction.current.normalize();
        rightDir.current.crossVectors(direction.current, camera.up).normalize();

        moveVec.current.set(0, 0, 0);

        const keys = keysPressed.current;
        if (keys.has('w')) moveVec.current.add(direction.current);
        if (keys.has('s')) moveVec.current.sub(direction.current);
        if (keys.has('d')) moveVec.current.add(rightDir.current);
        if (keys.has('a')) moveVec.current.sub(rightDir.current);

        const joyInput = useStore.getState().walkMoveInput;
        if (joyInput.x !== 0 || joyInput.y !== 0) {
            moveVec.current.addScaledVector(direction.current, joyInput.y);
            moveVec.current.addScaledVector(rightDir.current, joyInput.x);
        }

        // Apply horizontal movement
        if (moveVec.current.lengthSq() > 0) {
            moveVec.current.normalize();
            const dist = MOVE_SPEED * dt;
            camera.position.x += moveVec.current.x * dist;
            camera.position.z += moveVec.current.z * dist;
        }

        // --- Terrain following: find ground at current XZ ---
        const feetY = camera.position.y - EYE_HEIGHT;
        const groundY = findGroundY(camera.position.x, camera.position.z, feetY, collidables);

        if (groundY !== null) {
            // Target = ground surface + eye height
            targetY.current = groundY + EYE_HEIGHT;
        }
        // If no ground found, keep current targetY (floating in open space)

        // Smoothly interpolate camera Y toward target
        const diff = targetY.current - camera.position.y;
        const smoothFactor = Math.min(1, HEIGHT_SMOOTH * dt);
        camera.position.y += diff * smoothFactor;
    });

    return null;
}
