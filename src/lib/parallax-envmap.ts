import * as THREE from 'three';

/**
 * Parallax 校正環境反射(cruciform 手法,適配 three r182 PMREM 管線)。
 * 原理:cubemap 預設假設環境無限遠,反射會「飄」。此校正把反射向量與
 * 「場館包圍盒(cuboid)」求交,再以交點重建方向 → 反射位置正確,
 * LED 內容映在地板/金屬結構上的位置與尺度都對。
 *
 * 所有材質共享同一組 uniform 物件(reference 共享),更新一處全場生效;
 * 包圍盒由場景自動計算(venues 物件聯集),50×50 到 200×500 米皆自動適配。
 */
export const parallaxUniforms = {
    uParallaxEnabled: { value: 0 },
    uParallaxBoxMin: { value: new THREE.Vector3(-50, 0, -50) },
    uParallaxBoxMax: { value: new THREE.Vector3(50, 30, 50) },
    uParallaxProbePos: { value: new THREE.Vector3(0, 1, 0) },
};

/** 由場景包圍盒更新校正參數(直接 mutate uniform,不觸發 re-render) */
export function setParallaxBox(min: [number, number, number], max: [number, number, number], probe: [number, number, number]) {
    parallaxUniforms.uParallaxBoxMin.value.set(min[0], min[1], min[2]);
    parallaxUniforms.uParallaxBoxMax.value.set(max[0], max[1], max[2]);
    parallaxUniforms.uParallaxProbePos.value.set(probe[0], probe[1], probe[2]);
}

export function setParallaxEnabled(on: boolean) {
    parallaxUniforms.uParallaxEnabled.value = on ? 1 : 0;
}

const INJECT_ANCHOR = 'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );';

/** 對材質注入 parallax 校正(onBeforeCompile;共享 program cache) */
export function applyParallaxEnvMap(mat: THREE.Material) {
    if ((mat as any).__parallaxApplied) return;
    (mat as any).__parallaxApplied = true;

    mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, parallaxUniforms);

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vParallaxWorldPos;')
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n\tvParallaxWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');

        const parallaxPars = `
varying vec3 vParallaxWorldPos;
uniform float uParallaxEnabled;
uniform vec3 uParallaxBoxMin;
uniform vec3 uParallaxBoxMax;
uniform vec3 uParallaxProbePos;
vec3 parallaxCorrectDir( vec3 dir, vec3 pos ) {
\tvec3 invDir = 1.0 / dir;
\tvec3 tMaxP = ( uParallaxBoxMax - pos ) * invDir;
\tvec3 tMinP = ( uParallaxBoxMin - pos ) * invDir;
\tvec3 tFar = max( tMinP, tMaxP );
\tfloat t = min( min( tFar.x, tFar.y ), tFar.z );
\tvec3 hit = pos + dir * t;
\treturn normalize( hit - uParallaxProbePos );
}
`;
        // 展開 chunk 並在 world-space reflectVec 後插入校正
        const patchedChunk = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
            INJECT_ANCHOR,
            INJECT_ANCHOR + '\n\t\t\tif ( uParallaxEnabled > 0.5 ) reflectVec = parallaxCorrectDir( reflectVec, vParallaxWorldPos );'
        );
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\n' + parallaxPars)
            .replace('#include <envmap_physical_pars_fragment>', patchedChunk);
    };
    // 共享 program cache(同一 patch 的材質共用編譯結果)
    mat.customProgramCacheKey = () => 'parallax-envmap-v1';
}
