import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// MaterialId - 所有可用的材質 ID
// 保留原有 ID 以確保向後相容，新增材質使用描述性 ID
// ═══════════════════════════════════════════════════════════════
export type MaterialId =
    // 原有材質（保留 ID，名稱改中文）
    | 'matteMetal'
    | 'blackPlastic'
    | 'polishedAluminum'
    | 'emissive'
    | 'matteGray'
    | 'matteLightGray'
    | 'reflectiveWhite'
    | 'translucentRefractive'
    | 'matteRed'
    // 新增材質
    | 'brushedSteel'
    | 'carbonFiber'
    | 'woodOak'
    | 'concrete'
    | 'copper'
    | 'neonGlow';

export interface MaterialDefinition {
    id: MaterialId;
    name: string;        // 中文名稱
    color: string;
    roughness: number;
    metalness: number;
    emissive?: string;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
}

// ═══════════════════════════════════════════════════════════════
// 程序化紋理生成器
// 使用 Canvas 或 DataTexture 創建逼真的紋理貼圖
// ═══════════════════════════════════════════════════════════════

/** 生成噪聲紋理 - 用於粗糙度變化和表面微瑕疵 */
function generateNoiseTexture(size = 256, intensity = 0.3, baseValue = 0.5): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const noise = (Math.random() - 0.5) * intensity;
        const value = Math.max(0, Math.min(1, baseValue + noise)) * 255;
        data[i * 4] = value;
        data[i * 4 + 1] = value;
        data[i * 4 + 2] = value;
        data[i * 4 + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

/** 生成拉絲金屬紋理 - 水平方向性擦痕 */
function generateBrushedMetalTexture(size = 512): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 基底色
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, size, size);

    // 水平拉絲紋路 - 多層次
    for (let i = 0; i < size * 3; i++) {
        const y = Math.random() * size;
        const width = Math.random() * size * 0.8 + size * 0.2;
        const x = Math.random() * size - width / 2;
        const alpha = Math.random() * 0.15 + 0.02;
        const brightness = Math.random() > 0.5 ? 255 : 0;

        ctx.strokeStyle = `rgba(${brightness},${brightness},${brightness},${alpha})`;
        ctx.lineWidth = Math.random() * 0.5 + 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y + (Math.random() - 0.5) * 2);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

