'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { globalVideoElement } from './VideoManager';

/**
 * LED 溢光(spill / ambilight)。
 *
 * 顏色來自把播放中的 LED 內容縮繪到 1×1 canvas 取平均色。
 *
 * 光源選擇:刻意「不」用 RectAreaLight —— 面光源有矩形邊界,會在地面留下一條筆直切線,
 * 而真實 LED 多為不規則造型。改用:
 *   1) 平行光(directional):給方向感(光從 LED 方向來),無衰減邊界、無切線
 *   2) 半球光(hemisphere):全域環境染色,讓遠處桁架也吃到 LED 顏色
 * 兩者皆無幾何邊界,任何 LED 造型都成立。
 *
 * 成本:每 10 幀一次 1×1 drawImage,無額外場景渲染。僅完美渲染下啟用。
 */
export function LedSpillLight() {
    const perfectRenderEnabled = useStore((s) => s.perfectRenderEnabled);
    const ledSpillIntensity = useStore((s) => s.ledSpillIntensity);
    const stageObjects = useStore((s) => s.stageObjects);
    const objectBounds = useStore((s) => s.objectBounds);

    const dirRef = useRef<THREE.DirectionalLight>(null);
    const hemiRef = useRef<THREE.HemisphereLight>(null);
    const frameCount = useRef(0);
    const currentColor = useRef(new THREE.Color(0, 0, 0));
    const targetColor = useRef(new THREE.Color(0, 0, 0));

    const sampler = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        return { ctx: c.getContext('2d', { willReadFrequently: true }) };
    }, []);

    // 平行光的來向:LED 群體中心(只取方向,不取距離 → 無邊界)
    const lightPos = useMemo(() => {
        const leds = stageObjects.filter(o => o.type === 'static_LED' || o.type === 'moving_LED');
        const box = new THREE.Box3();
        let has = false;
        for (const led of leds) {
            const b = objectBounds[led.id];
            if (!b) continue;
            box.expandByPoint(new THREE.Vector3(...b.min));
            box.expandByPoint(new THREE.Vector3(...b.max));
            has = true;
        }
        if (!has) return new THREE.Vector3(0, 8, -20);
        const c = new THREE.Vector3();
        box.getCenter(c);
        return c;
    }, [stageObjects, objectBounds]);

    const spillActive = perfectRenderEnabled && ledSpillIntensity > 0;

    useFrame(() => {
        if (!spillActive || !sampler?.ctx) return;

        frameCount.current++;
        if (frameCount.current % 10 === 0) {
            const v = globalVideoElement;
            if (v && v.readyState >= 2 && v.videoWidth > 0) {
                try {
                    sampler.ctx.drawImage(v, 0, 0, 1, 1);
                    const d = sampler.ctx.getImageData(0, 0, 1, 1).data;
                    targetColor.current.setRGB(d[0] / 255, d[1] / 255, d[2] / 255);
                } catch {
                    targetColor.current.setRGB(0, 0, 0);
                }
            } else {
                targetColor.current.setRGB(0, 0, 0);
            }
        }

        currentColor.current.lerp(targetColor.current, 0.08);
        const lum = currentColor.current.r * 0.299 + currentColor.current.g * 0.587 + currentColor.current.b * 0.114;

        if (dirRef.current) {
            dirRef.current.color.copy(currentColor.current);
            dirRef.current.intensity = ledSpillIntensity * lum * 1.2;
        }
        if (hemiRef.current) {
            hemiRef.current.color.copy(currentColor.current);
            hemiRef.current.intensity = ledSpillIntensity * lum * 0.6;
        }
    });

    // 溢光僅在完美渲染下生效(普通/精簡模式零成本:不掛燈、不取樣)
    if (!spillActive) return null;

    return (
        <>
            {/* 方向感:光自 LED 方向而來。平行光無距離衰減、無邊界 → 不會有切線 */}
            <directionalLight
                ref={dirRef}
                position={[lightPos.x, lightPos.y, lightPos.z]}
                intensity={0}
                castShadow={false}
            />
            {/* 全域環境染色:遠處桁架也吃到 LED 顏色 */}
            <hemisphereLight ref={hemiRef} intensity={0} groundColor="#000000" />
        </>
    );
}
