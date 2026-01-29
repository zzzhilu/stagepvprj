import { useGLTF, Instances, Instance } from '@react-three/drei';
import { StageObject, useStore } from '@/store/useStore';
import * as THREE from 'three';
import { createMaterial, MATERIAL_LIBRARY } from '@/lib/materials';
import { useMemo, useEffect, useState, useRef, forwardRef } from 'react';
import { globalVideoElement } from './VideoManager';
import { useFrame } from '@react-three/fiber';

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

export const StageObjectRenderer = forwardRef<THREE.Group, {
    object: StageObject;
    onClick?: (e: any) => void;
}>(({ object, onClick }, forwardedRef) => {
    const renderMode = useStore((state) => state.renderMode);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const stageObjects = useStore((state) => state.stageObjects);
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
    useEffect(() => {
        // Support both 'video' and 'r2_video' types
        if (!activeTexture || (activeTexture.type !== 'video' && activeTexture.type !== 'r2_video')) {
            if (videoTexture) {
                videoTexture.dispose();
                setVideoTexture(null);
            }
            return;
        }

        // Wait for global video element to be available
        const checkVideo = setInterval(() => {
            if (globalVideoElement) {
                clearInterval(checkVideo);
                const texture = new THREE.VideoTexture(globalVideoElement);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.flipY = false;

                // Flip horizontally (mirror U coordinate) - REMOVED per user request
                // texture.repeat.x = -1;
                // texture.offset.x = 1;

                setVideoTexture(texture);
                console.log('Video texture created from global video element');
            }
        }, 100);

        return () => {
            clearInterval(checkVideo);
            if (videoTexture) {
                videoTexture.dispose();
            }
        };
    }, [activeTexture]);

    // Create static image texture
    const imageTexture = useMemo(() => {
        if (!activeTexture || activeTexture.type !== 'image') return null;

        console.log('Loading image texture from:', activeTexture.file_path);
        const texture = new THREE.TextureLoader().load(
            activeTexture.file_path,
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

        // Flip horizontally (mirror U coordinate) - REMOVED per user request
        // texture.repeat.x = -1;
        // texture.offset.x = 1;

        return texture;
    }, [activeTexture]);


    // Select active texture map - support both 'video' and 'r2_video' types
    const textureMap = (activeTexture?.type === 'video' || activeTexture?.type === 'r2_video') ? videoTexture : imageTexture;

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
                // For emissive material with texture
                if (object.material_id === 'emissive') {
                    const matDef = MATERIAL_LIBRARY.emissive;
                    console.log('Creating emissive material, has texture:', !!textureMap);

                    if (textureMap) {
                        // Use texture as emissive map with black base color
                        return new THREE.MeshStandardMaterial({
                            color: new THREE.Color('#000000'), // Black base - no ambient contribution
                            roughness: 1.0,
                            metalness: 0.0,
                            side: THREE.DoubleSide,
                            emissive: new THREE.Color('#ffffff'), // White multiplier for emissive map
                            emissiveMap: textureMap,
                            emissiveIntensity: matDef.emissiveIntensity || 2.0,
                        });
                    } else {
                        // No texture, use solid emissive color
                        return new THREE.MeshStandardMaterial({
                            color: new THREE.Color('#000000'), // Black base
                            roughness: matDef.roughness,
                            metalness: matDef.metalness,
                            side: THREE.DoubleSide,
                            emissive: new THREE.Color(matDef.emissive || '#ffaa00'),
                            emissiveIntensity: matDef.emissiveIntensity || 2.0,
                        });
                    }
                }
                return createMaterial(object.material_id);
        }
    }, [renderMode, object.material_id, textureMap]);

    // Show error placeholder if loading failed
    if (!gltfData) return null;

    const { nodes } = gltfData;

    // Find all meshes in the loaded GLTF
    let meshNodes = Object.values(nodes).filter((node): node is THREE.Mesh =>
        (node as THREE.Object3D).type === 'Mesh'
    );

    // If meshNames is specified, filter to only those meshes
    if (object.meshNames && object.meshNames.length > 0) {
        meshNodes = meshNodes.filter(mesh =>
            object.meshNames!.includes(mesh.name)
        );
    }

    // Show warning placeholder if no meshes found
    if (meshNodes.length === 0) {
        return (
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="orange" wireframe />
            </mesh>
        );
    }

    // Compute target transform
    const worldTransform = useMemo(() =>
        computeWorldTransform(object, stageObjects),
        [object, stageObjects]
    );

    // Animate position/rotation using useFrame
    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const targetPos = new THREE.Vector3(...worldTransform.pos);
        const targetRot = new THREE.Euler(...worldTransform.rot);

        // Initialize on first frame
        if (!isInitialized.current) {
            currentPos.current.copy(targetPos);
            currentRot.current.copy(targetRot);
            groupRef.current.position.copy(targetPos);
            groupRef.current.rotation.copy(targetRot);
            isInitialized.current = true;
            return;
        }

        // Calculate distance for speed adjustment
        const distance = currentPos.current.distanceTo(targetPos);
        const speed = calculateLerpSpeed(distance);
        const lerpFactor = Math.min(1, speed * delta * 5);

        // Lerp position
        currentPos.current.lerp(targetPos, lerpFactor);
        groupRef.current.position.copy(currentPos.current);

        // Slerp rotation (using quaternion)
        const currentQuat = new THREE.Quaternion().setFromEuler(currentRot.current);
        const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);
        currentQuat.slerp(targetQuat, lerpFactor);
        groupRef.current.quaternion.copy(currentQuat);
        currentRot.current.setFromQuaternion(currentQuat);
    });

    return (
        <group ref={groupRef} scale={worldTransform.scale} onClick={onClick}>
            {meshNodes.map((node) => {
                const geometry = node.geometry.clone();

                return (
                    <Instances
                        key={node.uuid}
                        range={1}
                        geometry={geometry}
                        material={material}
                    >
                        <Instance />
                    </Instances>
                );
            })}
        </group>
    );
});

StageObjectRenderer.displayName = 'StageObjectRenderer';
