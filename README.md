This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Security Configuration

### Environment Variables Setup

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Fill in the required values:
   - **Firebase**: Get from Firebase Console > Project Settings
   - **Cloudflare R2**: Get from Cloudflare Dashboard > R2 > Manage R2 API Tokens
   - **Cloudinary**: Get from Cloudinary Dashboard > Settings > API Keys

⚠️ **Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### API Security

All API endpoints are protected with:

- **Rate Limiting**: Prevents abuse and DoS attacks
  - R2 uploads/deletes: 10 requests per minute per IP
  - Cloudinary uploads: 5 requests per minute per IP
  - Cloudinary signatures: 20 requests per minute per IP
  - GLB compression: 3 requests per minute per IP (CPU intensive)

- **File Validation**:
  - GLB files: Max 50MB, format validation (magic number check)
  - Other uploads: Max 100MB

- **Secure Credential Handling**:
  - API secrets kept server-side only
  - No API keys exposed to client
  - Presigned URLs for R2 uploads

### Firebase Security Rules

Configure Firestore and Storage security rules in Firebase Console:

**Firestore Rules** (`Database > Rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Authenticated writes
    }
  }
}
```

**Storage Rules** (`Storage > Rules`):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Production Deployment (Vercel)

For production deployments with Vercel:

1. Set all environment variables in Vercel Dashboard
2. Consider upgrading rate limiting to use Vercel KV for distributed rate limiting:
   ```bash
   npm install @vercel/kv
   ```
3. Uncomment the Vercel KV implementation in `src/lib/ratelimit.ts`
4. Create a KV store in Vercel Dashboard and link to your project

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
