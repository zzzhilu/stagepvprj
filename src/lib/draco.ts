import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Create a singleton DRACOLoader instance
let dracoLoader: DRACOLoader | null = null;

export function getDRACOLoader(): DRACOLoader {
    if (!dracoLoader) {
        dracoLoader = new DRACOLoader();
        // Use the CDN-hosted Draco decoder
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder for compatibility
        dracoLoader.preload();
    }
    return dracoLoader;
}

export function disposeDRACOLoader(): void {
    if (dracoLoader) {
        dracoLoader.dispose();
        dracoLoader = null;
    }
}
