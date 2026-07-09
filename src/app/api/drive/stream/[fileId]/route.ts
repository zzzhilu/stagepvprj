import { NextRequest, NextResponse } from 'next/server';
import { getDriveAuth, getDriveClient } from '@/lib/drive';
import { Readable } from 'stream';

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Origin, Range, Accept-Ranges, Content-Type');
  return new NextResponse(null, { status: 204, headers });
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

    const drive = getDriveClient();

    // --- 1. Get file metadata (cached) ---
    let meta = metaCache.get(fileId);
    if (!meta || Date.now() - meta.ts > META_TTL) {
      try {
        const metadataRes = await drive.files.get({
          fileId,
          fields: 'size, mimeType',
            supportsAllDrives: true, // Shared Drive 支援
        });
        const rawMime = metadataRes.data.mimeType || 'video/mp4';
        meta = {
          mimeType: rawMime === 'application/octet-stream' ? 'video/mp4' : rawMime,
          size: parseInt(metadataRes.data.size || '0', 10),
          ts: Date.now(),
        };
        metaCache.set(fileId, meta);
      } catch (e: any) {
        // 回傳真實錯誤以利診斷(Shared Drive 權限、檔案不存在、配額等)
        const gErr = e?.errors?.[0] || {};
        const detail = `${e?.code || ''} ${gErr.reason || ''} ${e?.message || ''}`.trim();
        console.error("[drive/stream] metadata failed", fileId, detail, e?.response?.data);
        return new NextResponse(`Drive metadata error: ${detail || 'unknown'}`, {
          status: e?.code === 404 ? 404 : 403,
        });
      }
    }

    const { mimeType, size: fileSize } = meta;
    if (!fileSize) {
      // Shared Drive 某些檔案 metadata 不含 size → 無法做 Range 分段,退回完整串流
      console.warn('[drive/stream] no size in metadata (Shared Drive?), full stream fallback', fileId);
    }

    // --- 2. Handle Range requests for video seeking ---
    const rangeHeader = request.headers.get('range');

    if (rangeHeader && fileSize > 0) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 5 * 1024 * 1024 - 1, fileSize - 1);
        const chunkSize = end - start + 1;

        const rangeRes = await drive.files.get(
          { fileId, alt: 'media', supportsAllDrives: true },
          {
            responseType: 'stream',
            headers: { Range: `bytes=${start}-${end}` },
          }
        );

        const nodeStream = rangeRes.data as unknown as Readable;
        const webStream = new ReadableStream({
          start(controller) {
            nodeStream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (err: Error) => controller.error(err));
          },
        });

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': chunkSize.toString(),
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        });
      }
    }

    // --- 3. Full file request (no Range) ---
    const fullRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    const nodeStream = fullRes.data as unknown as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err: Error) => controller.error(err));
      },
    });

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    };
    if (fileSize > 0) {
      headers['Content-Length'] = fileSize.toString();
    }

    return new NextResponse(webStream, { status: 200, headers });
  } catch (error: any) {
    console.error('Drive Stream Error:', error);
    return NextResponse.json({ error: 'Failed to stream file' }, { status: error.status || 500 });
  }
}
