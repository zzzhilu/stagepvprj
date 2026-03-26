import { StageObject, useStore } from '@/store/useStore';
import * as THREE from 'three';
import { createMaterial, createPerfectMaterial } from '@/lib/materials';
import { useMemo, useEffect, useRef, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Reuse the same lerp/world-transform logic from StageObjectRenderer
function calculateLerpSpeed(distance: number): number {
    const minDuration = 0.5;
    const maxDuration = 1.5;
    const duration = Math.min(maxDuration, Math.max(minDuration, distance * 0.1));
    return 1 / duration;
}

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
    const worldPos: [number, number, number] = [
        parentInst.pos[0] + inst.pos[0],
        parentInst.pos[1] + inst.pos[1],
        parentInst.pos[2] + inst.pos[2],
    ];
    const worldRot: [number, number, number] = [
        parentInst.rot[0] + inst.rot[0],
        parentInst.rot[1] + inst.rot[1],
        parentInst.rot[2] + inst.rot[2],
    ];
    return { pos: worldPos, rot: worldRot, scale: inst.scale };
}

/**
 * Renders a box primitive (model_path === '__box__').
 * Scale = [width, height, depth] in metres.
 */
export const BoxPrimitiveRenderer = forwardRef<THREE.Group, {
    object: StageObject;
    onClick?: (e: any) => void;
    envMap?: THREE.CubeTexture | THREE.Texture | null;
}>(({ object, onClick, envMap }, forwardedRef) => {
    const renderMode = useStore((state) => state.renderMode);
    const stageObjects = useStore((state) => state.stageObjects);
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);

    const groupRef = useRef<THREE.Group>(null);
    const currentPos = useRef(new THREE.Vector3());
    const currentRot = useRef(new THREE.Euler());
    const isInitialized = useRef(false);

    // Forward ref
    useEffect(() => {
        if (forwardedRef) {
            if (typeof forwardedRef === 'function') {
                forwardedRef(groupRef.current);
            } else {
                forwardedRef.current = groupRef.current;
            }
        }
    }, [forwardedRef]);

    // Material
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
                return perfectRenderEnabled
                    ? createPerfectMaterial(object.material_id)
                    : createMaterial(object.material_id);
        }
    }, [renderMode, object.material_id, perfectRenderEnabled]);

    // Apply envMap for reflections
    useEffect(() => {
        if (!material || !envMap || !perfectRenderEnabled) return;
        if (renderMode !== 'beauty') return;

        const mat = material as THREE.MeshStandardMaterial;
        if (mat.envMap !== envMap) {
            mat.envMap = envMap;
            mat.envMapIntensity = 1.5;
            mat.needsUpdate = true;
        }
    }, [material, envMap, perfectRenderEnabled, renderMode]);

    // Transform
    const worldTransform = useMemo(
        () => computeWorldTransform(object, stageObjects),
        [object, stageObjects]
    );

    // Smooth animation
    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const targetPos = new THREE.Vector3(...worldTransform.pos);
        const targetRot = new THREE.Euler(...worldTransform.rot);

        if (!isInitialized.current) {
            currentPos.current.copy(targetPos);
            currentRot.current.copy(targetRot);
            groupRef.current.position.copy(targetPos);
            groupRef.current.rotation.copy(targetRot);
            isInitialized.current = true;
            return;
        }

        const distance = currentPos.current.distanceTo(targetPos);
        const speed = calculateLerpSpeed(distance);
        const lerpFactor = Math.min(1, speed * delta * 5);

        currentPos.current.lerp(targetPos, lerpFactor);
        groupRef.current.position.copy(currentPos.current);

        const currentQuat = new THREE.Quaternion().setFromEuler(currentRot.current);
        const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);
        currentQuat.slerp(targetQuat, lerpFactor);
        groupRef.current.quaternion.copy(currentQuat);
        currentRot.current.setFromQuaternion(currentQuat);
    });

    return (
        <group ref={groupRef} scale={worldTransform.scale} onClick={onClick}>
            <mesh
                castShadow={perfectRenderEnabled}
                receiveShadow={perfectRenderEnabled}
            >
                {/* Unit box — actual size comes from group scale */}
                <boxGeometry args={[1, 1, 1]} />
                <primitive object={material} attach="material" />
            </mesh>
        </group>
    );
});

BoxPrimitiveRenderer.displayName = 'BoxPrimitiveRenderer';
