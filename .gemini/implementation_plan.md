# IMPLEMENTATION PLAN - Image Progress & R2 Sharing

## Goal Description
Implement the "Image Progress" feature - a project management and sharing platform for stage previews.

Key features:
1. **Project Integration**: Sync with "Free Test" projects (shared DB).
2. **R2 Video Upload**: Direct upload from project page to Cloudflare R2 (via Presigned URL).
3. **Video Management**: Add/remove videos per project with Chinese filename support.
4. **Sharing**: Generate share links using `video=[videoId]`.
5. **View Only Mode**: Hide editing UI, show rendering with assigned video.
6. **Watermark**: Display `[ProjectName] - [R2 Video Filename]` in bottom right (using existing Free Test style).

---

## Prerequisites [1/1]
- [x] R2 Credentials & CORS configured

---

## Phase 1: R2 Upload API [0/2]
- [ ] Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- [ ] Create `/api/r2-upload/route.ts` (presigned URL generation)

## Phase 2: Schema Update [0/2]
- [ ] Update `useStore.ts` - Add `R2Video` interface and `r2Videos` state
- [ ] Update `project-service.ts` - Add `r2Videos` to `ProjectState`

## Phase 3: R2 Video Manager [0/1]
- [ ] Create `R2VideoManager.tsx` (upload, list, delete, share button)

## Phase 4: Video Progress Pages [0/2]
- [ ] Update `/video-progress/page.tsx` - List projects
- [ ] Create `/video-progress/[id]/page.tsx` - Project detail with video manager

## Phase 5: Share Page [0/1]
- [ ] Create `/share/[id]/page.tsx` - View only mode with watermark

---

## Technical Notes

### R2 Upload Flow
1. Frontend calls `/api/r2-upload` with filename
2. API generates presigned PUT URL (valid 10 min)
3. Frontend uploads directly to R2
4. Frontend saves video metadata (URL, name) to Firestore

### Filename Extraction
- R2 URL example: `https://pub-xxx.r2.dev/測試影片.mp4`
- Extract: `decodeURIComponent(url.split('/').pop())`
- Display: Remove extension for cleaner display

### Share Link Format
`/share/[projectId]?video=[videoId]`
- `videoId` is the Firestore document ID of the R2Video entry
- Query param determines which video to auto-play

### Caching Optimization
- 3D models (GLB): Browser standard HTTP cache
- Videos: Streamed from R2 CDN (no full download needed)
