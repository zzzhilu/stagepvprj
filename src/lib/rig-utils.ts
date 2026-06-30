import * as THREE from 'three';
import type { NullNode, RigControl, Instance } from '@/store/useStore';

/**
 * 機關滑桿步進(單一事實來源)。
 * 位移:0.05(如 0 → 0.05 → 0.10);旋轉:1 度。
 * 不依賴每個機關存的 step 欄位,避免舊機關殘留舊值 — 由型別即時決定。
 */
export function getRigStep(type: 'rotation' | 'translation' | 'visibility'): number {
    return type === 'translation' ? 0.05 : 1; // visibility/rotation: 1
}

/** 把值對齊到該型別的步進(位移 0.05 / 旋轉 1),修正舊機關殘留的非整數值 */
export function quantizeRigValue(type: 'rotation' | 'translation' | 'visibility', value: number): number {
    const step = getRigStep(type);
    return Math.round(value / step) * step;
}

export const AXIS_INDEX: Record<'x' | 'y' | 'z', 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

export type Vec3 = [number, number, number];

export function addVec3(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * 組合 Null 的本地剛體變換矩陣(只有位移 + 旋轉,無 scale)
 */
export function nullLocalMatrix(node: Pick<NullNode, 'pos' | 'rot'>): THREE.Matrix4 {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(node.rot[0], node.rot[1], node.rot[2], 'XYZ'));
    m.compose(new THREE.Vector3(node.pos[0], node.pos[1], node.pos[2]), q, new THREE.Vector3(1, 1, 1));
    return m;
}

/**
 * 計算某個 Null 的世界(基底)變換矩陣,沿 parent 鏈累乘。
 * 找不到節點或偵測到循環時回傳單位矩陣。
 * 注意:此處只使用「基底」transform,不含機關偏移 —— 掛載/解除掛載
 * 的座標轉換一律以基底狀態為準。
 */
export function nullWorldMatrix(nullId: string | null | undefined, nulls: NullNode[]): THREE.Matrix4 {
    const result = new THREE.Matrix4();
    if (!nullId) return result;

    // 由節點往根收集 chain
    const chain: NullNode[] = [];
    const visited = new Set<string>();
    let currentId: string | null | undefined = nullId;
    while (currentId) {
        if (visited.has(currentId)) break; // 循環防護
        visited.add(currentId);
        const node = nulls.find(n => n.id === currentId);
        if (!node) break;
        chain.push(node);
        currentId = node.parentId;
    }

    // 由根往下乘:world = M_root * ... * M_node
    for (let i = chain.length - 1; i >= 0; i--) {
        result.multiply(nullLocalMatrix(chain[i]));
    }
    return result;
}

/**
 * 換 parent 但保持世界位置不變(THREE.Object3D.attach 語意)。
 * fromWorld / toWorld 皆為剛體變換(R + T,無 scale),
 * 因此 child 的 scale(包含 [1,1,-1] Z 反轉)原封不動保留,
 * 不會落入 Matrix4.decompose 對負 scale 的重新表示問題。
 *
 *   delta = inverse(toWorld) × fromWorld
 *   newPos = R(delta) · pos + T(delta)
 *   newRot = quat(delta) ⊗ quat(rot)
 */
export function reparentTransform(
    pos: Vec3,
    rot: Vec3,
    fromWorld: THREE.Matrix4,
    toWorld: THREE.Matrix4
): { pos: Vec3; rot: Vec3 } {
    const delta = new THREE.Matrix4().copy(toWorld).invert().multiply(fromWorld);
    const dq = new THREE.Quaternion().setFromRotationMatrix(delta);
    const dt = new THREE.Vector3().setFromMatrixPosition(delta);

    const newPos = new THREE.Vector3(pos[0], pos[1], pos[2]).applyQuaternion(dq).add(dt);

    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ'));
    const newQ = dq.clone().multiply(q);
    const newRot = new THREE.Euler().setFromQuaternion(newQ, 'XYZ');

    return {
        pos: [newPos.x, newPos.y, newPos.z],
        rot: [newRot.x, newRot.y, newRot.z],
    };
}

/**
 * 計算節點(Null 或 object instance)身上所有機關的偏移總和。
 * 回傳值:pos 為 scene units;rot 已轉為弧度。
 */
export function rigDelta(
    rigs: RigControl[],
    rigValues: Record<string, number>,
    targetType: 'null' | 'object',
    targetId: string,
    instanceIndex?: number
): { pos: Vec3; rot: Vec3 } {
    const dPos: Vec3 = [0, 0, 0];
    const dRotDeg: Vec3 = [0, 0, 0];

    for (const rig of rigs) {
        if (rig.targetType !== targetType || rig.targetId !== targetId) continue;
        if (targetType === 'object' && (rig.instanceIndex ?? 0) !== (instanceIndex ?? 0)) continue;
        if (rig.type === 'visibility') continue; // 可見性不參與 transform,由 rigVisibility 處理

        const raw = rigValues[rig.id] ?? rig.defaultValue;
        // NaN 防護:任一數值非有限數即跳過此機關,避免 NaN 污染矩陣導致模型永久隱形
        if (!Number.isFinite(raw) || !Number.isFinite(rig.min) || !Number.isFinite(rig.max)) continue;
        // 保險夾限:即使外部塞入超界值也不超出行程
        const v = Math.min(Math.max(raw, Math.min(rig.min, rig.max)), Math.max(rig.min, rig.max));
        const a = AXIS_INDEX[rig.axis];
        if (rig.type === 'translation') dPos[a] += v;
        else dRotDeg[a] += v;
    }

    return {
        pos: dPos,
        rot: [
            THREE.MathUtils.degToRad(dRotDeg[0]),
            THREE.MathUtils.degToRad(dRotDeg[1]),
            THREE.MathUtils.degToRad(dRotDeg[2]),
        ],
    };
}

