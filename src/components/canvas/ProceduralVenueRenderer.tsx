import { StageObject, useStore } from '@/store/useStore';
import * as THREE from 'three';
import { createMaterial, createPerfectMaterial } from '@/lib/materials';
import type { MaterialId } from '@/lib/materials';
import { useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { getProceduralVenue } from '@/lib/procedural';
import { buildVenue, disposeVenue } from '@/lib/procedural/build';

/**
 * 向量建模場館渲染器(model_path = `__proc__:<id>`)。
 *
 * - 幾何由 spec 即時生成,無任何網路下載;同材質合併為一個 mesh、座椅為一個 InstancedMesh。
 * - 場館為靜態物件:transform 直接套用,不做 cue 插值(與 GLB 場館行為一致)。
 * - 材質沿用材質庫 + renderMode(wireframe / clay / beauty / 完美渲染)。
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

    // 每種材質一個實例(包含座椅用的材質)
    const materials = useMemo(() => {
        const map = new Map<MaterialId, THREE.Material>();
        if (!built) return map;
        const ids = new Set<MaterialId>([
            ...built.groups.map(g => g.material),
            ...built.seats.map(s => s.material),
        ]);
        for (const id of ids) {
            switch (renderMode) {
                case 'wireframe':
                    map.set(id, new THREE.MeshBasicMaterial({ color: '#00ffff', wireframe: true, side: THREE.DoubleSide }));
                    break;
                case 'clay':
                    map.set(id, new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.8, metalness: 0, side: THREE.DoubleSide }));
                    break;
                default:
                    map.set(id, perfectRenderEnabled ? createPerfectMaterial(id) : createMaterial(id));
            }
        }
        return map;
    }, [built, renderMode, perfectRenderEnabled]);
    useEffect(() => () => { materials.forEach(m => m.dispose()); }, [materials]);

    // 完美渲染:套用即時反射環境
    useEffect(() => {
        if (!envMap || !perfectRenderEnabled || renderMode !== 'beauty') return;
        materials.forEach(m => {
            const mat = m as THREE.MeshStandardMaterial;
            if (mat.envMap !== envMap) {
                mat.envMap = envMap;
                mat.envMapIntensity = 1.5;
                mat.needsUpdate = true;
            }
        });
    }, [materials, envMap, perfectRenderEnabled, renderMode]);

    // 座椅 InstancedMesh:矩陣一次寫入
    const seatMeshes = useMemo(() => {
        if (!built) return [];
        return built.seats.map(s => {
            const mesh = new THREE.InstancedMesh(s.geometry, materials.get(s.material), s.matrices.length);
            s.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            return mesh;
        });
    }, [built, materials]);
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
                    key={g.material}
                    geometry={g.geometry}
                    material={materials.get(g.material)}
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
