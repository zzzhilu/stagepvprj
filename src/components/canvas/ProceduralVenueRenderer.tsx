import { StageObject, useStore } from '@/store/useStore';
import * as THREE from 'three';
import { createMaterial, createPerfectMaterial, applyMaterialOverrides, MATERIAL_LIBRARY } from '@/lib/materials';
import { applyParallaxEnvMap } from '@/lib/parallax-envmap';
import type { MaterialId } from '@/lib/materials';
import { useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { getProceduralVenue } from '@/lib/procedural';
import { buildVenue, disposeVenue } from '@/lib/procedural/build';

/** 功能材質(LED/投影)有自己的渲染路徑,不套用參數微調(與 MaterialPanel 一致) */
const SPECIAL_MATERIALS: MaterialId[] = ['emissive', 'emissiveMesh', 'projectionScreen'];

/**
 * 向量建模場館渲染器(model_path = `__proc__:<id>`)。
 *
 * - 幾何由 spec 即時生成,無任何網路下載;同材質合併為一個 mesh、座椅為一個 InstancedMesh。
 * - 場館為靜態物件:transform 直接套用,不做 cue 插值(與 GLB 場館行為一致)。
 * - 材質:場館主體跟隨物件的材質(後台材質面板可換材質球與微調);spec 指定 material 的部件(舞台面、座椅)維持固定材質。
 *   支援 renderMode(wireframe / clay / beauty / 完美渲染)。
 */
export const ProceduralVenueRenderer = forwardRef<THREE.Group, {
    object: StageObject;
    onClick?: (e: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    envMap?: THREE.CubeTexture | THREE.Texture | null;
}>(({ object, onClick, envMap }, forwardedRef) => {
    const renderMode = useStore((state) => state.renderMode);
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const groupRef = useRef<THREE.Group>(null);
    useImperativeHandle(forwardedRef, () => groupRef.current as THREE.Group);

    const def = getProceduralVenue(object.model_path);

    // 幾何只在場館 id 變更時生成一次;卸載/替換時釋放
    const built = useMemo(() => (def ? buildVenue(def.spec) : null), [def]);
    useEffect(() => () => { if (built) disposeVenue(built); }, [built]);

    // renderMode 對應的材質工廠(wireframe / clay 統一外觀;beauty 走材質庫)
    const makeMaterial = (id: MaterialId): THREE.Material => {
        const mat = makeBaseMaterial(id);
        // 向量場館的部件都是封閉實體:陰影貼圖只記錄背光面,表面不會被自己的陰影遮到
        // (避免完美渲染時大面積地板/牆出現 shadow acne 條紋閃爍)
        mat.shadowSide = THREE.BackSide;
        return mat;
    };
    const makeBaseMaterial = (id: MaterialId): THREE.Material => {
        switch (renderMode) {
            case 'wireframe':
                return new THREE.MeshBasicMaterial({ color: '#00ffff', wireframe: true, side: THREE.DoubleSide });
            case 'clay':
                return new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
            default:
                return perfectRenderEnabled ? createPerfectMaterial(id) : createMaterial(id);
        }
    };

    // 主材質:跟隨物件的 material_id(後台材質面板),場館主體(牆、看台、地板、天花…)共用
    const mainMaterial = useMemo(
        () => makeMaterial(object.material_id),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [object.material_id, renderMode, perfectRenderEnabled]
    );
    useEffect(() => () => mainMaterial.dispose(), [mainMaterial]);

    // 固定材質:spec 中部件自己指定的(舞台面、座椅等),每種一個實例
    const fixedMaterials = useMemo(() => {
        const map = new Map<MaterialId, THREE.Material>();
        if (!built) return map;
        const ids = new Set<MaterialId>([
            ...built.groups.flatMap(g => (g.material ? [g.material] : [])),
            ...built.seats.map(s => s.material),
        ]);
        for (const id of ids) map.set(id, makeMaterial(id));
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [built, renderMode, perfectRenderEnabled]);
    useEffect(() => () => { fixedMaterials.forEach(m => m.dispose()); }, [fixedMaterials]);

    const materialFor = (id: MaterialId | null) => (id ? fixedMaterials.get(id) : mainMaterial);

    // 材質面板微調(顏色/粗糙度/金屬度/反射…):就地 mutate 主材質,與 GLB 物件同一套邏輯,滑桿即時反映
    const overridesJson = JSON.stringify(object.materialOverrides ?? null);
    useEffect(() => {
        if (renderMode !== 'beauty') return;
        if (SPECIAL_MATERIALS.includes(object.material_id)) return;
        const matDef = MATERIAL_LIBRARY[object.material_id];
        if (!matDef) return;
        applyMaterialOverrides(mainMaterial as THREE.MeshStandardMaterial, matDef, object.materialOverrides);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainMaterial, overridesJson, object.material_id, renderMode]);

    // 完美渲染:套用即時反射環境(parallax 校正,與 GLB 場館一致);反射強度可由材質面板覆寫
    useEffect(() => {
        if (!envMap || !perfectRenderEnabled || renderMode !== 'beauty') return;
        const envIntensityOverride = object.materialOverrides?.envMapIntensity;
        [mainMaterial, ...fixedMaterials.values()].forEach(m => {
            const mat = m as THREE.MeshStandardMaterial;
            if (mat.envMap !== envMap) {
                mat.envMap = envMap;
                mat.envMapIntensity = m === mainMaterial && envIntensityOverride !== undefined ? envIntensityOverride : 1.5;
                applyParallaxEnvMap(mat);
                mat.needsUpdate = true;
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainMaterial, fixedMaterials, envMap, perfectRenderEnabled, renderMode]);

    // 座椅 InstancedMesh:矩陣一次寫入
    const seatMeshes = useMemo(() => {
        if (!built) return [];
        return built.seats.map(s => {
            const mesh = new THREE.InstancedMesh(s.geometry, fixedMaterials.get(s.material), s.matrices.length);
            s.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            return mesh;
        });
    }, [built, fixedMaterials]);
    // InstancedMesh.dispose() 只釋放實例緩衝;椅子幾何為共用單例,不在此釋放
    useEffect(() => () => { seatMeshes.forEach(m => m.dispose()); }, [seatMeshes]);

    const inst = object.instances[0] || { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };

    if (!def || !built) {
        // 未知的場館 id(例如舊版程式碼開新專案):顯示警示框而不是整個場景崩潰
        return (
            <group ref={groupRef} position={inst.pos}>
                <mesh>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial color="orange" wireframe />
                </mesh>
            </group>
        );
    }

    return (
        <group ref={groupRef} position={inst.pos} rotation={inst.rot} scale={inst.scale} onClick={onClick}>
            {built.groups.map(g => (
                <mesh
                    key={g.material ?? '__main__'}
                    geometry={g.geometry}
                    material={materialFor(g.material)}
                    castShadow={perfectRenderEnabled}
                    receiveShadow={perfectRenderEnabled}
                />
            ))}
            {seatMeshes.map((m, i) => (
                <primitive key={`seats-${i}`} object={m} />
            ))}
        </group>
    );
});

ProceduralVenueRenderer.displayName = 'ProceduralVenueRenderer';
