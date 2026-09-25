import { useGLTF, Instances, Instance } from '@react-three/drei';
import { StageObject, useStore } from '@/store/useStore';
import * as THREE from 'three';
import { createMaterial, MATERIAL_LIBRARY } from '@/lib/materials';
import { useMemo, useEffect, useState } from 'react';
import { globalVideoElement } from './VideoManager';

export function StageObjectRenderer({ object }: { object: StageObject }) {
    const renderMode = useStore((state) => state.renderMode);
    const contentTextures = useStore((state) => state.contentTextures);
    const activeContentId = useStore((state) => state.activeContentId);
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
    // Use useGLTF hook with Draco decoder path
    const gltfData = useGLTF(object.model_path, 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    // Get active texture for emissive materials (using selected content)
    const activeTexture = useMemo(() => {
        if (activeContentId) {
            const selected = contentTextures.find(t => t.id === activeContentId);
            if (selected) return selected;
        }
        return null;
    }, [contentTextures, activeContentId]);

    // Create and manage video texture using global video element
    useEffect(() => {
        if (!activeTexture || activeTexture.type !== 'video') return;

        let texture: THREE.VideoTexture | null = null;

        // Wait for global video element to be available
        const checkVideo = setInterval(() => {
            if (globalVideoElement) {
                clearInterval(checkVideo);
                texture = new THREE.VideoTexture(globalVideoElement);
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
            }
        }, 100);

        return () => {
            clearInterval(checkVideo);
            // Dispose the texture created by this effect run (not a stale state value)
            texture?.dispose();
            setVideoTexture(null);
        };
    }, [activeTexture]);

    // Create static image texture
    const imageTexture = useMemo(() => {
        if (!activeTexture || activeTexture.type !== 'image') return null;

        const texture = new THREE.TextureLoader().load(
            activeTexture.file_path,
            undefined,
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

    // Free GPU memory of the previous image texture when content changes
    useEffect(() => () => imageTexture?.dispose(), [imageTexture]);


    // Select active texture map
    const textureMap = activeTexture?.type === 'video' ? videoTexture : imageTexture;

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

    // Free GPU resources of the previous material when it is replaced
    useEffect(() => () => material.dispose(), [material]);

    // Find all meshes in the loaded GLTF (memoized: recomputing each render is wasted work)
    const nodes = gltfData?.nodes;
    const meshNames = object.meshNames;
    const meshNodes = useMemo(() => {
        if (!nodes) return [];
        let meshes = Object.values(nodes).filter((node): node is THREE.Mesh =>
            (node as THREE.Object3D).type === 'Mesh'
        );
        // If meshNames is specified, filter to only those meshes
        if (meshNames && meshNames.length > 0) {
            meshes = meshes.filter(mesh => meshNames.includes(mesh.name));
        }
        return meshes;
    }, [nodes, meshNames]);

    // Show error placeholder if loading failed
    if (!gltfData) return null;

    // Show warning placeholder if no meshes found
    if (meshNodes.length === 0) {
        return (
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="orange" wireframe />
            </mesh>
        );
    }

    return (
        <group>
            {meshNodes.map((node) => {
                // Use the cached GLTF geometry directly (read-only, UVs included).
                // Cloning here created a new GPU buffer on every re-render and leaked memory.
                return (
                    <Instances
                        key={node.uuid}
                        range={object.instances.length}
                        geometry={node.geometry}
                        material={material}
                    >
                        {object.instances.map((inst, i) => (
                            <Instance
                                key={i}
                                position={inst.pos}
                                rotation={inst.rot}
                                scale={inst.scale}
                            />
                        ))}
                    </Instances>
                );
            })}
        </group>
    );
}
