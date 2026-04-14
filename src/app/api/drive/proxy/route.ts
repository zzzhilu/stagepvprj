import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

// Configure dynamic API route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const drive = getDriveClient();

    // Pass along Range header for video streaming/seeking
    const range = request.headers.get('range');
    const headers: Record<string, string> = {
        'Accept-Ranges': 'bytes'
    };
    if (range) {
        headers['Range'] = range;
    }
    
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream', headers }
    );

    // Convert Node.js readable stream to Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        res.data.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk);
        });
        res.data.on('end', () => {
          controller.close();
        });
        res.data.on('error', (err: any) => {
          controller.error(err);
        });
      }
    });
    
    const responseHeaders = new Headers();
    // Copy relevant headers from the Google Drive API response to support partial content
    const driveHeaders = res.headers as any;
    if (driveHeaders['content-type']) responseHeaders.set('Content-Type', driveHeaders['content-type']);
    if (driveHeaders['content-length']) responseHeaders.set('Content-Length', driveHeaders['content-length']);
    if (driveHeaders['content-range']) responseHeaders.set('Content-Range', driveHeaders['content-range']);
    if (driveHeaders['accept-ranges']) responseHeaders.set('Accept-Ranges', driveHeaders['accept-ranges']);

    return new NextResponse(readableStream, {
        status: res.status,
        headers: responseHeaders
    });
  } catch (error: any) {
    console.error('Drive Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to proxy file' }, { status: error.status || 500 });
  }
}
