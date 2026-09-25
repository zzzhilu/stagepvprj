import * as THREE from 'three';

/**
 * GLB 節點位置保留(新版上傳物件使用;舊物件不經過這裡)。
 *
 * 場景慣例:物件 instance 預設 scale [1,1,-1](Z 鏡像,見 CLAUDE.md 地雷 #1),
 * 即畫面上 = S_z · (節點世界矩陣 W) · geometry。
 * 把 S_z · W 拆回 instance 的 pos/rot/scale 且維持 scale.z 為負的慣例:
 *   S_z·T·R·S = T(tx,ty,-tz) · (S_z·R·S_z) · diag(sx,sy,-sz)
 *   S_z·R·S_z 對應四元數 (-qx,-qy,qz,qw)。
 */
const round = (n: number) => {
    const r = Math.round(n * 1e6) / 1e6;
    return Object.is(r, -0) ? 0 : r;
};

export interface InstanceTransform {
    pos: [number, number, number];
    rot: [number, number, number];
    scale: [number, number, number];
}

/** 節點世界矩陣 → 鏡像慣例下的 instance transform(供單一 mesh 物件使用) */
export function mirroredInstanceFromMatrix(matrix: THREE.Matrix4): InstanceTransform {
    const t = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    matrix.decompose(t, q, s);
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(-q.x, -q.y, q.z, q.w), 'XYZ');
    return {
        pos: [round(t.x), round(t.y), round(-t.z)],
        rot: [round(e.x), round(e.y), round(e.z)],
        scale: [round(s.x), round(s.y), round(-s.z)],
    };
}

/** GLB 場景內所有 mesh,依遍歷順序(= meshIndices 的索引基準;上傳解析與渲染必須一致) */
export function collectSceneMeshes(scene: THREE.Object3D): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    return meshes;
}

/** mesh 相對於 GLB 場景根節點的世界矩陣 */
export function meshMatrixInScene(mesh: THREE.Object3D, scene: THREE.Object3D): THREE.Matrix4 {
    scene.updateMatrixWorld(true);
    const sceneInv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
    return new THREE.Matrix4().multiplyMatrices(sceneInv, mesh.matrixWorld);
}
