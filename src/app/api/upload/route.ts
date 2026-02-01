import { v2 as cloudinary } from 'cloudinary';
import { rateLimit } from '@/lib/ratelimit';
import { NextRequest, NextResponse } from 'next/server';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    // Security: Rate limiting (5 uploads per minute per IP)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

    const { success, remaining, reset } = rateLimit(
        `cloudinary-upload:${ip}`,
        5,  // Max 5 requests
        60 * 1000  // Per 1 minute
    );

    if (!success) {
        return NextResponse.json(
            { error: 'Too many upload requests. Please try again later.' },
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
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'image' or 'video'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Security: Validate file size (max 100MB)
        const MAX_SIZE = 100 * 1024 * 1024; // 100MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 100MB.' },
                { status: 413 }
            );
        }

        // Convert file to base64 for upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataUri = `data:${file.type};base64,${base64}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataUri, {
            resource_type: type === 'model' ? 'raw' : (type === 'video' ? 'video' : 'image'),
            folder: 'stagepv',
            // For videos, enable streaming
            ...(type === 'video' && {
                eager: [
                    { streaming_profile: 'full_hd', format: 'm3u8' }
                ],
                eager_async: true,
            }),
        });

        return NextResponse.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            resource_type: result.resource_type,
            // HLS streaming URL for videos
            hls_url: type === 'video'
                ? result.secure_url.replace(/\.[^.]+$/, '.m3u8')
                : undefined,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}


