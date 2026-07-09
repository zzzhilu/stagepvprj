/**
 * Cloudflare Worker: GDrive Video Streaming Proxy
 *
 * Replaces Vercel's /api/drive/stream/[fileId] route.
 * All video data flows through Cloudflare (free, unlimited bandwidth)
 * instead of Vercel (100GB/month limit).
 *
 * Routes:
 *   GET /stream/:fileId  — stream video with Range support
 *   GET /meta/:fileId    — get file metadata (mimeType, size)
 */

export interface Env {
  SA_CLIENT_EMAIL: string;
  SA_PRIVATE_KEY: string;
}

// ─── Token Cache ───────────────────────────────────────────
let cachedToken: { token: string; expiry: number } | null = null;

// ─── Metadata Cache ────────────────────────────────────────
const metaCache = new Map<string, { mimeType: string; size: number; ts: number }>();
const META_TTL = 3600_000; // 1 hour

// ─── JWT / OAuth ───────────────────────────────────────────

/**
 * Create a JWT signed with the Service Account private key using Web Crypto API.
 * Google OAuth2 requires RS256 (RSASSA-PKCS1-v1_5 with SHA-256).
 */
async function createSignedJwt(email: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const key = await importPrivateKey(privateKeyPem);

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsignedToken}.${sigB64}`;
}

/**
 * Import a PEM-encoded RSA private key for use with Web Crypto API.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Strip PEM headers and decode
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryString = atob(pemBody);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Get a Google OAuth2 access token using the Service Account JWT.
 * Caches the token for 50 minutes (tokens last 60 min).
 */
async function getAccessToken(env: Env): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry) {
    return cachedToken.token;
  }

  const jwt = await createSignedJwt(env.SA_CLIENT_EMAIL, env.SA_PRIVATE_KEY);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiry: Date.now() + 50 * 60 * 1000, // cache for 50 min
  };

  return data.access_token;
}

// ─── File Metadata ─────────────────────────────────────────

async function getFileMeta(
  fileId: string,
  accessToken: string
): Promise<{ mimeType: string; size: number }> {
  const cached = metaCache.get(fileId);
  if (cached && Date.now() - cached.ts < META_TTL) {
    return cached;
  }

  const res = await fetch(
    // supportsAllDrives=true:Workspace 共用雲端硬碟(Shared Drive)的檔案必要,否則回 404
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=size,mimeType&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Metadata fetch failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { mimeType?: string; size?: string };
  const rawMime = data.mimeType || 'video/mp4';
  const meta = {
    mimeType: rawMime === 'application/octet-stream' ? 'video/mp4' : rawMime,
    size: parseInt(data.size || '0', 10),
    ts: Date.now(),
  };

  metaCache.set(fileId, meta);
  return meta;
}

// ─── CORS Headers ──────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, Range, Accept-Ranges, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
}

// ─── Route Handlers ────────────────────────────────────────

async function handleStream(fileId: string, request: Request, env: Env): Promise<Response> {
  const accessToken = await getAccessToken(env);
  const meta = await getFileMeta(fileId, accessToken);
  const { mimeType, size: fileSize } = meta;

  const rangeHeader = request.headers.get('Range');

  // --- Range request (seeking) ---
  if (rangeHeader && fileSize > 0) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2]
        ? parseInt(match[2], 10)
        : Math.min(start + 5 * 1024 * 1024 - 1, fileSize - 1); // 5MB chunks
      const chunkSize = end - start + 1;

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Range: `bytes=${start}-${end}`,
          },
        }
      );

      if (!driveRes.ok && driveRes.status !== 206) {
        return new Response('Failed to fetch from Drive', {
          status: driveRes.status,
          headers: corsHeaders(),
        });
      }

      return new Response(driveRes.body, {
        status: 206,
        headers: {
          'Content-Type': mimeType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          ...corsHeaders(),
        },
      });
    }
  }

  // --- Full file request ---
  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!driveRes.ok) {
    return new Response('Failed to fetch from Drive', {
      status: driveRes.status,
      headers: corsHeaders(),
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
    ...corsHeaders(),
  };
  if (fileSize > 0) {
    headers['Content-Length'] = fileSize.toString();
  }

  return new Response(driveRes.body, { status: 200, headers });
}

async function handleMeta(fileId: string, env: Env): Promise<Response> {
  const accessToken = await getAccessToken(env);
  const meta = await getFileMeta(fileId, accessToken);

  return new Response(JSON.stringify(meta), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      ...corsHeaders(),
    },
  });
}

// ─── Main Handler ──────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Route: /stream/:fileId
    const streamMatch = path.match(/^\/stream\/([a-zA-Z0-9_-]+)$/);
    if (streamMatch && request.method === 'GET') {
      try {
        return await handleStream(streamMatch[1], request, env);
      } catch (err: any) {
        console.error('Stream error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }
    }

    // Route: /meta/:fileId
    const metaMatch = path.match(/^\/meta\/([a-zA-Z0-9_-]+)$/);
    if (metaMatch && request.method === 'GET') {
      try {
        return await handleMeta(metaMatch[1], env);
      } catch (err: any) {
        console.error('Meta error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }
    }

    // Health check
    if (path === '/' || path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'gdrive-stream' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  },
};
