#!/usr/bin/env node
/**
 * GLB 量測工具:向量建模復刻場館時,從參考模型量出尺寸。
 *
 * 用法:
 *   node scripts/measure-glb.mjs <file.glb> [--json out.json] [--flip-z]
 *
 * 輸出:
 *   1. 整體包圍盒(公尺)
 *   2. 每個 mesh 的世界座標包圍盒、尺寸、三角形數
 *   3. 水平面高度分佈:把「朝上的面」依高度(5cm 一格)統計面積
 *      → 地板、舞台面、看台每一階、樓座的高度會以大面積峰值出現
 *
 * --flip-z:套用 StagePV 對 GLB 的 Z 反轉慣例(instance scale [1,1,-1]),
 *           讓量到的座標與場景中看到的一致。
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonIdx = args.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const flipZ = args.includes('--flip-z');
if (!file) {
    console.error('用法: node scripts/measure-glb.mjs <file.glb> [--json out.json] [--flip-z]');
    process.exit(1);
}

const draco3d = require('draco3dgltf');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
});
const doc = await io.read(file);

// 4x4 column-major 矩陣運算(避免依賴 three)
const mul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
};
const apply = (m, x, y, z) => [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    (m[2] * x + m[6] * y + m[10] * z + m[14]) * (flipZ ? -1 : 1),
];

const f = n => n.toFixed(2);
const meshes = [];
const levels = new Map(); // 高度(5cm 格) → 朝上面積
const all = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };

function visit(node, parent) {
    const world = mul(parent, node.getMatrix());
    const mesh = node.getMesh();
    if (mesh) {
        const bb = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
        let tris = 0;
        for (const prim of mesh.listPrimitives()) {
            const pos = prim.getAttribute('POSITION');
            if (!pos) continue;
            const pts = [];
            for (let i = 0; i < pos.getCount(); i++) {
                const p = apply(world, ...pos.getElement(i, []));
                pts.push(p);
                for (let k = 0; k < 3; k++) {
                    bb.min[k] = Math.min(bb.min[k], p[k]);
                    bb.max[k] = Math.max(bb.max[k], p[k]);
                }
            }
            const idx = prim.getIndices();
            const count = idx ? idx.getCount() : pts.length;
            const at = i => (idx ? idx.getScalar(i) : i);
            for (let i = 0; i + 2 < count; i += 3) {
                tris++;
                const a = pts[at(i)], b = pts[at(i + 1)], c = pts[at(i + 2)];
                const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
                const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
                const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
                const area2 = Math.hypot(nx, ny, nz);
                if (area2 > 0 && Math.abs(ny) / area2 > 0.97) { // 近水平面(雙面都算)
                    const y = Math.round(((a[1] + b[1] + c[1]) / 3) / 0.05) * 0.05;
                    levels.set(y, (levels.get(y) || 0) + area2 / 2);
                }
            }
        }
        for (let k = 0; k < 3; k++) {
            all.min[k] = Math.min(all.min[k], bb.min[k]);
            all.max[k] = Math.max(all.max[k], bb.max[k]);
        }
        meshes.push({
            name: node.getName() || mesh.getName() || '(未命名)',
            min: bb.min, max: bb.max,
            size: bb.max.map((v, k) => v - bb.min[k]),
            triangles: tris,
        });
    }
    for (const child of node.listChildren()) visit(child, world);
}

const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
for (const scene of doc.getRoot().listScenes()) for (const n of scene.listChildren()) visit(n, I);

console.log(`\n■ 整體包圍盒${flipZ ? '(已套用 Z 反轉)' : ''}`);
console.log(`  min (${all.min.map(f).join(', ')})  max (${all.max.map(f).join(', ')})`);
console.log(`  尺寸 寬X ${f(all.max[0] - all.min[0])}m × 高Y ${f(all.max[1] - all.min[1])}m × 深Z ${f(all.max[2] - all.min[2])}m`);

console.log(`\n■ Mesh(${meshes.length} 個,依體積排序)`);
const vol = m => m.size[0] * m.size[1] * m.size[2];
for (const m of [...meshes].sort((a, b) => vol(b) - vol(a))) {
    console.log(`  ${m.name.padEnd(28)} 尺寸 ${m.size.map(f).join(' × ').padEnd(24)} min(${m.min.map(f).join(',')}) max(${m.max.map(f).join(',')})  ${m.triangles} tris`);
}

const levelList = [...levels.entries()].filter(([, a]) => a >= 1).sort((a, b) => a[0] - b[0]);
console.log('\n■ 水平面高度分佈(面積 ≥ 1㎡;看台每階、樓板高度會以峰值出現)');
const maxA = Math.max(...levelList.map(([, a]) => a), 1);
for (const [y, a] of levelList) {
    console.log(`  y=${f(y).padStart(7)}m  ${f(a).padStart(9)}㎡  ${'█'.repeat(Math.max(1, Math.round((a / maxA) * 40)))}`);
}

if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ file, flipZ, bounds: all, meshes, levels: levelList }, null, 2));
    console.log(`\n已輸出 ${jsonOut}`);
}
