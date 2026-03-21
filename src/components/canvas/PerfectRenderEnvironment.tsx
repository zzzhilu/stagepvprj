'use client';

import { Environment, ContactShadows } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

// Valid drei Environment presets
type EnvPreset = 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse';

const VALID_PRESETS: EnvPreset[] = ['studio', 'city', 'sunset', 'warehouse', 'forest', 'apartment', 'park', 'lobby', 'dawn', 'night'];

/**
 * PerfectRenderEnvironment - 完美渲染模式專用環境組件
 * 
 * 只在 perfectRenderEnabled 為 true 時渲染，包含：
 * 1. HDR 環境映射（IBL）- 提供真實環境反射
 * 2. 可控聚光燈（原生 Three.js spotLight，不渲染可見錐體）
 * 3. 接觸陰影 - 柔和的地面陰影
 */
export function PerfectRenderEnvironment() {
    const perfectRenderEnabled = useStore((state) => state.perfectRenderEnabled);
    const envPreset = useStore((state) => state.envPreset) as EnvPreset;
    const envIntensity = useStore((state) => state.envIntensity);
    const contactShadow = useStore((state) => state.contactShadow);
    const toneMapping = useStore((state) => state.toneMapping);
    const spotLights = useStore((state) => state.spotLights);

    const { gl } = useThree();

    // Apply tone mapping when perfect render is enabled
    useEffect(() => {
        if (perfectRenderEnabled) {
            const originalToneMapping = gl.toneMapping;
            const originalToneMappingExposure = gl.toneMappingExposure;

            if (toneMapping) {
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.0;
            }

            return () => {
                gl.toneMapping = originalToneMapping;
                gl.toneMappingExposure = originalToneMappingExposure;
            };
        }
    }, [perfectRenderEnabled, toneMapping, gl]);

    if (!perfectRenderEnabled) return null;

    // Validate preset
    const safePreset = VALID_PRESETS.includes(envPreset) ? envPreset : 'studio';

    return (
        <>
            {/* HDR 環境映射 - 提供全局反射和環境光照 */}
            <Environment
                preset={safePreset}
                environmentIntensity={envIntensity}
                background={false}
            />

            {/* 可控聚光燈 - 使用原生 Three.js spotLight（無可見錐體） */}
            {spotLights.map((light, index) => (
                light.enabled && (
                    <spotLight
                        key={index}
                        position={light.position}
                        angle={light.angle}
                        penumbra={0.8}
                        intensity={light.intensity}
                        distance={light.distance}
                        color={light.color}
                        castShadow={light.castShadow}
                        shadow-mapSize-width={light.castShadow ? 2048 : 512}
                        shadow-mapSize-height={light.castShadow ? 2048 : 512}
                        shadow-bias={-0.0001}
                    />
                )
            ))}

            {/* 接觸陰影 - 柔和的地面陰影效果 */}
            {contactShadow && (
                <ContactShadows
                    position={[0, 0, 0]}
                    opacity={0.75}
                    scale={40}
                    blur={1.0}
                    far={6}
                    resolution={1024}
                    color="#000000"
                />
            )}
        </>
    );
}
