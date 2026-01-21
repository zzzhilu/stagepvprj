import * as THREE from 'three';

export type MaterialId = 'matteMetal' | 'blackPlastic' | 'polishedAluminum' | 'emissive';

export interface MaterialDefinition {
    id: MaterialId;
    name: string;
    color: string;
    roughness: number;
    metalness: number;
    emissive?: string;
    emissiveIntensity?: number;
}

// 參數化 PBR 材質庫
export const MATERIAL_LIBRARY: Record<MaterialId, MaterialDefinition> = {
    matteMetal: {
        id: 'matteMetal',
        name: 'Matte Black Metal',
        color: '#1a1a1a',
        roughness: 0.7,
        metalness: 0.6
    },
    blackPlastic: {
        id: 'blackPlastic',
        name: 'Black Plastic',
        color: '#111111',
        roughness: 0.4,
        metalness: 0.0
    },
    polishedAluminum: {
        id: 'polishedAluminum',
        name: 'Polished Aluminum',
        color: '#eeeeee',
        roughness: 0.2,
        metalness: 1.0
    },
    emissive: {
        id: 'emissive',
        name: 'Emissive Glow',
        color: '#ffffff',
        roughness: 0.9,
        metalness: 0.0,
        emissive: '#ffaa00',
        emissiveIntensity: 2.0
    }
};

// 創建 Three.js 材質實例
export function createMaterial(materialId: MaterialId): THREE.MeshStandardMaterial {
    const def = MATERIAL_LIBRARY[materialId];

    return new THREE.MeshStandardMaterial({
        color: new THREE.Color(def.color),
        roughness: def.roughness,
        metalness: def.metalness,
        side: THREE.DoubleSide, // 雙面渲染，避免背面簍空
        emissive: def.emissive ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: def.emissiveIntensity || 0,
    });
}


// 獲取所有材質選項
export function getMaterialOptions(): Array<{ id: MaterialId; name: string }> {
    return Object.values(MATERIAL_LIBRARY).map(mat => ({
        id: mat.id,
        name: mat.name
    }));
}
