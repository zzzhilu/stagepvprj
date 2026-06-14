'use client';

import { Environment, ContactShadows } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { useThree } from '@react-three/fiber';
import { useEffect, useState, Suspense, Component, ReactNode } from 'react';
import * as THREE from 'three';

// Valid drei Environment presets
type EnvPreset = 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse';

const VALID_PRESETS: EnvPreset[] = ['studio', 'city', 'sunset', 'warehouse', 'forest', 'apartment', 'park', 'lobby', 'dawn', 'night'];

/**
 * HDR 環境貼圖的容錯邊界。
 * <Environment preset> 會從外部 CDN(pmndrs/assets)抓 .hdr 檔,
 * 手機首次載入網路較慢時可能逾時 throw。若不隔離,錯誤會冒到最外層
 * ErrorBoundary 讓整頁變紅(「Something went wrong / Could not load ...」)。
 *
 * 這裡攔截該錯誤 → 場景照常顯示(僅少了環境反射)→ 延遲自動重試,
 * 網路恢復後反射會自己補上,使用者無感。
 */
class EnvErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
    state = { failed: false };
    private timer: ReturnType<typeof setTimeout> | null = null;

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: Error) {
        console.warn('HDR 環境貼圖載入失敗(非致命,場景照常顯示,稍後自動重試):', error.message);
        // 3 秒後重置邊界並請父層換 key 重掛,觸發重新抓取
        this.timer = setTimeout(() => {
            this.setState({ failed: false });
            this.props.onRetry();
        }, 3000);
    }

    componentWillUnmount() {
        if (this.timer) clearTimeout(this.timer);
    }

    render() {
        if (this.state.failed) return null; // 略過 HDR,不阻斷場景
        return this.props.children;
    }
}

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

    // 環境貼圖載入失敗後的重試計數(改變即強制重掛 Environment 重新抓取)
    const [envRetryKey, setEnvRetryKey] = useState(0);

    const { gl } = useThree();

    // Apply tone mapping when perfect render is enabled
    useEffect(() => {
        if (perfectRenderEnabled) {
            const originalToneMapping = gl.toneMapping;
            const originalToneMappingExposure = gl.toneMappingExposure;

            if (toneMapping) {
                // eslint-disable-next-line react-hooks/immutability
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
            {/* HDR 環境映射 - 提供全局反射和環境光照。
                以容錯邊界 + Suspense 包覆:CDN 抓取失敗或尚未就緒時,
                場景照常顯示(不阻斷、不整頁報錯),載入完成後反射自動補上。 */}
            <EnvErrorBoundary onRetry={() => setEnvRetryKey(k => k + 1)}>
                <Suspense fallback={null}>
                    <Environment
                        key={`${safePreset}_${envRetryKey}`}
                        preset={safePreset}
                        environmentIntensity={envIntensity}
                        background={false}
                    />
                </Suspense>
            </EnvErrorBoundary>

            {/* 聚光燈已移至 StageLightRenderer 元件，由燈光系統統一管理 */}

            {/* 接觸陰影 - 柔和的地面陰影效果 */}
            {contactShadow && (
                <ContactShadows
                    position={[0, 0, 0]}
                    opacity={0.35}
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
