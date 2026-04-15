import { NextRequest, NextResponse } from 'next/server';
import { getDriveAuth, getDriveClient } from '@/lib/drive';

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Origin, Range, Accept-Ranges, Content-Type');
  return new NextResponse(null, { status: 204, headers });
}

/**
 * In-memory cache for access tokens (they last 1 hour, we cache for 50 min)
 */
let cachedToken: { token: string; expiry: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry) {
    return cachedToken.token;
  }

  const auth = getDriveAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse.token;
  
  if (!token) {
    throw new Error('Failed to obtain access token');
  }

  // Cache for 50 minutes (tokens last 60 min)
  cachedToken = { token, expiry: Date.now() + 50 * 60 * 1000 };
  return token;
}

/**
 * In-memory cache for file metadata (mimeType + size), keyed by fileId.
 * Avoids a metadata API call on every request.
 */
const metaCache = new Map<string, { mimeType: string; size: number; ts: number }>();
const META_TTL = 3600_000; // 1 hour

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const fileId = params.fileId;

    // --- 1. Get file metadata (cached) ---
    let meta = metaCache.get(fileId);
    if (!meta || Date.now() - meta.ts > META_TTL) {
      const drive = getDriveClient();
      try {
        const metadataRes = await drive.files.get({
          fileId,
          fields: 'size, mimeType',
        });
        const rawMime = metadataRes.data.mimeType || 'video/mp4';
        meta = {
          mimeType: rawMime === 'application/octet-stream' ? 'video/mp4' : rawMime,
          size: parseInt(metadataRes.data.size || '0', 10),
          ts: Date.now(),
        };
        metaCache.set(fileId, meta);
      } catch (e) {
        console.error("Failed to get metadata for", fileId, e);
        return new NextResponse("File not found or access denied", { status: 404 });
      }
    }

    // --- 2. Build 302 redirect URL to Google Drive ---
    const accessToken = await getAccessToken();

    // Google Drive direct download URL with auth
    const redirectUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&acknowledgeAbuse=true&access_token=${accessToken}`;

    // --- 3. Return 302 redirect ---
    // The browser's <video> element will automatically follow the redirect
    // and send Range headers directly to Google's servers.
    // This means Vercel only serves ~500 bytes (the redirect response),
    // NOT the entire video file.
    const headers = new Headers();
    headers.set('Location', redirectUrl);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Location');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Cache the redirect itself for 50 minutes (matches token TTL).
    // Browsers will reuse this redirect URL without hitting Vercel again.
    headers.set('Cache-Control', 'public, max-age=3000, s-maxage=3000');

    return new NextResponse(null, {
      status: 302,
      headers,
    });
  } catch (error: any) {
    console.error('Drive Redirect Error:', error);
    return NextResponse.json({ error: 'Failed to redirect to video' }, { status: error.status || 500 });
  }
}
