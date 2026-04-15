/**
 * GDrive URL resolver.
 * 
 * Originally attempted to bypass Vercel by using googleapis.com direct URLs,
 * but <video> elements cannot load from googleapis.com due to CORS restrictions.
 * 
 * Now uses the cached proxy stream route instead. The proxy has been optimized
 * with Cache-Control headers (public, max-age=3600, s-maxage=86400) so repeated
 * plays and seeks will use CDN/browser cache, significantly reducing bandwidth.
 * 
 * Flow:
 *   Browser → Vercel CDN (cached proxy) → Google Drive (only on cache miss)
 */

/**
 * Resolve a GDrive file ID to a playable URL.
 * Uses the Vercel proxy stream with aggressive caching.
 */
export async function resolveGDriveUrl(driveFileId: string): Promise<string> {
  // Use the proxy stream route which now has proper Cache-Control headers
  // (public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800)
  // This means:
  //   - Browser caches for 1 hour
  //   - Vercel CDN caches for 24 hours
  //   - Stale content served while revalidating for up to 7 days
  return `/api/drive/stream/${driveFileId}`;
}

/**
 * Clear the URL cache (no-op now, kept for API compatibility)
 */
export function clearGDriveUrlCache(): void {
  // No-op — proxy URLs don't need cache management
}
