# IMPLEMENTATION PLAN - Image Progress & R2 Sharing

## Goal Description
Implement the "Image Progress" feature - a project management and sharing platform for stage previews.

Key features:
1. **Project Integration**: Sync with "Free Test" projects (shared DB).
2. **R2 Video Upload**: Direct upload from project page to Cloudflare R2.
3. **Video Management**: Add/remove videos per project.
4. **Sharing**: Generate share links using `video=[videoId]`.
5. **View Only Mode**: Hide editing UI, show rendering with assigned video.
6. **Watermark**: `[ProjectName] - [R2 Video Filename]`.

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
