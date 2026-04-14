import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'folderId is required' }, { status: 400 });
    }

    const drive = getDriveClient();
    
    // Get Folder details
    const folderRes = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, createdTime'
    });
    
    const folder = {
        id: folderRes.data.id,
        name: folderRes.data.name,
        createdTime: folderRes.data.createdTime
    };

    // Get videos and images in the folder
    const res = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'video/' or mimeType contains 'image/') and trashed = false`,
      fields: 'files(id, name, thumbnailLink, createdTime, size)',
      spaces: 'drive',
      pageSize: 100,
    });

    const files = res.data.files || [];
    
    // Sort files naturally by name (e.g. 01, 02, 03... 10)
    files.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    const videos = files.map(file => ({
      id: file.id,
      name: file.name,
      thumbnail_url: file.thumbnailLink,
      createdTime: file.createdTime,
      size: file.size,
    }));

    return NextResponse.json({ folder, videos });
  } catch (error: any) {
    console.error('Drive Sync Error:', error);
    return NextResponse.json({ error: `Failed to sync drive folder: ${error.message || error}` }, { status: error.status || 500 });
  }
}
