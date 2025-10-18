# ARtisan Troubleshooting Guide 🔧

Common issues and their solutions for ARtisan development and deployment.

## Table of Contents

1. [Setup Issues](#setup-issues)
2. [Development Issues](#development-issues)
3. [AI Service Issues](#ai-service-issues)
4. [Performance Issues](#performance-issues)
5. [Deployment Issues](#deployment-issues)
6. [Browser Issues](#browser-issues)

---

## Setup Issues

### Error: "Cannot find module '\_generated/server'"

**Cause:** Convex hasn't been initialized yet.

**Solution:**

```bash
# Initialize Convex
npx convex dev

# This will generate the necessary files in convex/_generated/
```

### Error: "Missing NEXT_PUBLIC_CONVEX_URL"

**Cause:** Environment variable not set.

**Solution:**

1. Run `npx convex dev`
2. Copy the URL from the output
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```
4. Restart your dev server

### Error: "SUPABASE_URL is not defined"

**Cause:** Supabase environment variables missing.

**Solution:**

1. Go to your Supabase project
2. Settings → API
3. Copy URL and keys to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### Error: "Failed to create storage bucket"

**Cause:** Buckets don't exist in Supabase.

**Solution:**

1. Go to Supabase Dashboard → Storage
2. Create four buckets: `photos`, `environments`, `models`, `audio`
3. Make each bucket public:
   - Click bucket
   - Policies tab
   - New Policy
   - Select "Allow public access"

---

## Development Issues

### TypeScript Errors in Convex Files

**Issue:** `Parameter implicitly has an 'any' type`

**Solution:** These are expected before Convex initialization. They'll disappear after running `npx convex dev`.

**Alternative:** Add type annotations if needed after generation:

```typescript
import { QueryCtx, MutationCtx } from "./_generated/server";
```

### Hot Reload Not Working

**Cause:** Multiple issues can cause this.

**Solution:**

```bash
# Clear Next.js cache
rm -rf .next

# Restart both servers
# Terminal 1:
npx convex dev

# Terminal 2:
npm run dev
```

### Port 3000 Already in Use

**Solution:**

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

---

## AI Service Issues

### Gemini API Error: "Invalid API Key"

**Symptoms:** Scene analysis fails immediately.

**Solutions:**

1. Verify key at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Ensure no extra spaces in `.env.local`
3. Restart dev server after updating key
4. Check API quota/limits

**Debug:**

```bash
# Check if key is loaded
console.log('Gemini key:', process.env.GOOGLE_AI_API_KEY?.substring(0, 10));
```

### fal.ai Generation Fails

**Symptoms:** "Failed to generate environment" error.

**Common Causes:**

1. Invalid API key
2. Rate limiting
3. Insufficient credits
4. Model unavailable

**Solutions:**

```typescript
// Add error handling in lib/ai-clients.ts
try {
  const result = await generateEnvironmentWithFal(prompt);
  return result;
} catch (error) {
  console.error("fal.ai error:", error);
  // Implement fallback
  return generateFallbackEnvironment(mood, environmentType);
}
```

**Check fal.ai status:**

- Dashboard: https://fal.ai/dashboard
- API Status: Check for service interruptions

### ElevenLabs Music Generation Slow

**Symptoms:** Music takes >2 minutes to generate.

**Solutions:**

1. **Reduce duration:**

   ```typescript
   duration_seconds: 15; // Instead of 30
   ```

2. **Make optional:**
   - Scene works without music
   - Generate music in background
   - Add manual "Generate Music" button

3. **Use fallback:**
   ```typescript
   try {
     return await generateMusicWithElevenLabs(prompt);
   } catch (error) {
     console.warn("Music generation failed, continuing without audio");
     return null;
   }
   ```

### Groq Rate Limiting

**Symptoms:** "Rate limit exceeded" errors.

**Solutions:**

1. Add retry logic with backoff:

   ```typescript
   async function groqWithRetry(prompt: string, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await groqClient.chat.completions.create({...});
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   }
   ```

2. Implement caching for repeated prompts

3. Use simpler prompts or fallback to OpenAI

---

## Performance Issues

### 3D Scene Lagging

**Symptoms:** Low FPS, stuttering navigation.

**Solutions:**

1. **Reduce texture quality:**

   ```typescript
   // In ARViewer.tsx
   texture.minFilter = THREE.LinearFilter;
   texture.anisotropy = 1; // Lower quality
   ```

2. **Limit objects:**

   ```typescript
   const MAX_OBJECTS = 10;
   if (scene.objects.length >= MAX_OBJECTS) {
     alert("Maximum objects reached");
     return;
   }
   ```

3. **Add LOD (Level of Detail):**

   ```typescript
   import { LOD } from "three";
   // Implement distance-based quality reduction
   ```

4. **Monitor performance:**
   ```typescript
   // Add Stats.js
   import Stats from "three/examples/jsm/libs/stats.module";
   ```

### Large File Upload Failures

**Symptoms:** Upload times out or fails.

**Solutions:**

1. **Client-side compression:**

   ```typescript
   import imageCompression from "browser-image-compression";

   const compressedFile = await imageCompression(file, {
     maxSizeMB: 2,
     maxWidthOrHeight: 1920,
   });
   ```

2. **Increase timeout:**
   ```typescript
   // In api/upload/route.ts
   export const config = {
     api: {
       bodyParser: {
         sizeLimit: "10mb",
       },
       responseLimit: false,
     },
     maxDuration: 60, // seconds
   };
   ```

### Slow Convex Queries

**Symptoms:** Real-time updates delayed.

**Solutions:**

1. **Add indexes:**

   ```typescript
   // In convex/schema.ts
   .index("by_userId_status", ["userId", "status"])
   ```

2. **Optimize queries:**
   ```typescript
   // Only fetch what you need
   const scene = await ctx.db
     .query("scenes")
     .withIndex("by_userId", (q) => q.eq("userId", userId))
     .first();
   ```

---

## Deployment Issues

### Vercel Build Fails

**Common Errors:**

1. **"Module not found"**

   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **"Environment variable not found"**
   - Add all variables in Vercel dashboard
   - Redeploy after adding variables

3. **"Build exceeded time limit"**
   - Upgrade Vercel plan
   - Or optimize build:
     ```typescript
     // next.config.ts
     experimental: {
       optimizePackageImports: ['@react-three/fiber', '@react-three/drei'],
     }
     ```

### Convex Production Deploy Fails

**Solution:**

```bash
# Re-authenticate
npx convex logout
npx convex login

# Deploy with explicit project
npx convex deploy --project your-project-name --prod
```

### Images Not Loading in Production

**Symptoms:** Images show broken link icon.

**Solutions:**

1. **Check Supabase URLs:**
   - Ensure using HTTPS URLs
   - Verify buckets are public
   - Test URLs directly in browser

2. **Update Next.js config:**
   ```typescript
   // next.config.ts
   images: {
     remotePatterns: [
       {
         protocol: 'https',
         hostname: '**.supabase.co',
       },
     ],
   }
   ```

---

## Browser Issues

### WebGL Not Available

**Symptoms:** Black screen, "WebGL not supported" error.

**Solutions:**

1. **Enable WebGL:**
   - Chrome: chrome://flags → Enable WebGL
   - Firefox: about:config → webgl.disabled = false

2. **Update graphics drivers**

3. **Try different browser:**
   - Chrome/Edge (best support)
   - Firefox (good support)
   - Safari (limited support)

4. **Fallback message:**
   ```typescript
   // In ARViewer.tsx
   if (!WebGLRenderingContext) {
     return <div>WebGL is required for AR experience</div>;
   }
   ```

### CORS Errors

**Symptoms:** "Cross-origin request blocked" in console.

**Solutions:**

1. **Update Supabase CORS:**
   - Dashboard → API settings
   - Add your domain to allowed origins

2. **Use proxy for external APIs:**
   ```typescript
   // Route through your API instead of direct calls
   const response = await fetch("/api/proxy/external-service", {
     method: "POST",
     body: JSON.stringify(data),
   });
   ```

### Audio Won't Autoplay

**Cause:** Browser autoplay policies.

**Solution:**

```typescript
// In ARViewer.tsx AudioPlayer
const [userInteracted, setUserInteracted] = useState(false);

// Require user interaction
<button onClick={() => {
  setUserInteracted(true);
  audioRef.current?.play();
}}>
  Start Experience
</button>
```

---

## Debug Tools

### Enable Verbose Logging

```typescript
// In lib/workflows/createScene.ts
const DEBUG = process.env.NODE_ENV === "development";

if (DEBUG) {
  console.log("Scene creation step 1:", { photoUrl, sceneId });
  console.log("Gemini analysis:", analysis);
  console.log("Environment generated:", environmentUrl);
}
```

### Convex Dashboard

Access at: https://dashboard.convex.dev

**Useful tabs:**

- Logs: See function calls and errors
- Data: Browse database
- Functions: Test mutations/queries
- Deployments: View deploy history

### Browser DevTools

**Essential panels:**

1. **Console:** Check for errors
2. **Network:** Monitor API calls
3. **Application:** Check localStorage/cookies
4. **Performance:** Profile rendering
5. **Sources:** Debug with breakpoints

### Test API Endpoints

```bash
# Test upload
curl -X POST http://localhost:3000/api/upload \
  -F "photo=@test-image.jpg"

# Test scene creation
curl -X POST http://localhost:3000/api/workflows/create-scene \
  -H "Content-Type: application/json" \
  -d '{"sceneId":"xxx","photoUrl":"https://..."}'
```

---

## Getting Help

### Check These First

1. Browser console errors
2. Convex dashboard logs
3. API service status pages
4. Environment variables set correctly

### Helpful Commands

```bash
# Check Node version
node --version  # Should be 18+

# Check npm version
npm --version

# Verify environment variables
cat .env.local

# Check running processes
ps aux | grep node

# View Convex logs
npx convex logs

# Build and check for errors
npm run build
```

### Contact & Resources

- **Convex:** https://discord.gg/convex
- **Supabase:** https://discord.supabase.com
- **fal.ai:** support@fal.ai
- **Google AI:** https://ai.google.dev/support

---

## Quick Fixes Summary

| Issue             | Quick Fix                          |
| ----------------- | ---------------------------------- |
| Convex errors     | Run `npx convex dev`               |
| Image not loading | Check Supabase bucket permissions  |
| Build fails       | Clear `.next` and rebuild          |
| API key error     | Verify in `.env.local` and restart |
| 3D scene black    | Check WebGL support                |
| Upload fails      | Reduce image size                  |
| Slow generation   | Check API credits/limits           |
| CORS error        | Update Supabase settings           |

---

**Still stuck?** Check BUILD_SUMMARY.md for architecture overview or README.md for complete documentation.
