'use client';

import { useStore, StageLight } from '@/store/useStore';
import { useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// Initialize RectAreaLight uniforms once
let rectAreaInitialized = false;
function ensureRectAreaInit() {
    if (!rectAreaInitialized) {
        RectAreaLightUniformsLib.init();
        rectAreaInitialized = true;
    }
}

// --- Volumetric SpotLight Cone ---
// Adapted from threex.volumetricspotlight by Jerome Etienne.
// Uses a real 3D CylinderGeometry (tapered) with a shader that makes surfaces
// facing the camera bright and edges transparent (normal-based angle intensity).
// This creates a convincing volumetric light cone from all viewing angles.

const VOL_VERTEX = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const VOL_FRAGMENT = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    uniform vec3 lightColor;
    uniform vec3 spotPosition;
    uniform float attenuation;
    uniform float anglePower;

    void main() {
        // Distance attenuation: fade out further from the light source
        float intensity = distance(vWorldPosition, spotPosition) / attenuation;
        intensity = 1.0 - clamp(intensity, 0.0, 1.0);

        // Angle-based intensity using surface normal
        // Surfaces facing the camera are bright, edges facing away are transparent
        vec3 normal = vec3(vNormal.x, vNormal.y, abs(vNormal.z));
        float angleIntensity = pow(dot(normal, vec3(0.0, 0.0, 1.0)), anglePower);
        intensity *= angleIntensity;

        gl_FragColor = vec4(lightColor, intensity);
    }
`;

function VolumetricCone({ color, angle, distance, intensity }: {
    color: string;
    angle: number;
    distance: number;
    intensity: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const coneLength = Math.min(distance * 0.5, 15);
    // Bottom radius based on angle and length
    const radiusBottom = Math.tan(angle) * coneLength;
    const radiusTop = 0.08; // small opening at light source

    // Create geometry: tapered cylinder extending along -Y from origin
    const geometry = useMemo(() => {
        const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, coneLength, 64, 20, true);
        // Translate so narrow end (light source) is at origin, cone extends -Y
        geo.translate(0, -coneLength / 2, 0);
        return geo;
    }, [radiusTop, radiusBottom, coneLength]);

    const shaderData = useMemo(() => ({
        uniforms: {
            lightColor: { value: new THREE.Color(color) },
            spotPosition: { value: new THREE.Vector3(0, 0, 0) },
            attenuation: { value: coneLength * 0.5 },
            anglePower: { value: 3.0 },
        },
        vertexShader: VOL_VERTEX,
        fragmentShader: VOL_FRAGMENT,
    }), []);

    // Update uniforms reactively
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.lightColor.value.set(color);
            // Tighter attenuation: smaller = faster falloff
            materialRef.current.uniforms.attenuation.value = coneLength * (0.2 + intensity * 0.04);
            // Higher anglePower = tighter edges
            materialRef.current.uniforms.anglePower.value = Math.max(2.0, 5.0 - intensity * 0.2);
        }
    }, [color, intensity, coneLength]);

    // Keep spotPosition synced with world position each frame
    useFrame(() => {
        if (meshRef.current && materialRef.current) {
            meshRef.current.getWorldPosition(materialRef.current.uniforms.spotPosition.value);
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <shaderMaterial
                ref={materialRef}
                args={[shaderData]}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// --- Light Type Renderers ---

function SpotLightHelper({ light, isSelected, onClick }: {
    light: StageLight; isSelected: boolean; onClick: () => void;
}) {
    const spotLightRef = useRef<THREE.SpotLight>(null);
    const targetObjRef = useRef<THREE.Object3D>(null);

    // Update spotlight target
    useEffect(() => {
        if (spotLightRef.current && targetObjRef.current) {
            spotLightRef.current.target = targetObjRef.current;
        }
    }, []);

    return (
        <>
            {/* Visible cone indicator */}
            <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <coneGeometry args={[0.25, 0.5, 8]} />
                <meshBasicMaterial
                    color={light.color}
                    transparent
                    opacity={isSelected ? 0.9 : 0.5}
                    wireframe={!isSelected}
                />
            </mesh>
            {/* Emissive bulb */}
            <mesh position={[0, 0.12, 0]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color={light.color} />
            </mesh>

            {/* Fake Tyndall volumetric cone */}
            {light.enabled && (
                <VolumetricCone
                    color={light.color}
                    angle={light.angle ?? 0.5}
                    distance={light.distance ?? 30}
                    intensity={light.intensity}
                />
            )}

            {/* Actual spotlight */}
            <spotLight
                ref={spotLightRef}
                position={[0, 0, 0]}
                angle={light.angle ?? 0.6}
                penumbra={light.penumbra ?? 0.8}
                intensity={light.intensity}
                distance={light.distance ?? 30}
                color={light.color}
                castShadow={light.castShadow}
                shadow-mapSize-width={light.castShadow ? 2048 : 512}
                shadow-mapSize-height={light.castShadow ? 2048 : 512}
                shadow-bias={-0.0001}
            />
            {/* Target object in local -Y direction (below this group = where light points) */}
            <object3D ref={targetObjRef} position={[0, -(light.distance ?? 30), 0]} />
        </>
    );
}

function PointLightHelper({ light, isSelected, onClick }: {
    light: StageLight; isSelected: boolean; onClick: () => void;
}) {
    return (
        <>
            {/* Visible sphere indicator */}
            <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <sphereGeometry args={[0.2, 12, 12]} />
                <meshBasicMaterial
                    color={light.color}
                    transparent
                    opacity={isSelected ? 0.9 : 0.5}
                    wireframe={!isSelected}
                />
            </mesh>
            {/* Glow ring */}
            <mesh>
                <ringGeometry args={[0.25, 0.35, 16]} />
                <meshBasicMaterial color={light.color} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>

            <pointLight
                intensity={light.intensity}
                distance={light.distance ?? 20}
                color={light.color}
                castShadow={light.castShadow}
                shadow-mapSize-width={light.castShadow ? 1024 : 256}
                shadow-mapSize-height={light.castShadow ? 1024 : 256}
            />
        </>
    );
}

function RectAreaLightHelper({ light, isSelected, onClick }: {
    light: StageLight; isSelected: boolean; onClick: () => void;
}) {
    const w = light.width ?? 2;
    const h = light.height ?? 2;

    useEffect(() => { ensureRectAreaInit(); }, []);

    return (
        <>
            <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial color={light.color} transparent opacity={isSelected ? 0.6 : 0.3} side={THREE.DoubleSide} />
            </mesh>
            <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
                <lineBasicMaterial color={light.color} transparent opacity={0.8} />
            </lineSegments>

            <rectAreaLight width={w} height={h} intensity={light.intensity} color={light.color} />
        </>
    );
}

function StripLightHelper({ light, isSelected, onClick }: {
    light: StageLight; isSelected: boolean; onClick: () => void;
}) {
    const w = light.width ?? 3;
    const h = 0.1;

    useEffect(() => { ensureRectAreaInit(); }, []);

    return (
        <>
            <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <boxGeometry args={[w, h, 0.05]} />
                <meshBasicMaterial color={light.color} transparent opacity={isSelected ? 0.8 : 0.4} />
            </mesh>

            <rectAreaLight width={w} height={h} intensity={light.intensity} color={light.color} />
        </>
    );
}

// --- Single light wrapper ---

const StageLightInstance = forwardRef<THREE.Group, { light: StageLight }>(
    function StageLightInstance({ light }, ref) {
        const groupRef = useRef<THREE.Group>(null);
        const mode = useStore((state) => state.mode);
        const gizmoEnabled = useStore((state) => state.gizmoEnabled);
        const selectedLightId = useStore((state) => state.selectedLightId);
        const setSelectedLight = useStore((state) => state.setSelectedLight);
        const stageObjects = useStore((state) => state.stageObjects);

        // Expose group ref for TransformControls
        useImperativeHandle(ref, () => groupRef.current!, []);

        const isSelected = selectedLightId === light.id;

        const handleClick = () => {
            if (mode === 'admin' && gizmoEnabled) {
                setSelectedLight(light.id);
            }
        };

        // Resolve parent position for following
        const parentOffset = useMemo(() => {
            if (!light.parentId) return null;
            const parent = stageObjects.find(o => o.id === light.parentId);
            if (!parent || !parent.instances[0]) return null;
            return parent.instances[0].pos;
        }, [light.parentId, stageObjects]);

        const worldPosition: [number, number, number] = useMemo(() => {
            if (parentOffset) {
                return [
                    light.position[0] + parentOffset[0],
                    light.position[1] + parentOffset[1],
                    light.position[2] + parentOffset[2],
                ];
            }
            return light.position;
        }, [light.position, parentOffset]);

        const resolvedLight = { ...light, position: worldPosition };

        if (!light.enabled) return null;

        return (
            <group ref={groupRef} position={worldPosition} rotation={light.rotation}>
                {light.type === 'spot' && (
                    <SpotLightHelper light={resolvedLight} isSelected={isSelected} onClick={handleClick} />
                )}
                {light.type === 'point' && (
                    <PointLightHelper light={resolvedLight} isSelected={isSelected} onClick={handleClick} />
                )}
                {light.type === 'rect' && (
                    <RectAreaLightHelper light={resolvedLight} isSelected={isSelected} onClick={handleClick} />
                )}
                {light.type === 'strip' && (
                    <StripLightHelper light={resolvedLight} isSelected={isSelected} onClick={handleClick} />
                )}
            </group>
        );
    }
);

// --- Main Renderer (exposes lightRefs for TransformControls) ---

export interface StageLightRendererHandle {
    getLightRef: (id: string) => THREE.Group | null;
}

export const StageLightRenderer = forwardRef<StageLightRendererHandle>(
    function StageLightRenderer(_, ref) {
        const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
        const stageLights = useStore((state) => state.stageLights);
        const lightRefsMap = useRef<Map<string, React.RefObject<THREE.Group | null>>>(new Map());

        // Expose method to get light ref by id
        useImperativeHandle(ref, () => ({
            getLightRef: (id: string) => lightRefsMap.current.get(id)?.current ?? null,
        }), []);

        // Sync refs map
        useEffect(() => {
            stageLights.forEach(l => {
                if (!lightRefsMap.current.has(l.id)) {
                    lightRefsMap.current.set(l.id, { current: null } as React.RefObject<THREE.Group | null>);
                }
            });
            const currentIds = new Set(stageLights.map(l => l.id));
            const toRemove: string[] = [];
            lightRefsMap.current.forEach((_, key) => {
                if (!currentIds.has(key)) toRemove.push(key);
            });
            toRemove.forEach(k => lightRefsMap.current.delete(k));
        }, [stageLights]);

        // Only render in Perfect Render mode
        if (!perfectRenderEnabled) return null;

        return (
            <>
                {stageLights.map(light => {
                    let lightRef = lightRefsMap.current.get(light.id);
                    if (!lightRef) {
                        lightRef = { current: null } as React.RefObject<THREE.Group | null>;
                        lightRefsMap.current.set(light.id, lightRef);
                    }
                    return (
                        <StageLightInstance
                            key={light.id}
                            ref={lightRef}
                            light={light}
                        />
                    );
                })}
            </>
        );
    }
);
