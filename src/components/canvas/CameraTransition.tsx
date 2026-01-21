import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { easing } from 'maath';
import * as THREE from 'three';

export function CameraTransition() {
    const activeViewId = useStore((state) => state.activeViewId);
    const views = useStore((state) => state.views);
    const { controls } = useThree();

    const targetView = views.find(v => v.id === activeViewId);

    useFrame((state, delta) => {
        if (targetView && controls) {
            // Smoothly interpolate camera position
            easing.damp3(
                state.camera.position,
                targetView.camera.position,
                0.5,
                delta
            );

            // Smoothly interpolate controls target
            const orbitControls = controls as { target?: THREE.Vector3 };
            if (orbitControls.target) {
                easing.damp3(
                    orbitControls.target,
                    targetView.camera.target,
                    0.5,
                    delta
                );
            }
        }
    });

    return null;
}
