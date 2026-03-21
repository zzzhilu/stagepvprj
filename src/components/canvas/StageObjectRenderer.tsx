import { useGLTF, Instances, Instance } from '@react-three/drei';
import { StageObject, useStore } from '@/store/useStore';
import * as THREE from 'three';
import { createMaterial, createPerfectMaterial, MATERIAL_LIBRARY, createMeshLEDAlphaMap } from '@/lib/materials';
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
    envMap?: THREE.CubeTexture | THREE.Texture | null;
}>(({ object, onClick, envMap }, forwardedRef) => {
    const renderMode = useStore((state) => state.renderMode);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const stageObjects = useStore((state) => state.stageObjects);
    const floorPlanTextureUrl = useStore((state) => state.floorPlanTextureUrl);
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
    }, [renderMode, object.material_id, object.type, textureMap, floorPlanTexture, perfectRenderEnabled]);

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

    return (
        <group ref={groupRef} scale={worldTransform.scale} onClick={onClick}>
            {meshNodes.map((node) => {
                const geometry = node.geometry.clone();

                return (
                    <group key={node.uuid}>
                        {/* Front face - main material */}
                        <Instances
                            range={1}
                            geometry={geometry}
                            material={material}
                        >
                            <Instance />
                        </Instances>
                        {/* Back face - black for emissive objects */}
                        {backFaceMaterial && (
                            <Instances
                                range={1}
                                geometry={geometry}
                                material={backFaceMaterial}
                            >
                                <Instance />
                            </Instances>
                        )}
                    </group>
                );
            })}
        </group>
    );
});

StageObjectRenderer.displayName = 'StageObjectRenderer';
