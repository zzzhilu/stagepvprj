'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useStore, CameraView } from '@/store/useStore';

/**
 * 3D 機位模型:每個已儲存視角在場景中顯示一台小攝影機(機身 + 視錐線 + 名稱),
 * 視錐張角依焦距/FOV 即時反映,供導播參考實際機位擺放。
 * 由後台「顯示 3D 機位模型」開關控制(runtime-only,不同步)。
 */
function CameraMarker({ view, index }: { view: CameraView; index: number }) {
    const groupRef = useRef<THREE.Group>(null);

    // 朝向 target(three 相機以 -Z 為前方,lookAt 即可)
    useEffect(() => {
        groupRef.current?.lookAt(new THREE.Vector3(...view.camera.target));
    }, [view.camera.position, view.camera.target]);

    // 視錐線:長度 L,依 FOV 張開(aspect 16:9)
    const frustumGeo = useMemo(() => {
        const L = 6;
        const hh = L * Math.tan(THREE.MathUtils.degToRad(view.camera.fov / 2));
        const hw = hh * (16 / 9);
        const o = [0, 0, 0];
        const c = [
            [-hw, hh, -L], [hw, hh, -L], [hw, -hh, -L], [-hw, -hh, -L],
        ];
        // 原點到四角 + 遠端矩形
        const pts: number[] = [];
        for (const p of c) pts.push(...o, ...p);
        for (let i = 0; i < 4; i++) { pts.push(...c[i], ...c[(i + 1) % 4]); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return geo;
    }, [view.camera.fov]);

    useEffect(() => () => { frustumGeo.dispose(); }, [frustumGeo]);

    const focal = view.camera.focalLength ?? Math.round(12 / Math.tan((view.camera.fov * Math.PI / 180) / 2));

    return (
        <group ref={groupRef} position={view.camera.position}>
            {/* 機身 */}
            <mesh position={[0, 0, 0.25]}>
                <boxGeometry args={[0.5, 0.35, 0.7]} />
                <meshBasicMaterial color="#8b7af6" transparent opacity={0.85} toneMapped={false} />
            </mesh>
            {/* 鏡頭 */}
            <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.12, 0.15, 0.3, 12]} />
                <meshBasicMaterial color="#c9c0ff" toneMapped={false} />
            </mesh>
            {/* 視錐線 */}
            <lineSegments geometry={frustumGeo}>
                <lineBasicMaterial color="#8b7af6" transparent opacity={0.5} />
            </lineSegments>
            {/* 名稱標籤 */}
            <Html position={[0, 0.5, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
                <div style={{
                    background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px',
                    borderRadius: 6, fontSize: 11, whiteSpace: 'nowrap',
                    border: '1px solid rgba(139,122,246,0.5)',
                }}>
                    {index + 1}. {view.name} · {Math.round(focal)}mm
                </div>
            </Html>
        </group>
    );
}

export function CameraMarkers() {
    const views = useStore((s) => s.views);
    const showCameraModels = useStore((s) => s.showCameraModels);
    if (!showCameraModels || views.length === 0) return null;
    return (
        <>
            {views.map((v, i) => <CameraMarker key={v.id} view={v} index={i} />)}
        </>
    );
}
