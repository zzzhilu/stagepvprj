import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const timestamp = Math.round(new Date().getTime() / 1000);

        // Add timestamp to params to sign
        const signature = cloudinary.utils.api_sign_request(
            { ...paramsToSign, timestamp },
            process.env.CLOUDINARY_API_SECRET as string
        );

        return Response.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY
        });
    } catch (error) {
        console.error('Signing error:', error);
        return Response.json({ error: 'Failed to sign request' }, { status: 500 });
    }
}
