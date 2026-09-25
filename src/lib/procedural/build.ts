import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MaterialId } from '@/lib/materials';
import type { ProcVenueSpec, ProcPart, Vec2, Vec3, TiersPart } from './types';

/**
 * 向量建模建構器:ProcVenueSpec(純數字)→ 合併後的 BufferGeometry。
 *
 * 效能原則(對標 3dome.tw):
 * - 同材質的所有部件合併成「一個」幾何 → 一個材質一次 draw call。
 * - 座椅用 InstancedMesh → 上萬個座位也只有一次 draw call。
 * - 純函式、無副作用:同一 spec 永遠得到相同幾何,可安全 memo。
 */

export interface BuiltGroup {
    material: MaterialId;
    geometry: THREE.BufferGeometry;
}

export interface BuiltSeats {
    material: MaterialId;
    geometry: THREE.BufferGeometry; // 單張椅子
    matrices: THREE.Matrix4[];
}

export interface BuiltVenue {
    groups: BuiltGroup[];
    seats: BuiltSeats[];
    triangleCount: number;
    seatCount: number;
}

// ───────────────────────── 幾何小工具 ─────────────────────────

/** 產生弧線折線(看台、弧形牆常用)。角度為弧度,0 = +x 方向,往 +z 方向為正。 */
export function arc(center: Vec2, radius: number, startAngle: number, endAngle: number, segments = 24): Vec2[] {
    const pts: Vec2[] = [];
    for (let i = 0; i <= segments; i++) {
        const a = startAngle + (endAngle - startAngle) * (i / segments);
        pts.push([center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius]);
    }
    return pts;
}

/** 矩形平面輪廓(以中心與寬深描述) */
export function rect(cx: number, cz: number, w: number, d: number): Vec2[] {
    const hw = w / 2, hd = d / 2;
    return [[cx - hw, cz - hd], [cx + hw, cz - hd], [cx + hw, cz + hd], [cx - hw, cz + hd]];
}

/** 折線每段的左法線 (-dz, dx) */
function segmentNormal(a: Vec2, b: Vec2): Vec2 {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    return [-dz / len, dx / len];
}

/** 折線平移(斜接),d > 0 往左側。尖角的斜接長度限制在 3 倍,避免極端突刺。 */
export function offsetPolyline(path: Vec2[], d: number, closed = false): Vec2[] {
    if (d === 0) return path.map(p => [p[0], p[1]] as Vec2);
    const n = path.length;
    const out: Vec2[] = [];
    for (let i = 0; i < n; i++) {
        const hasPrev = closed || i > 0;
        const hasNext = closed || i < n - 1;
        const prev = path[(i - 1 + n) % n];
        const next = path[(i + 1) % n];
        const nPrev = hasPrev ? segmentNormal(prev, path[i]) : null;
        const nNext = hasNext ? segmentNormal(path[i], next) : null;
        let nx: number, nz: number, scale = 1;
        if (nPrev && nNext) {
            nx = nPrev[0] + nNext[0];
            nz = nPrev[1] + nNext[1];
            const len = Math.hypot(nx, nz) || 1;
            nx /= len; nz /= len;
            const cos = nx * nNext[0] + nz * nNext[1];
            scale = Math.min(3, 1 / Math.max(cos, 1e-3));
        } else {
            const only = (nPrev || nNext)!;
            nx = only[0]; nz = only[1];
        }
        out.push([path[i][0] + nx * d * scale, path[i][1] + nz * d * scale]);
    }
    return out;
}

/** 非索引三角形累積器;UV 依面法線做平面投影(1 單位 = 1 公尺),供貼圖/材質共用。 */
class TriBuilder {
    private pos: number[] = [];
    private uv: number[] = [];
    private _a = new THREE.Vector3();
    private _b = new THREE.Vector3();
    private _c = new THREE.Vector3();

