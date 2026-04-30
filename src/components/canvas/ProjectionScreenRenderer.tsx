import { StageObject, useStore } from '@/store/useStore';
import * as THREE from 'three';
import { useMemo, useEffect, useRef, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';


// ═══════════════════════════════════════════════════════════════
// Projection Screen Renderer (投影紗)
// - PlaneGeometry with pivot at bottom edge (for roll-up/down via scaleY)
// - Transparent frosted material with animated vertical noise
// - Custom shader using onBeforeCompile for performance
// ═══════════════════════════════════════════════════════════════

// Reuse lerp helpers from BoxPrimitiveRenderer
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

// ── Vertex Shader Injection ──
// Adds time-based horizontal wave displacement for projection screen effect
const vertexShaderPreamble = /* glsl */ `
    uniform float uTime;
    uniform float uNoiseStrength;
    uniform float uCurvature;
    varying vec2 vScreenUv;
`;

const vertexShaderMain = /* glsl */ `
    vScreenUv = uv;

    // Horizontal wave displacement (strong)
    float wave1 = sin(position.x * 3.0 + uTime * 1.0) * 0.008;
    float wave2 = sin(position.x * 7.0 - uTime * 1.5) * 0.004;
    float wave3 = sin(position.x * 12.0 + uTime * 0.8) * 0.003;
    vec3 displacedPos = position;
    displacedPos.z += (wave1 + wave2 + wave3) * uNoiseStrength;

    // Arc curvature: parabolic bend along X axis
    // position.x is in [-0.5, 0.5] for unit plane
    // Parabola: z += curvature * (x^2 - 0.25) so center stays at z=0, edges bend
    float nx = position.x; // already -0.5..0.5
    displacedPos.z += uCurvature * (nx * nx - 0.25) * 4.0;
`;

// ── Fragment Shader Injection ──
// Adds frosted noise pattern and subtle vertical grain
const fragmentShaderPreamble = /* glsl */ `
    uniform float uTime;
    varying vec2 vScreenUv;

    // Simple hash for noise
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    // Smooth noise
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Fractal noise
    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }
`;

const fragmentShaderMain = /* glsl */ `
    // Slow-moving horizontal grain (projection screen texture)
    vec2 noiseCoord = vScreenUv * vec2(40.0, 2.0) + vec2(uTime * 0.15, 0.0);
    float grain = fbm(noiseCoord) * 0.25;

    // Horizontal scan lines (subtle vertical stripes)
    float scanLine = sin(vScreenUv.x * 200.0 + uTime * 0.5) * 0.015 + 0.985;

    // Apply frosted noise to diffuse color
    gl_FragColor.rgb = gl_FragColor.rgb * scanLine + grain * 0.5;
`;


/**
 * Creates the frosted transparent material for the projection screen.
 * Uses MeshPhysicalMaterial with onBeforeCompile for animated shader effects.
 */
function createProjectionScreenMaterial(): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xdde4ec),       // Slightly cool white
        roughness: 0.85,                         // Strong frosted surface
        metalness: 0.0,
        transparent: true,
        opacity: 0.35,                           // Base transparency
        transmission: 0.4,                       // Light passes through
        thickness: 0.05,                         // Very thin
        ior: 1.1,                                // Subtle refraction
        side: THREE.DoubleSide,                  // Visible from both sides
        depthWrite: false,                       // Proper transparency blending
        envMapIntensity: 0.3,
    });

    // Inject custom uniforms & shader chunks
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uNoiseStrength = { value: 1.0 };
        shader.uniforms.uCurvature = { value: 0.0 };

        // Vertex shader
        shader.vertexShader = vertexShaderPreamble + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>\n${vertexShaderMain}\ntransformed = displacedPos;`
        );

        // Fragment shader
        shader.fragmentShader = fragmentShaderPreamble + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `${fragmentShaderMain}\n#include <dithering_fragment>`
        );

        // Store shader ref for time update
        (material as any).__shader = shader;
    };

    return material;
}


/**
 * Renders a projection screen (model_path === '__projection_screen__').
 * Scale = [width, height, 1] — thickness is ignored, it's a flat plane.
 * Pivot is at the TOP edge so scaleY unfolds downward (like a real projector screen).
 */
export const ProjectionScreenRenderer = forwardRef<THREE.Group, {
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

    // ═══ Base Material — projection screen shader or fallback ═══
    const material = useMemo(() => {
        switch (renderMode) {
            case 'wireframe':
                return new THREE.MeshBasicMaterial({
                    color: '#88ccff',
                    wireframe: true,
                    side: THREE.DoubleSide,
                });
            case 'clay':
                return new THREE.MeshStandardMaterial({
                    color: '#ddeeff',
                    roughness: 0.9,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.DoubleSide,
                });
            case 'beauty':
            default:
                return createProjectionScreenMaterial();
        }
    }, [renderMode]);

    // Update time uniform in the shader each frame
    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Shader time + curvature update
        const mat = material as any;
        if (mat.__shader) {
            mat.__shader.uniforms.uTime.value = state.clock.elapsedTime;
            mat.__shader.uniforms.uCurvature.value = object.curvature ?? 0;
        }

        // -- Smooth position / rotation lerp --
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

    // Apply envMap
    useEffect(() => {
        if (!material || !envMap || !perfectRenderEnabled) return;
        if (renderMode !== 'beauty') return;

        const mat = material as THREE.MeshPhysicalMaterial;
        if (mat.envMap !== envMap) {
            mat.envMap = envMap;
            mat.envMapIntensity = 0.3;
            mat.needsUpdate = true;
        }
    }, [material, envMap, perfectRenderEnabled, renderMode]);

    // World transform
    const worldTransform = useMemo(
        () => computeWorldTransform(object, stageObjects),
        [object, stageObjects]
    );

    // Scale: [width, height, 1 (ignored)]
    const scaleW = worldTransform.scale[0];
    const scaleH = worldTransform.scale[1];

    return (
        <group ref={groupRef} onClick={onClick}>
            {/* 
                Outer group handles position/rotation from transforms.
                Scale is applied to this inner group.
                The plane mesh is offset so its TOP EDGE is at y=0,
                meaning the pivot is at the top — scaling Y unfolds it downward.
            */}
            <group scale={[scaleW, scaleH, 1]}>
                <mesh
                    position={[0, -0.5, 0]}  
                    castShadow={perfectRenderEnabled}
                    receiveShadow={perfectRenderEnabled}
                >
                    {/* Unit plane (1x1), actual size from group scale */}
                    <planeGeometry args={[1, 1, 64, 64]} />
                    <primitive object={material} attach="material" />
                </mesh>
            </group>
        </group>
    );
});

ProjectionScreenRenderer.displayName = 'ProjectionScreenRenderer';
