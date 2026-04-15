import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Origin, Range, Accept-Ranges, Content-Type');
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const fileId = params.fileId;
    const drive = getDriveClient();
    
    // 1. Get file metadata (size, mimeType)
    let metadata;
    try {
        metadata = await drive.files.get({
            fileId,
            fields: 'size, mimeType',
        });
    } catch (e) {
        console.error("Failed to get metadata for", fileId, e);
        return new NextResponse("File not found or access denied", { status: 404 });
    }

    const fileSize = parseInt(metadata.data.size || '0', 10);
    
    // Coerce octet-stream to video/mp4 to ensure HTMLVideoElement plays it
    const rawMimeType = metadata.data.mimeType || 'video/mp4';
    const mimeType = rawMimeType === 'application/octet-stream' ? 'video/mp4' : rawMimeType;

    // 2. Parse Range header
    const rangeHeader = request.headers.get('range');
    
    let start = 0;
    let end = fileSize - 1;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Ensure ranges are within bounds
      if (start >= fileSize || end >= fileSize) {
        return new NextResponse("Requested Range Not Satisfiable", {
            status: 416,
            headers: {
                "Content-Range": `bytes */${fileSize}`,
                "Access-Control-Allow-Origin": "*"
            }
        });
      }
    }

    const chunkSize = (end - start) + 1;

    const driveReqHeaders: Record<string, string> = {};
    if (rangeHeader) {
        driveReqHeaders['Range'] = `bytes=${start}-${end}`;
    }

    // 3. Fetch stream from Google Drive with exact Range (uses axios/node http underlyingly)
    let driveRes;
    try {
        driveRes = await drive.files.get(
        {
            fileId,
            alt: 'media',
            acknowledgeAbuse: true, // critical for large files so the API doesn't throw Abusive File error
        },
        {
            responseType: 'stream',
            headers: driveReqHeaders,
        }
        );
    } catch (apiErr: any) {
        console.error(`[Drive Stream] Google API Error:`, apiErr.message);
        return new NextResponse(`Upstream Drive Error: ${apiErr.message}`, { status: apiErr.status || 500 });
    }

    // 4. Set Response Headers
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Type', mimeType);

    // Enable caching to reduce Vercel bandwidth — same video content is immutable
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');

    let status = 200;
    if (rangeHeader || driveRes.status === 206) {
        status = 206;
        const upstreamContentRange = driveRes.headers['content-range'];
        headers.set('Content-Range', upstreamContentRange || `bytes ${start}-${end}/${fileSize}`);
        
        const upstreamContentLength = driveRes.headers['content-length'];
        headers.set('Content-Length', upstreamContentLength || chunkSize.toString());
    } else {
        headers.set('Content-Length', driveRes.headers['content-length'] || fileSize.toString());
    }

    // 5. Convert Node.js Readable to Web ReadableStream
    const reactReadable = new ReadableStream({
      start(controller) {
        driveRes.data.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
        });
        driveRes.data.on('end', () => controller.close());
        driveRes.data.on('error', (err: any) => {
            if (err?.message !== 'Premature close') {
                console.error('[Drive Stream] Data transfer error:', err.message);
            }
            controller.error(err);
        });
      },
      cancel() {
        if (driveRes.data && typeof driveRes.data.destroy === 'function') {
          driveRes.data.destroy();
        }
      }
    });

    return new NextResponse(reactReadable, {
      status,
      headers,
    });
  } catch (error: any) {
    console.error('Drive Stream Error:', error);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: error.status || 500 });
  }
}
