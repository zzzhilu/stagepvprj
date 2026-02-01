import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { rateLimit } from '@/lib/ratelimit';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * POST /api/r2-upload
 * Generate a presigned URL for uploading a video to R2
 * Body: { filename: string, contentType: string }
 * Returns: { uploadUrl: string, publicUrl: string, videoId: string, filename: string, key: string }
 */
export async function POST(request: NextRequest) {
    // Security: Rate limiting (10 requests per minute per IP)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

    const { success, remaining, reset } = rateLimit(
        `r2-upload-post:${ip}`,
        10,  // Max 10 requests
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
        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: 'Missing filename or contentType' },
                { status: 400 }
            );
        }

        // Generate unique video ID
        const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Create object key with videoId prefix for easy management
        // Preserve original filename for display purposes
        const safeFilename = encodeURIComponent(filename);
        const key = `videos/${videoId}/${safeFilename}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        // Generate presigned URL (expires in 1 hour)
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        // Construct the public URL
        const publicUrl = `${R2_PUBLIC_URL}/${key}`;

        return NextResponse.json({
            uploadUrl,
            publicUrl,
            videoId,
            filename,
            key,
        });
    } catch (error: any) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate upload URL',
                details: error.message,
                code: error.Code || error.code || 'UNKNOWN'
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/r2-upload
 * Delete a video from R2
 * Body: { key: string }
 * Returns: { success: true }
 */
export async function DELETE(request: NextRequest) {
    // Security: Rate limiting (10 requests per minute per IP)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

    const { success, remaining, reset } = rateLimit(
        `r2-upload-delete:${ip}`,
        10,  // Max 10 requests
        60 * 1000  // Per 1 minute
    );

    if (!success) {
        return NextResponse.json(
            { error: 'Too many delete requests. Please try again later.' },
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
        const { key } = await request.json();

        if (!key) {
            return NextResponse.json(
                { error: 'Missing key' },
                { status: 400 }
            );
        }

        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting from R2:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete video',
                details: error.message,
                code: error.Code || error.code || 'UNKNOWN'
            },
            { status: 500 }
        );
    }
}
