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
    // Use useGLTF hook directly - error handling should be done via ErrorBoundary or pre-validation
    const gltfData = useGLTF(object.model_path);

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
        if (!activeTexture || activeTexture.type !== 'video') {
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

    return (
        <group>
            {meshNodes.map((node) => {
                // Clone the geometry to ensure UV attributes are preserved
                const geometry = node.geometry.clone();

                // Log UV information for debugging
                if (geometry.attributes.uv) {
                    console.log(`Mesh ${node.name} has UV coordinates`);
                } else {
                    console.warn(`Mesh ${node.name} is missing UV coordinates`);
                }

                return (
                    <Instances
                        key={node.uuid}
                        range={object.instances.length}
                        geometry={geometry}
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
