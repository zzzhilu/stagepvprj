import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

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
    const mimeType = metadata.data.mimeType || 'video/mp4';

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
                "Content-Range": `bytes */${fileSize}`
            }
        });
      }
    }

    const chunkSize = (end - start) + 1;

    // 3. Fetch stream from Google Drive with exact Range
    const driveRes = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
        headers: {
          Range: `bytes=${start}-${end}`,
        },
      }
    );

    // 4. Set headers for 206 Partial Content
    const headers = new Headers();
    headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', chunkSize.toString());
    headers.set('Content-Type', mimeType);

    // 5. Convert Node.js Readable to Web ReadableStream
    const reactReadable = new ReadableStream({
      start(controller) {
        driveRes.data.on('data', (chunk: Buffer) => {
             // Use Uint8Array over Buffer for standard web stream
            controller.enqueue(new Uint8Array(chunk));
        });
        driveRes.data.on('end', () => controller.close());
        driveRes.data.on('error', (err: Error) => controller.error(err));
      },
      cancel() {
        if (driveRes.data && typeof driveRes.data.destroy === 'function') {
          driveRes.data.destroy();
        }
      }
    });

    return new NextResponse(reactReadable, {
      status: 206,
      headers,
    });
  } catch (error: any) {
    console.error('Drive Stream Error:', error);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: error.status || 500 });
  }
}
