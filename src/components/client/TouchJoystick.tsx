'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

/**
 * TouchJoystick
 * 
 * Virtual joystick using nipplejs for mobile walk mode.
 * Displays in the bottom-left area when walkMode is active on mobile.
 * Sends normalized direction to store.walkMoveInput.
 */
export function TouchJoystick() {
    const containerRef = useRef<HTMLDivElement>(null);
    const joystickRef = useRef<any>(null);
    const setWalkMoveInput = useStore(s => s.setWalkMoveInput);

    useEffect(() => {
        if (!containerRef.current) return;

        // Dynamic import to avoid SSR issues
        let mounted = true;

        import('nipplejs').then((nipplejs) => {
            if (!mounted || !containerRef.current) return;

            const manager = nipplejs.create({
                zone: containerRef.current,
                mode: 'static',
                position: { left: '50%', top: '50%' },
                color: 'rgba(255, 255, 255, 0.3)',
                size: 100,
                restOpacity: 0.6,
            });

            joystickRef.current = manager;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (manager as any).on('move', (_: any, data: any) => {
                if (!data.vector) return;
                // data.vector: { x: -1..1, y: -1..1 }
                // nipplejs y is inverted: up = positive y, which maps to forward
                setWalkMoveInput({
                    x: data.vector.x,
                    y: data.vector.y, // up = forward
                });
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (manager as any).on('end', () => {
                setWalkMoveInput({ x: 0, y: 0 });
            });
        });

        return () => {
            mounted = false;
            if (joystickRef.current) {
                joystickRef.current.destroy();
                joystickRef.current = null;
            }
            setWalkMoveInput({ x: 0, y: 0 });
        };
    }, [setWalkMoveInput]);

    return (
        <div
            ref={containerRef}
            className="w-[120px] h-[120px] relative"
            style={{ touchAction: 'none' }}
        />
    );
}
