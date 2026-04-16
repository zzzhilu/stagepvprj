/**
 * GDrive URL resolver.
 * 
 * Routes video requests through Cloudflare Worker to eliminate Vercel bandwidth.
 * The Worker handles JWT auth, Range requests, and adds CORP headers for COEP compat.
 * 
 * Flow:
 *   Browser → Cloudflare Worker (free egress) → Google Drive API
 *   Fallback: Browser → Vercel proxy → Google Drive (if WORKER_URL not set)
 */

const WORKER_URL = process.env.NEXT_PUBLIC_GDRIVE_WORKER_URL;

/**
 * Resolve a GDrive file ID to a playable URL.
 * Prefers Cloudflare Worker (zero Vercel bandwidth), falls back to Vercel proxy.
 */
export async function resolveGDriveUrl(driveFileId: string): Promise<string> {
  if (WORKER_URL) {
    return `${WORKER_URL}/stream/${driveFileId}`;
  }
  // Fallback to Vercel proxy if Worker URL not configured
  return `/api/drive/stream/${driveFileId}`;
}

/**
 * Clear the URL cache (no-op, kept for API compatibility)
 */
export function clearGDriveUrlCache(): void {
  // No-op — proxy URLs don't need cache management
}