/**
 * 計算某節點(Null 或 object instance)的可見性。
 * 回傳 null = 無 visibility 機關控制此節點(維持預設顯示);
 * true/false = 由 visibility 機關決定(值 ≥ 0.5 視為顯示)。
 * 多個 visibility 機關時,任一要求隱藏即隱藏(AND 邏輯,較安全)。
 */
export function rigVisibility(
    rigs: RigControl[],
    rigValues: Record<string, number>,
    targetType: 'null' | 'object',
    targetId: string,
    instanceIndex?: number
): boolean | null {
    let result: boolean | null = null;
    for (const rig of rigs) {
        if (rig.type !== 'visibility') continue;
        if (rig.targetType !== targetType || rig.targetId !== targetId) continue;
        if (targetType === 'object' && (rig.instanceIndex ?? 0) !== (instanceIndex ?? 0)) continue;
        const v = rigValues[rig.id] ?? rig.defaultValue;
        const visible = v >= 0.5;
        result = result === null ? visible : (result && visible);
    }
    return result;
}

/**
 * 判斷 candidateId 是否為 ancestorId 的後代(或自身)。
 * RigEditor 的 parent 下拉用來排除選項,防止循環。
 */
export function isSelfOrDescendant(nulls: NullNode[], ancestorId: string, candidateId: string): boolean {
    if (ancestorId === candidateId) return true;
    const visited = new Set<string>();
    let currentId: string | null = candidateId;
    while (currentId) {
        if (visited.has(currentId)) return false;
        visited.add(currentId);
        const node = nulls.find(n => n.id === currentId);
        if (!node || node.parentId === null) return false;
        if (node.parentId === ancestorId) return true;
        currentId = node.parentId;
    }
    return false;
}

/**
 * 取得物件第一個 instance 的世界(基底)位置,
 * 供「以物件位置為軸心」便利功能使用。
 */
export function objectWorldPosition(
    obj: { parentId?: string | null; instances: Instance[] },
    nulls: NullNode[]
): Vec3 {
    const inst = obj.instances[0];
    if (!inst) return [0, 0, 0];
    const parentWorld = nullWorldMatrix(obj.parentId ?? null, nulls);
    const p = new THREE.Vector3(inst.pos[0], inst.pos[1], inst.pos[2]).applyMatrix4(parentWorld);
    return [p.x, p.y, p.z];
}

/**
 * 把世界座標位置轉換為某 Null parent 空間下的本地位置。
 */
export function worldPosToLocal(worldPos: Vec3, parentId: string | null, nulls: NullNode[]): Vec3 {
    const inv = nullWorldMatrix(parentId, nulls).invert();
    const p = new THREE.Vector3(worldPos[0], worldPos[1], worldPos[2]).applyMatrix4(inv);
    return [p.x, p.y, p.z];
}

// 包圍盒特徵點:27 個(8 角 + 12 邊中點 + 6 面中心 + 1 中心)。
// t 值 0=min,0.5=中,1=max。
export type BoundsFeatureId = string; // 形如 "0,0,0"(min角) / "0.5,1,0.5"(頂面中心)
export interface BoundsFeature {
    id: BoundsFeatureId;
    label: string;
    t: [number, number, number]; // 各軸 0 / 0.5 / 1
}

export const BOUNDS_FEATURES: BoundsFeature[] = (() => {
    const vals = [0, 0.5, 1];
    const axisLabel = (v: number, lo: string, mid: string, hi: string) => v === 0 ? lo : v === 1 ? hi : mid;
    const out: BoundsFeature[] = [];
    for (const ty of vals) for (const tz of vals) for (const tx of vals) {
        const t: [number, number, number] = [tx, ty, tz];
        const nMid = t.filter(v => v === 0.5).length;
        let label: string;
        if (nMid === 3) label = '中心';
        else {
            // 高度(Y)為主描述
            const yL = axisLabel(ty, '底', '中', '頂');
            const xL = axisLabel(tx, '左', '', '右');
            const zL = axisLabel(tz, '前', '', '後');
            const parts = [yL, xL, zL].filter(Boolean);
            label = parts.join('') + (nMid === 2 ? '面中心' : nMid === 1 ? '邊中' : '角');
        }
        out.push({ id: `${tx},${ty},${tz}`, label, t });
    }
    return out;
})();

/**
 * 從世界空間包圍盒 + 特徵點 t 值,算出該特徵點的世界座標。
 */
export function boundsFeatureWorldPos(
    bounds: { min: [number, number, number]; max: [number, number, number] },
    t: [number, number, number]
): Vec3 {
    return [
        bounds.min[0] + (bounds.max[0] - bounds.min[0]) * t[0],
        bounds.min[1] + (bounds.max[1] - bounds.min[1]) * t[1],
        bounds.min[2] + (bounds.max[2] - bounds.min[2]) * t[2],
    ];
}
