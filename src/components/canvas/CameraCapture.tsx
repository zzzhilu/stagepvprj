import { useThree } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { useEffect, RefObject } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraCaptureProps {
    controlsRef: any;
}

export function CameraCapture({ controlsRef }: CameraCaptureProps) {
    const { camera } = useThree();
    const capturePending = useStore((state) => state.capturePending);
    const confirmCapture = useStore((state) => state.confirmCapture);

    useEffect(() => {
        if (capturePending) {
            // Capture current camera state
            const position = camera.position.toArray() as [number, number, number];

            // Get target from controls if available
            let target: [number, number, number] = [0, 0, 0];
            if (controlsRef.current) {
                target = controlsRef.current.target.toArray() as [number, number, number];
            } else {
                // Fallback: project unit vector forward
                // const forward = new THREE.Vector3(0, 0, -1);
                // forward.applyQuaternion(camera.quaternion);
                // forward.add(camera.position);
                // target = forward.toArray();
            }

            confirmCapture({
                position,
                target,
                fov: (camera as any).fov
            });
        }
    }, [capturePending, camera, confirmCapture, controlsRef]);

    return null;
}

