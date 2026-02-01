import { v2 as cloudinary } from 'cloudinary';
import { rateLimit } from '@/lib/ratelimit';
import { NextRequest, NextResponse } from 'next/server';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    // Security: Rate limiting (20 signature requests per minute per IP)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

    const { success, remaining, reset } = rateLimit(
        `cloudinary-sign:${ip}`,
        20,  // Max 20 requests
        60 * 1000  // Per 1 minute
    );

    if (!success) {
        return NextResponse.json(
            { error: 'Too many signature requests. Please try again later.' },
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
        const body = await request.json();
        const { paramsToSign } = body;
        const timestamp = Math.round(new Date().getTime() / 1000);

        // Add timestamp to params to sign
        const signature = cloudinary.utils.api_sign_request(
            { ...paramsToSign, timestamp },
            process.env.CLOUDINARY_API_SECRET as string
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME
        });
    } catch (error) {
        console.error('Signing error:', error);
        return NextResponse.json({ error: 'Failed to sign request' }, { status: 500 });
    }
}
