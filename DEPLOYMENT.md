# Deployment Guide 🚀

Complete guide for deploying ARtisan to production.

## Overview

ARtisan requires deploying three components:

1. **Convex Backend** - Serverless functions and real-time database
2. **Next.js Frontend** - Web application
3. **Supabase** - Already hosted, just needs configuration

## Prerequisites

- [ ] All development environment working locally
- [ ] GitHub repository (for Vercel deployment)
- [ ] Vercel account
- [ ] Production API keys for all services

## Step 1: Prepare for Deployment

### 1.1 Environment Variables

Create a production `.env.production` file with all your production API keys:

```bash
# Convex (will be production URL after step 2)
NEXT_PUBLIC_CONVEX_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
FAL_KEY=
GOOGLE_AI_API_KEY=
GROQ_API_KEY=
ELEVENLABS_API_KEY=
MANUS_API_KEY=
MEM0_API_KEY=

# Production URL (will be your Vercel domain)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 1.2 Code Cleanup

```bash
# Run linting
npm run lint

# Test build locally
npm run build

# Test production build
npm start
```

## Step 2: Deploy Convex Backend

### 2.1 Deploy to Convex Production

```bash
# Deploy Convex functions
npx convex deploy --prod

# This will output your production NEXT_PUBLIC_CONVEX_URL
# Copy this URL for the next step
```

### 2.2 Update Environment Variables

Update your `.env.production` with the production Convex URL.

## Step 3: Deploy to Vercel

### 3.1 Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework: Next.js
   - Root Directory: `./`
   - Build Command: `next build`
   - Output Directory: `.next`

### 3.3 Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_CONVEX_URL=your-production-convex-url
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FAL_KEY=your-fal-key
GOOGLE_AI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
ELEVENLABS_API_KEY=your-elevenlabs-key
MANUS_API_KEY=your-manus-key
MEM0_API_KEY=your-mem0-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Important:** Set these for all environments (Production, Preview, Development)

### 3.4 Deploy

Click "Deploy" and wait for the build to complete.

## Step 4: Update Convex Workflows

After deployment, you need to update the `NEXT_PUBLIC_APP_URL` in your Convex workflows:

1. Update `.env.production` with your actual Vercel URL
2. Redeploy:

```bash
npx convex deploy --prod
```

## Step 5: Configure Supabase

### 5.1 Update CORS Settings

In Supabase dashboard:

1. Go to Storage → Policies
2. Make sure all buckets allow public read access
3. Add your Vercel domain to allowed origins if needed

### 5.2 Configure Storage Buckets

Ensure all buckets are set to public:

- photos
- environments
- models
- audio

## Step 6: Test Production Deployment

1. Visit your Vercel URL
2. Test complete workflow:
   - [ ] Upload photo
   - [ ] Scene generation
   - [ ] AR viewer loads
   - [ ] Doodle to Life works
   - [ ] Music plays (if enabled)

## Post-Deployment

### Monitoring

1. **Vercel Dashboard**: Monitor deployments and errors
2. **Convex Dashboard**: Check function logs and database
3. **Supabase Dashboard**: Monitor storage usage
4. **Browser Console**: Check for client-side errors

### Performance Optimization

1. **Enable Vercel Analytics**:

```bash
npm install @vercel/analytics
```

Add to `layout.tsx`:

```tsx
import { Analytics } from "@vercel/analytics/react";

// In body:
<Analytics />;
```

2. **Enable Image Optimization**: Already configured in `next.config.ts`

3. **Monitor API Usage**: Check each AI service dashboard for usage

### Security

1. **Rotate Keys**: If any keys were exposed, rotate them immediately
2. **Review Supabase RLS**: Ensure proper row-level security
3. **HTTPS Only**: Vercel handles this automatically
4. **Rate Limiting**: Consider adding for production

## Troubleshooting

### Issue: Convex Connection Failed

**Solution:**

- Verify `NEXT_PUBLIC_CONVEX_URL` is production URL
- Check Convex dashboard for errors
- Ensure Convex deployment succeeded

### Issue: Images Not Loading

**Solution:**

- Check Supabase bucket permissions
- Verify CORS settings
- Check storage quota

### Issue: API Rate Limits

**Solution:**

- Monitor API usage in each service dashboard
- Implement client-side rate limiting
- Consider caching strategies

### Issue: Slow Performance

**Solution:**

- Enable Vercel Edge Functions
- Optimize image sizes
- Add loading states
- Consider CDN for assets

## Scaling Considerations

### High Traffic

1. **Convex**: Automatically scales
2. **Vercel**: Consider Pro plan for better performance
3. **Supabase**: Monitor storage and bandwidth
4. **AI Services**: Check rate limits and pricing tiers

### Cost Management

Monitor costs on:

- Vercel (bandwidth, function execution)
- Convex (database size, function calls)
- Supabase (storage, bandwidth)
- AI Services (API calls)

## Rollback Procedure

If something goes wrong:

1. **Vercel**: Click "Rollback" to previous deployment
2. **Convex**: No rollback needed, functions are stateless
3. **Database**: Convex keeps snapshots automatically

## CI/CD Setup (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
```

## Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Redeploy

## Maintenance

### Regular Tasks

- [ ] Monitor API usage and costs (weekly)
- [ ] Check error logs (daily)
- [ ] Update dependencies (monthly)
- [ ] Backup Convex data (automated)
- [ ] Review and rotate API keys (quarterly)

### Updates

```bash
# Update dependencies
npm update

# Test locally
npm run dev

# Deploy
npx convex deploy --prod
git push origin main
```

## Success Checklist

- [ ] Convex deployed to production
- [ ] Next.js deployed to Vercel
- [ ] All environment variables set correctly
- [ ] Supabase buckets configured and public
- [ ] Custom domain configured (optional)
- [ ] All features tested in production
- [ ] Monitoring set up
- [ ] Error tracking configured

---

Congratulations! Your ARtisan app is now live! 🎉