/** 生成碳纖維紋理 - 經典斜織紋路 */
function generateCarbonFiberTexture(size = 256): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cellSize = size / 16;

    // 黑色底
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);

    // 碳纖維交織紋路
    for (let row = 0; row < 16; row++) {
        for (let col = 0; col < 16; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            const isEven = (row + col) % 2 === 0;

            // 交替明暗格子模擬編織
            const brightness = isEven ? 35 : 25;
            ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
            ctx.fillRect(x, y, cellSize, cellSize);

            // 纖維方向紋路
            ctx.strokeStyle = `rgba(60,60,60,0.3)`;
            ctx.lineWidth = 0.5;
            const lines = 3;
            for (let l = 0; l < lines; l++) {
                ctx.beginPath();
                if (isEven) {
                    // 斜向右
                    ctx.moveTo(x, y + (l * cellSize) / lines);
                    ctx.lineTo(x + cellSize, y + ((l + 1) * cellSize) / lines);
                } else {
                    // 斜向左
                    ctx.moveTo(x + cellSize, y + (l * cellSize) / lines);
                    ctx.lineTo(x, y + ((l + 1) * cellSize) / lines);
                }
                ctx.stroke();
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
}

/** 生成木紋紋理 - 橡木年輪 */
function generateWoodTexture(size = 512): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 木材基色漸變
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#8B6914');
    gradient.addColorStop(0.3, '#A0782C');
    gradient.addColorStop(0.5, '#7A5C1E');
    gradient.addColorStop(0.7, '#9E7730');
    gradient.addColorStop(1, '#85651A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // 年輪紋路 - 水平波狀線條
    for (let i = 0; i < 80; i++) {
        const y = (i / 80) * size;
        const alpha = Math.random() * 0.25 + 0.05;
        const darker = Math.random() > 0.5;

        ctx.strokeStyle = darker
            ? `rgba(60,40,10,${alpha})`
            : `rgba(140,110,50,${alpha})`;
        ctx.lineWidth = Math.random() * 2 + 0.5;

        ctx.beginPath();
        ctx.moveTo(0, y);

        // 波狀曲線模擬天然木紋
        for (let x = 0; x < size; x += 20) {
            const yOffset = Math.sin(x * 0.02 + i * 0.5) * 3 + Math.sin(x * 0.005) * 8;
            ctx.lineTo(x, y + yOffset);
        }
        ctx.stroke();
    }

    // 隨機毛孔/小節
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(50,30,5,${Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(x, y, Math.random() * 2 + 0.5, Math.random() * 4 + 1, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

/** 生成混凝土紋理 - 粗糙多孔表面 */
function generateConcreteTexture(size = 512): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 灰色基底
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, 0, size, size);

    // 多層噪點模擬混凝土顆粒
    for (let layer = 0; layer < 3; layer++) {
        const dotSize = [1, 2, 4][layer];
        const count = [3000, 800, 200][layer];
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const brightness = 100 + Math.random() * 80;
            const alpha = Math.random() * 0.3 + 0.05;
            ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},${alpha})`;
            ctx.fillRect(x, y, dotSize, dotSize);
        }
    }

    // 氣孔
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 3 + 0.5;
        ctx.fillStyle = `rgba(70,70,70,${Math.random() * 0.4 + 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 微裂紋
    for (let i = 0; i < 8; i++) {
        let x = Math.random() * size;
        let y = Math.random() * size;
        ctx.strokeStyle = `rgba(60,60,60,${Math.random() * 0.15 + 0.05})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
            x += (Math.random() - 0.5) * 40;
            y += (Math.random() - 0.5) * 40;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

/** 生成銅銹漸變紋理 - 銅的氧化 patina */
function generateCopperTexture(size = 256): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 銅色基底
    ctx.fillStyle = '#B87333';
    ctx.fillRect(0, 0, size, size);

    // 光澤變化
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 0.8 + 0.2;
        const brightness = Math.random();
        if (brightness > 0.5) {
            ctx.fillStyle = `rgba(220,160,80,${Math.random() * 0.15})`;
        } else {
            ctx.fillStyle = `rgba(140,80,30,${Math.random() * 0.15})`;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

/** 生成 Normal Map - 從灰階紋理推導表面法線 */
function generateNormalMapFromCanvas(sourceTexture: THREE.CanvasTexture, strength = 1.0): THREE.DataTexture {
    const canvas = sourceTexture.image as HTMLCanvasElement;
    const size = canvas.width;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;

    const normalData = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;

            // Sobel-like heightmap → normal derivation
            const getHeight = (px: number, py: number) => {
                const cx = Math.max(0, Math.min(size - 1, px));
                const cy = Math.max(0, Math.min(size - 1, py));
                const ci = (cy * size + cx) * 4;
                return pixels[ci] / 255;
            };

            const dX = (getHeight(x + 1, y) - getHeight(x - 1, y)) * strength;
            const dY = (getHeight(x, y + 1) - getHeight(x, y - 1)) * strength;

            // Encode normal as RGB (tangent space)
            normalData[idx] = (((-dX) * 0.5 + 0.5) * 255) | 0;
            normalData[idx + 1] = (((-dY) * 0.5 + 0.5) * 255) | 0;
            normalData[idx + 2] = 255; // Z always pointing up
            normalData[idx + 3] = 255;
        }
    }

    const normalTexture = new THREE.DataTexture(normalData, size, size);
    normalTexture.needsUpdate = true;
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    return normalTexture;
}


// ═══════════════════════════════════════════════════════════════
// 材質庫 - 參數化 PBR 材質定義
// ═══════════════════════════════════════════════════════════════
export const MATERIAL_LIBRARY: Record<MaterialId, MaterialDefinition> = {
    // ── 金屬系 ──
    matteMetal: {
        id: 'matteMetal',
        name: '霧面深灰塑膠',
        color: '#2a2a2a',
        roughness: 0.85,
        metalness: 0.0
    },
    polishedAluminum: {
        id: 'polishedAluminum',
        name: '拋光鋁合金',
        color: '#eeeeee',
        roughness: 0.2,
        metalness: 1.0
    },
    brushedSteel: {
        id: 'brushedSteel',
        name: '拉絲不鏽鋼',
        color: '#d0d0d0',
        roughness: 0.4,
        metalness: 0.9
    },
    copper: {
        id: 'copper',
        name: '紅銅',
        color: '#B87333',
        roughness: 0.3,
        metalness: 1.0
    },

    // ── 塑料/合成 ──
    blackPlastic: {
        id: 'blackPlastic',
        name: '亮面黑塑料',
        color: '#111111',
        roughness: 0.4,
        metalness: 0.0
    },
    carbonFiber: {
        id: 'carbonFiber',
        name: '碳纖維',
        color: '#222222',
        roughness: 0.3,
        metalness: 0.2
    },

    // ── 非金屬表面 ──
    matteGray: {
        id: 'matteGray',
        name: '水泥灰',
        color: '#666666',
        roughness: 1.0,
        metalness: 0.0
    },
    matteLightGray: {
        id: 'matteLightGray',
        name: '淺灰漆面',
        color: '#cccccc',
        roughness: 1.0,
        metalness: 0.0
    },
    matteRed: {
        id: 'matteRed',
        name: '烤漆紅',
        color: '#cc0000',
        roughness: 1.0,
        metalness: 0.0
    },
    reflectiveWhite: {
        id: 'reflectiveWhite',
        name: '鏡面白',
        color: '#ffffff',
        roughness: 0.1,
        metalness: 0.5
    },
    concrete: {
        id: 'concrete',
        name: '清水混凝土',
        color: '#999999',
        roughness: 0.95,
        metalness: 0.0
    },
    woodOak: {
        id: 'woodOak',
        name: '橡木',
        color: '#A0782C',
        roughness: 0.6,
        metalness: 0.0
    },

    // ── 特殊效果 ──
    translucentRefractive: {
        id: 'translucentRefractive',
        name: '透明玻璃',
        color: '#ffffff',
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.5
    },
    emissive: {
        id: 'emissive',
        name: '自發光',
        color: '#ffffff',
        roughness: 0.9,
        metalness: 0.0,
        emissive: '#ffaa00',
        emissiveIntensity: 1.0
    },
    neonGlow: {
        id: 'neonGlow',
        name: '霓虹光管',
        color: '#000000',
        roughness: 0.3,
        metalness: 0.0,
        emissive: '#00ffff',
        emissiveIntensity: 2.0
    },
};


// ═══════════════════════════════════════════════════════════════
// createMaterial - 預設模式（MeshStandardMaterial，效能優先）
// ═══════════════════════════════════════════════════════════════
export function createMaterial(materialId: MaterialId): THREE.MeshStandardMaterial {
    const def = MATERIAL_LIBRARY[materialId];

    const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(def.color),
        roughness: def.roughness,
        metalness: def.metalness,
        side: THREE.DoubleSide,
        emissive: def.emissive ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: def.emissiveIntensity || 0,
        transparent: def.transparent || false,
        opacity: def.opacity !== undefined ? def.opacity : 1.0
    });

    return mat;
}


// ═══════════════════════════════════════════════════════════════
// createPerfectMaterial - 完美渲染模式（MeshPhysicalMaterial + 程序化紋理）
// ═══════════════════════════════════════════════════════════════
export function createPerfectMaterial(materialId: MaterialId): THREE.MeshPhysicalMaterial {
    const def = MATERIAL_LIBRARY[materialId];

    // 基礎 Physical 材質參數
    const params: any = {
        color: new THREE.Color(def.color),
        roughness: def.roughness,
        metalness: def.metalness,
        side: THREE.DoubleSide,
        emissive: def.emissive ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: def.emissiveIntensity || 0,
        transparent: def.transparent || false,
        opacity: def.opacity !== undefined ? def.opacity : 1.0,
        envMapIntensity: 1.0,
    };

    // 根據材質 ID 添加高階 PBR 特性 + 程序化紋理
    switch (materialId) {
        // ── 金屬系 ──
        case 'polishedAluminum': {
            // 拋光鋁 - 清漆層 + 超低粗糙度 + 噪聲粗糙度變化
            params.clearcoat = 0.8;
            params.clearcoatRoughness = 0.05;
            params.roughness = 0.08;
            params.metalness = 1.0;
            params.envMapIntensity = 1.5;
            // 微磨損噪點
            params.roughnessMap = generateNoiseTexture(256, 0.08, 0.08);
            break;
        }

        case 'matteMetal': {
            // 霧面深灰塑膠 - 簡單霧面材質
            params.roughness = 0.85;
            params.metalness = 0.0;
            params.envMapIntensity = 0.5;
            break;
        }

        case 'brushedSteel': {
            // 拉絲不鏽鋼 - 使用拉絲紋理模擬方向性反射 + 清漆
            // 注意：不使用 anisotropy，因為模型可能沒有 tangent 數據，會導致黑塊
            params.roughness = 0.32;
            params.metalness = 0.95;
            params.envMapIntensity = 1.3;
            params.clearcoat = 0.3;
            params.clearcoatRoughness = 0.15;
            // 使用程序化拉絲紋理作為粗糙度貼圖，模擬方向性反射
            const brushedTex = generateBrushedMetalTexture(512);
            params.roughnessMap = brushedTex;
            // 從拉絲紋理推導微弱法線貼圖，增加表面細節
            params.normalMap = generateNormalMapFromCanvas(brushedTex, 0.4);
            params.normalScale = new THREE.Vector2(0.15, 0.15);
            break;
        }

        case 'copper': {
            // 紅銅 - 溫暖金屬光澤 + 微氧化質感
            params.roughness = 0.25;
            params.metalness = 1.0;
            params.envMapIntensity = 1.6;
            params.clearcoat = 0.4;
            params.clearcoatRoughness = 0.1;
            const copperTex = generateCopperTexture(256);
            params.roughnessMap = copperTex;
            params.normalMap = generateNormalMapFromCanvas(copperTex, 0.3);
            params.normalScale = new THREE.Vector2(0.2, 0.2);
            break;
        }

        // ── 塑料/合成 ──
        case 'blackPlastic': {
            // 亮面黑塑料 - 微光澤 + 清漆
            params.sheen = 0.5;
            params.sheenRoughness = 0.4;
            params.sheenColor = new THREE.Color('#333333');
            params.clearcoat = 0.3;
            params.clearcoatRoughness = 0.2;
            params.roughnessMap = generateNoiseTexture(256, 0.1, 0.4);
            break;
        }

        case 'carbonFiber': {
            // 碳纖維 - 編織紋路 + 清漆層 + 法線深度
            params.roughness = 0.25;
            params.metalness = 0.15;
            params.clearcoat = 1.0;
            params.clearcoatRoughness = 0.05;
            params.envMapIntensity = 1.3;
            const cfTex = generateCarbonFiberTexture(256);
            params.map = cfTex;
            params.normalMap = generateNormalMapFromCanvas(cfTex, 1.2);
            params.normalScale = new THREE.Vector2(0.6, 0.6);
            break;
        }

        // ── 非金屬表面 ──
        case 'matteGray':
        case 'matteLightGray': {
            // 灰色漆面 - 微清漆 + 表面噪點
            params.clearcoat = 0.15;
            params.clearcoatRoughness = 0.3;
            params.roughnessMap = generateNoiseTexture(256, 0.15, def.roughness);
            break;
        }

        case 'matteRed': {
            // 烤漆紅 - 汽車烤漆效果 + 深度清漆
            params.clearcoat = 0.8;
            params.clearcoatRoughness = 0.08;
            params.envMapIntensity = 1.5;
            params.roughnessMap = generateNoiseTexture(256, 0.05, 0.15);
            // 漆面下的微妙色彩變化
            params.roughness = 0.15;
            break;
        }

        case 'reflectiveWhite': {
            // 鏡面白 - 清漆 + 虹彩效果
            params.clearcoat = 1.0;
            params.clearcoatRoughness = 0.05;
            params.iridescence = 0.3;
            params.iridescenceIOR = 1.3;
            params.iridescenceThicknessRange = [100, 400];
            params.envMapIntensity = 1.8;
            break;
        }

        case 'concrete': {
            // 清水混凝土 - 多孔粗糙表面 + 法線深度
            params.roughness = 0.92;
            params.metalness = 0.0;
            const concreteTex = generateConcreteTexture(512);
            params.map = concreteTex;
            params.normalMap = generateNormalMapFromCanvas(concreteTex, 1.5);
            params.normalScale = new THREE.Vector2(0.8, 0.8);
            params.roughnessMap = generateNoiseTexture(256, 0.2, 0.9);
            break;
        }

        case 'woodOak': {
            // 橡木 - 年輪紋路 + 半光澤漆面
            params.roughness = 0.5;
            params.metalness = 0.0;
            params.clearcoat = 0.4;
            params.clearcoatRoughness = 0.15;
            const woodTex = generateWoodTexture(512);
            params.map = woodTex;
            params.normalMap = generateNormalMapFromCanvas(woodTex, 0.8);
            params.normalScale = new THREE.Vector2(0.4, 0.4);
            break;
        }

        // ── 特殊效果 ──
        case 'translucentRefractive': {
            // 透明玻璃 - 真正的折射效果
            params.transmission = 0.95;
            params.thickness = 0.5;
            params.ior = 1.5;
            params.roughness = 0.05;
            params.metalness = 0.0;
            params.transparent = true;
            params.opacity = 1.0;
            params.envMapIntensity = 2.0;
            params.clearcoat = 0.3;
            params.clearcoatRoughness = 0.1;
            break;
        }

        case 'emissive': {
            // 自發光 - 保持原樣
            params.envMapIntensity = 0.5;
            break;
        }

        case 'neonGlow': {
            // 霓虹光管 - 強烈發光 + 透明玻璃管
            params.emissiveIntensity = 3.0;
            params.transmission = 0.3;
            params.thickness = 0.2;
            params.ior = 1.4;
            params.envMapIntensity = 0.3;
            break;
        }
    }

    return new THREE.MeshPhysicalMaterial(params);
}


// ═══════════════════════════════════════════════════════════════
// 輔助函式
// ═══════════════════════════════════════════════════════════════

/** 獲取所有材質選項（用於 UI 選單） */
export function getMaterialOptions(): Array<{ id: MaterialId; name: string }> {
    return Object.values(MATERIAL_LIBRARY).map(mat => ({
        id: mat.id,
        name: mat.name
    }));
}
