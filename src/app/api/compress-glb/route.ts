import { NextRequest, NextResponse } from 'next/server';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import { rateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
    // Security: Rate limiting (3 compressions per minute per IP - CPU intensive)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

    const { success, remaining, reset } = rateLimit(
        `compress-glb:${ip}`,
        3,  // Max 3 requests (compression is CPU intensive)
        60 * 1000  // Per 1 minute
    );

    if (!success) {
        return NextResponse.json(
            { error: 'Too many compression requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': reset ? new Date(reset).toISOString() : '',
                    'Retry-After': '60'
                }
            }
        );
    }
    try {
        // Dynamic import for draco3dgltf (CommonJS module)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const draco3d = require('draco3dgltf');

        // Get the raw binary data from the request
        const arrayBuffer = await request.arrayBuffer();
        const originalSize = arrayBuffer.byteLength;

        // Security: Validate file size (max 50MB)
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (originalSize > MAX_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 50MB.' },
                { status: 413 }
            );
        }

        // Security: Validate GLB file format (check magic number)
        if (originalSize < 4) {
            return NextResponse.json(
                { error: 'Invalid file. File too small to be a valid GLB.' },
                { status: 400 }
            );
        }

        const view = new DataView(arrayBuffer);
        const magic = view.getUint32(0, true);
        if (magic !== 0x46546C67) { // "glTF" in ASCII (little-endian)
            return NextResponse.json(
                { error: 'Invalid GLB file format. Expected glTF binary file.' },
                { status: 400 }
            );
        }

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
