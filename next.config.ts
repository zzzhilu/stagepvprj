import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'gltf-pipeline',
    'cesium',
    'draco3d',
    '@gltf-transform/core',
    '@gltf-transform/functions',
    '@gltf-transform/extensions',
    'draco3dgltf',
  ],

  // Security headers for FFmpeg WASM (SharedArrayBuffer support)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
      // Aggressive caching for static preset GLB models (they never change)
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
