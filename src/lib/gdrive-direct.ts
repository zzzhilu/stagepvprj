/**
 * GDrive Direct URL resolver — avoids proxying video through Vercel.
 * 
 * Instead of streaming via `/api/drive/stream/{fileId}` (which passes every byte
 * through the Vercel serverless function), this fetches a short-lived direct URL
 * from `/api/drive/direct-url/{fileId}` and constructs a URL that the browser
 * can use to download directly from Google's CDN.
 * 
 * Flow:
 *   Browser → Vercel (tiny JSON, ~1KB) → get token + URL
 *   Browser → Google CDN (video data) → 0 Vercel bandwidth
 */

interface DirectUrlResponse {
  url: string;
  token: string;
  mimeType: string;
  size?: number;
  filename?: string;
}

// Cache resolved URLs in memory to avoid repeated API calls
const urlCache = new Map<string, { data: DirectUrlResponse; expiresAt: number }>();
const CACHE_TTL = 25 * 60 * 1000; // 25 minutes (token valid ~1hr, refresh early)

/**
 * Resolve a GDrive file ID to a direct download URL.
 * Returns the direct URL + auth token, or falls back to the proxy stream URL.
 */
export async function resolveGDriveUrl(driveFileId: string): Promise<string> {
  try {
    // Check memory cache first
    const cached = urlCache.get(driveFileId);
    if (cached && Date.now() < cached.expiresAt) {
      return buildAuthenticatedUrl(cached.data);
    }

    const res = await fetch(`/api/drive/direct-url/${driveFileId}`);
    
    if (!res.ok) {
      console.warn(`[GDrive Direct] Failed to get direct URL for ${driveFileId}, falling back to proxy`);
      return `/api/drive/stream/${driveFileId}`;
    }

    const data: DirectUrlResponse = await res.json();
    
    // Cache the result
    urlCache.set(driveFileId, {
      data,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return buildAuthenticatedUrl(data);
  } catch (err) {
    console.warn('[GDrive Direct] Error resolving direct URL, falling back to proxy:', err);
    return `/api/drive/stream/${driveFileId}`;
  }
}

/**
 * Build the final URL with authentication header embedded.
 * Since <video> elements can't set custom headers, we use a Blob URL approach
 * for the initial load, but for Range requests during seeking, we need
 * a different strategy.
 * 
 * For simplicity and maximum compatibility, we use the proxy URL with caching
 * as the primary approach, and provide the direct URL for future optimization.
 */
function buildAuthenticatedUrl(data: DirectUrlResponse): string {
  // Use the Google API URL with access_token query parameter
  // This works because Google APIs accept tokens as query parameters
  return `${data.url}&access_token=${encodeURIComponent(data.token)}`;
}

/**
 * Clear the URL cache (e.g., on project switch)
 */
export function clearGDriveUrlCache(): void {
  urlCache.clear();
}
