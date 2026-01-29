import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
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
    } catch (error) {
        console.error('Error deleting from R2:', error);
        return NextResponse.json(
            { error: 'Failed to delete video' },
            { status: 500 }
        );
    }
}
