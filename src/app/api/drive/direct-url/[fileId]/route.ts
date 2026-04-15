import { NextRequest, NextResponse } from 'next/server';
import { getDriveAuth } from '@/lib/drive';
import { google } from 'googleapis';

/**
 * Generate a short-lived direct download URL for a Google Drive file.
 * This avoids proxying the entire video stream through Vercel,
 * dramatically reducing Vercel bandwidth usage.
 * 
 * The URL uses the service account's OAuth token and expires in ~1 hour.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const fileId = params.fileId;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const auth = getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Verify the file exists and get metadata
    let metadata;
    try {
      metadata = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, webContentLink',
      });
    } catch (e: any) {
      console.error('[Direct URL] File not found:', fileId, e.message);
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // Get an access token from the service account
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to generate access token' },
        { status: 500 }
      );
    }

    // Construct a direct download URL using the access token
    // This URL goes directly to Google's servers, bypassing Vercel
    const directUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&acknowledgeAbuse=true`;

    const rawMimeType = metadata.data.mimeType || 'video/mp4';
    const mimeType = rawMimeType === 'application/octet-stream' ? 'video/mp4' : rawMimeType;

    return NextResponse.json({
      url: directUrl,
      token: accessToken,
      mimeType,
      size: metadata.data.size ? parseInt(metadata.data.size, 10) : undefined,
      filename: metadata.data.name,
    }, {
      headers: {
        // Cache this response for 30 minutes (token valid ~1hr)
        'Cache-Control': 'private, max-age=1800',
      },
    });
  } catch (error: any) {
    console.error('[Direct URL] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate direct URL' },
      { status: error.status || 500 }
    );
  }
}
