import * as THREE from 'three';

/**
 * 材質 shader 注入的串接器:同一材質可同時套多個 onBeforeCompile patch
 * (例如 parallax 環境反射 + 舞台板平面反射),後套用的不會覆蓋先套用的。
 *
 * patch 清單存在 WeakMap(不放 userData:Material.copy 會 JSON 化 userData,函式會遺失)。
 * program cache key = 各 patch key 串接 → 套用相同 patch 組合的材質共用編譯結果。
 */
type ShaderPatch = (shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => void;

const patchRegistry = new WeakMap<THREE.Material, { key: string; patch: ShaderPatch }[]>();

/** 加入 patch;已存在同 key 時不重複加入。回傳是否新加入(呼叫端需自行設 needsUpdate) */
export function addShaderPatch(mat: THREE.Material, key: string, patch: ShaderPatch): boolean {
    let list = patchRegistry.get(mat);
    if (!list) {
        list = [];
        patchRegistry.set(mat, list);
    }
    if (list.some((p) => p.key === key)) return false;
    list.push({ key, patch });
    const patches = list;
    mat.onBeforeCompile = (shader, renderer) => {
        for (const p of patches) p.patch(shader, renderer);
    };
    mat.customProgramCacheKey = () => patches.map((p) => p.key).join('|');
    return true;
}

export function hasShaderPatch(mat: THREE.Material, key: string): boolean {
    return !!patchRegistry.get(mat)?.some((p) => p.key === key);
}
