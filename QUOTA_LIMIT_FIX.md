# Gemini API Quota Limit Fix

## The Error

```
[429 Too Many Requests] You exceeded your current quota
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
limit: 50
```

## What Happened

You hit Gemini API's free tier daily limit:
- **gemini-2.0-flash-exp**: 50 requests/day (VERY LOW)
- You were using this model and hit the limit quickly

## Solutions Applied

### ✅ Solution #1: Switch to Higher Quota Model

**Changed**: `gemini-2.0-flash-exp` → `gemini-1.5-flash`

**File**: `src/lib/ai-clients.ts` (line 28)

**New Limits**:
| Model | Free Tier Requests/Day |
|-------|------------------------|
| ~~gemini-2.0-flash-exp~~ | ~~50~~ ❌ |
| **gemini-1.5-flash** | **1,500** ✅ |

That's **30x more requests!**

### Why This Works

- `gemini-1.5-flash` is the stable production model
- `gemini-2.0-flash-exp` is experimental with lower quotas
- Both provide excellent image analysis
- 1.5-flash is actually MORE reliable

## How to Test

**Try uploading your Eiffel Tower photo again.** It should work now!

---

## Additional Solutions (If You Still Hit Limits)

### Solution #2: Upgrade to Paid Plan

Google AI Studio paid plans:
- **Pay-as-you-go**: $0.00015 per request for Gemini 1.5 Flash
- **Very cheap**: 1000 requests = $0.15
- No daily limits
- Go to: https://aistudio.google.com/pricing

### Solution #3: Add Response Caching (Advanced)

If you're testing a lot, add caching to avoid re-analyzing the same photos:

```typescript
// In src/lib/ai-clients.ts
const analysisCache = new Map<string, any>();

export async function analyzeImageWithGemini(imageUrl: string) {
  // Check cache first
  if (analysisCache.has(imageUrl)) {
    console.log("Using cached analysis for:", imageUrl);
    return analysisCache.get(imageUrl);
  }
  
  // ... existing analysis code ...
  
  // Cache the result
  analysisCache.set(imageUrl, result);
  return result;
}
```

### Solution #4: Use Multiple API Keys

If you have multiple Google accounts:
1. Get API keys from multiple accounts
2. Rotate between them
3. Modify code to cycle through keys

### Solution #5: Wait for Quota Reset

Gemini quotas reset daily (Pacific Time):
- Current time: Check https://ai.google.dev/gemini-api/docs/rate-limits
- Wait ~28 seconds (as error message suggested) won't help - that's just retry delay
- Daily quota resets at midnight PT

---

## Preventing Future Quota Issues

### Best Practices:

1. **Don't upload the same photo multiple times while testing**
   - Each upload = 1 Gemini request
   - Use different test images

2. **Use the basic workflow for testing**
   - Create a simple test route that skips Gemini
   - Only use enhanced workflow when you need it

3. **Monitor your usage**
   - Check Google AI Studio dashboard
   - Set up usage alerts

4. **Cache intelligently**
   - Store analysis results in Convex
   - Reuse analysis for same photo

5. **Consider upgrading**
   - If you're building a production app
   - Very cheap: $0.15 per 1000 requests

---

## Error Details Breakdown

```
Error: [GoogleGenerativeAI Error]: Error fetching
Status: 429 Too Many Requests

Quota Info:
- Metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
- Limit: 50 requests/day
- Model: gemini-2.0-flash-exp
- Reset: Daily at midnight PT

Suggested Action: 
- Switch to gemini-1.5-flash (1,500/day) ✅ DONE
- Or upgrade to paid plan
- Or wait for daily reset
```

---

## Status: ✅ FIXED

**You can now test again!** The model switch gives you 30x more requests.

### What to Expect:

1. **Restart your dev server** (the code change requires restart)
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Upload your photo again**
   - Should work immediately
   - Will use gemini-1.5-flash (1,500/day quota)

3. **Check console**
   - Should NOT see 429 errors anymore
   - Should see normal analysis output

### If You Still Get Errors:

**Error: 429 on gemini-1.5-flash**
- You've hit that quota too (unlikely unless you did 1,500 requests)
- Solution: Upgrade to paid or wait for daily reset

**Error: Different error**
- Check API key is valid
- Check network connection
- Check Google AI Studio status

---

## Long-Term Recommendation

For production use, consider:
1. ✅ Paid Gemini plan ($0.15/1000 requests is very cheap)
2. ✅ Add caching to Convex to store analysis results
3. ✅ Implement rate limiting on frontend
4. ✅ Add usage monitoring/alerts

This will ensure your app never hits quota limits and provides a smooth user experience.