    tri(a: Vec3, b: Vec3, c: Vec3) {
        this._a.set(...a); this._b.set(...b); this._c.set(...c);
        const n = this._b.sub(this._a).cross(this._c.sub(this._a));
        const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
        for (const p of [a, b, c]) {
            this.pos.push(p[0], p[1], p[2]);
            if (ay >= ax && ay >= az) this.uv.push(p[0], p[2]);
            else if (ax >= az) this.uv.push(p[2], p[1]);
            else this.uv.push(p[0], p[1]);
        }
    }

    quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
        this.tri(a, b, c);
        this.tri(a, c, d);
    }

    build(): THREE.BufferGeometry {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
        g.computeVertexNormals();
        return g;
    }
}

/**
 * 兩條等長折線之間的實心帶狀體(inner / outer 對應點連成四邊形)。
 * 牆、看台每一排都是它。
 */
function band(tb: TriBuilder, inner: Vec2[], outer: Vec2[], y0: number, y1: number, closed: boolean) {
    const n = inner.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
        const j = (i + 1) % n;
        const a = inner[i], b = inner[j], c = outer[j], d = outer[i];
        tb.quad([a[0], y1, a[1]], [b[0], y1, b[1]], [c[0], y1, c[1]], [d[0], y1, d[1]]); // 頂
        tb.quad([a[0], y0, a[1]], [d[0], y0, d[1]], [c[0], y0, c[1]], [b[0], y0, b[1]]); // 底
        tb.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]); // 內側面
        tb.quad([d[0], y0, d[1]], [d[0], y1, d[1]], [c[0], y1, c[1]], [c[0], y0, c[1]]); // 外側面
    }
    if (!closed) {
        const cap = (p: Vec2, q: Vec2) =>
            tb.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]]);
        cap(inner[0], outer[0]);
        cap(outer[n - 1], inner[n - 1]);
    }
}

// ───────────────────────── 椅子 ─────────────────────────

let chairGeometry: THREE.BufferGeometry | null = null;

/** 共用椅子幾何(面向 -z,椅背在 +z)。模組級單例,所有場館共用,不 dispose。 */
export function getChairGeometry(): THREE.BufferGeometry {
    if (chairGeometry) return chairGeometry;
    const seat = new THREE.BoxGeometry(0.46, 0.08, 0.42).toNonIndexed();
    seat.translate(0, 0.42, -0.02);
    const back = new THREE.BoxGeometry(0.46, 0.45, 0.06).toNonIndexed();
    back.rotateX(-0.1);
    back.translate(0, 0.68, 0.2);
    chairGeometry = mergeGeometries([seat, back])!;
    seat.dispose();
    back.dispose();
    return chairGeometry;
}

/** 沿折線等距取樣,回傳位置與該處切線 */
function sampleAlong(path: Vec2[], pitch: number): { p: Vec2; t: Vec2 }[] {
    const out: { p: Vec2; t: Vec2 }[] = [];
    let carry = pitch / 2;
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        const len = Math.hypot(dx, dz);
        if (len < 1e-6) continue;
        const t: Vec2 = [dx / len, dz / len];
        let s = carry;
        while (s <= len - 1e-6) {
            out.push({ p: [a[0] + t[0] * s, a[1] + t[1] * s], t });
            s += pitch;
        }
        carry = s - len;
    }
    return out;
}

// ───────────────────────── 部件 → 幾何 ─────────────────────────

function buildTiers(part: TiersPart, tb: TriBuilder, seatMatrices: THREE.Matrix4[] | null) {
    const side = part.side ?? 1;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();

    for (let i = 0; i < part.rows; i++) {
        const inner = offsetPolyline(part.path, side * i * part.rowDepth);
        const outer = offsetPolyline(part.path, side * (i + 1) * part.rowDepth);
        const top = part.y + (i + 1) * part.riserHeight;
        // 每排往下多延伸一階,使看台下方呈連續階梯狀底面(懸挑樓座從下方看也不會破洞)
        const bottom = part.y + Math.max(0, i - 1) * part.riserHeight;
        band(tb, inner, outer, bottom, top, false);

        if (seatMatrices && part.seats) {
            const center = offsetPolyline(part.path, side * (i + 0.5) * part.rowDepth);
            for (const { p, t } of sampleAlong(center, part.seats.pitch)) {
                // 椅背朝看台後方(= 左法線 × side)
                const bx = -t[1] * side, bz = t[0] * side;
                q.setFromAxisAngle(up, Math.atan2(bx, bz));
                pos.set(p[0], top, p[1]);
                seatMatrices.push(m.compose(pos, q, one).clone());
            }
        }
    }
}

