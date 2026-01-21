import { NextRequest, NextResponse } from 'next/server';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';

export async function POST(request: NextRequest) {
    try {
        // Dynamic import for draco3dgltf (CommonJS module)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const draco3d = require('draco3dgltf');

        // Get the raw binary data from the request
        const arrayBuffer = await request.arrayBuffer();
        const originalSize = arrayBuffer.byteLength;

        // Initialize Draco encoder/decoder
        const io = new NodeIO()
            .registerExtensions(ALL_EXTENSIONS)
            .registerDependencies({
                'draco3d.decoder': await draco3d.createDecoderModule(),
                'draco3d.encoder': await draco3d.createEncoderModule(),
            });

        // Read the GLB file
        const document = await io.readBinary(new Uint8Array(arrayBuffer));

        // Apply Draco compression
        await document.transform(
            draco({
                method: 'edgebreaker',
                encodeSpeed: 5,
                decodeSpeed: 5,
                quantizePosition: 14,
                quantizeNormal: 10,
                quantizeTexcoord: 12,
                quantizeColor: 8,
                quantizeGeneric: 12,
            })
        );

        // Write the compressed GLB
        const compressedBuffer = await io.writeBinary(document);
        const compressedSize = compressedBuffer.byteLength;
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        // Return compressed GLB with headers containing size info
        return new NextResponse(compressedBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'model/gltf-binary',
                'X-Original-Size': originalSize.toString(),
                'X-Compressed-Size': compressedSize.toString(),
                'X-Compression-Ratio': compressionRatio,
            },
        });
    } catch (error) {
        console.error('GLB compression error:', error);
        return NextResponse.json(
            { error: 'Failed to compress GLB file', details: String(error) },
            { status: 500 }
        );
    }
}