function buildPart(part: ProcPart, seatMatrices: THREE.Matrix4[] | null): THREE.BufferGeometry {
    switch (part.kind) {
        case 'box': {
            const g = new THREE.BoxGeometry(...part.size).toNonIndexed();
            if (part.rotY) g.rotateY(part.rotY);
            g.translate(...part.center);
            return g;
        }
        case 'slab': {
            // Shape 在 XY 平面;rotateX(-90°) 後 shape.y → 世界 -z、擠出方向 → 世界 +y
            const shape = new THREE.Shape(part.polygon.map(([x, z]) => new THREE.Vector2(x, -z)));
            const g = new THREE.ExtrudeGeometry(shape, { depth: part.thickness, bevelEnabled: false });
            g.rotateX(-Math.PI / 2);
            g.translate(0, part.y, 0);
            return g.index ? g.toNonIndexed() : g;
        }
        case 'wall': {
            const tb = new TriBuilder();
            const h = part.thickness / 2;
            band(
                tb,
                offsetPolyline(part.path, h, part.closed),
                offsetPolyline(part.path, -h, part.closed),
                part.y,
                part.y + part.height,
                !!part.closed,
            );
            return tb.build();
        }
        case 'tiers': {
            const tb = new TriBuilder();
            buildTiers(part, tb, seatMatrices);
            return tb.build();
        }
    }
}

/** 只保留合併需要的屬性,確保不同來源的幾何可以 mergeGeometries */
function normalizeAttributes(g: THREE.BufferGeometry): THREE.BufferGeometry {
    for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    g.clearGroups();
    return g;
}

export function buildVenue(spec: ProcVenueSpec): BuiltVenue {
    const byMaterial = new Map<MaterialId, THREE.BufferGeometry[]>();
    const seatsByMaterial = new Map<MaterialId, THREE.Matrix4[]>();

    for (const part of spec.parts) {
        let seatMatrices: THREE.Matrix4[] | null = null;
        if (part.kind === 'tiers' && part.seats) {
            seatMatrices = seatsByMaterial.get(part.seats.material) ?? [];
            seatsByMaterial.set(part.seats.material, seatMatrices);
        }
        const g = normalizeAttributes(buildPart(part, seatMatrices));
        const list = byMaterial.get(part.material) ?? [];
        list.push(g);
        byMaterial.set(part.material, list);
    }

    const groups: BuiltGroup[] = [];
    let triangleCount = 0;
    for (const [material, list] of byMaterial) {
        const merged = list.length === 1 ? list[0] : mergeGeometries(list);
        if (list.length > 1) list.forEach(g => g.dispose());
        if (!merged) throw new Error(`[procedural] 合併失敗:material=${material}`);
        merged.computeBoundingSphere();
        merged.computeBoundingBox();
        triangleCount += merged.getAttribute('position').count / 3;
        groups.push({ material, geometry: merged });
    }

    const seats: BuiltSeats[] = [];
    let seatCount = 0;
    for (const [material, matrices] of seatsByMaterial) {
        if (matrices.length === 0) continue;
        seats.push({ material, geometry: getChairGeometry(), matrices });
        seatCount += matrices.length;
    }

    return { groups, seats, triangleCount, seatCount };
}

/** 釋放 buildVenue 產生的 GPU 資源(共用椅子幾何除外) */
export function disposeVenue(v: BuiltVenue) {
    v.groups.forEach(g => g.geometry.dispose());
}
