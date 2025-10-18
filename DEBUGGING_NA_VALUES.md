# Debugging "N/A" Scene Info Values

## Problem

After uploading a photo, the Scene Info panel shows:
```
Environment: N/A
Mood: N/A
Objects: 0
```

This means the `analysis` data is not being populated correctly.

---

## Debugging Steps

### Step 1: Check Browser Console

Open your browser's Developer Tools (F12) and look for these logs when you upload a photo:

#### Expected Logs:

**Frontend (Browser Console):**
```javascript
Upload result: { success: true, sceneId: "temp_...", scene: {...} }
Scene data received: { _id: "temp_...", status: "ready", analysis: {...}, ... }
Analysis data: { environmentType: "...", mood: "...", keyObjects: [...] }
```

**Backend (Terminal/Server Console):**
```
Analysis data: {
  "environmentType": "urban street corner",
  "keyObjects": ["buildings", "cars", "trees"],
  "mood": "vibrant",
  "colorPalette": ["#FF5733", "#3498DB"],
  ...
}
```

### Step 2: Identify the Issue

Based on what you see in the console:

#### Case A: `analysis` is `null` or `undefined`
```javascript
Analysis data: null
// or
Analysis data: undefined
```

**Cause**: Gemini API call failed or returned invalid JSON

**Solution**: Check Gemini API logs for errors

#### Case B: `analysis` has wrong structure
```javascript
Analysis data: {
  "environment_type": "urban",  // ❌ Wrong key (should be environmentType)
  "key_objects": [...],          // ❌ Wrong key (should be keyObjects)
}
```

**Cause**: Gemini returned data in a different format than expected

**Solution**: Update Gemini prompt or add field mapping

#### Case C: `result.scene` is missing in upload response
```javascript
Upload result: { success: true, sceneId: "temp_123" }
// Missing: scene: {...}
```

**Cause**: Upload endpoint didn't wait for workflow or workflow failed

**Solution**: Check server logs for workflow errors

---

## Common Causes & Fixes

### 1. Gemini API Not Returning Analysis

**Symptoms**:
- Console shows: `Analysis data: null`
- Server logs show Gemini errors

**Check**:
```bash
# Look for these in server console:
"Gemini image analysis failed"
"Failed to parse Gemini response as JSON"
"[GoogleGenerativeAI Error]: ..."
```

**Fix**:
- Verify `GOOGLE_GEMINI_API_KEY` environment variable is set
- Check Gemini API quota/billing
- Review Gemini prompt in [src/lib/ai-clients.ts](src/lib/ai-clients.ts:40-87)

### 2. Gemini Returning Wrong Format

**Symptoms**:
- Console shows analysis with unexpected keys
- Data exists but fields are `undefined`

**Example**:
```javascript
// Gemini returned this:
{
  "env_type": "urban",      // ❌ Should be "environmentType"
  "objects": ["car"],       // ❌ Should be "keyObjects"
}

// Code expects this:
{
  "environmentType": "urban",  // ✅
  "keyObjects": ["car"],       // ✅
}
```

**Fix**: Update [src/lib/ai-clients.ts](src/lib/ai-clients.ts) to parse correctly:

```typescript
// Option 1: Fix the Gemini prompt to use correct field names
const prompt = `Analyze this image. Return ONLY valid JSON with these exact field names:
{
  "environmentType": "...",  // Not env_type or environment_type
  "keyObjects": [...],       // Not objects or key_objects
  "mood": "...",
  ...
}`;

// Option 2: Add field mapping after parsing
const rawAnalysis = JSON.parse(jsonMatch[0]);
const analysis = {
  environmentType: rawAnalysis.environmentType || rawAnalysis.env_type || rawAnalysis.environment_type,
  keyObjects: rawAnalysis.keyObjects || rawAnalysis.key_objects || rawAnalysis.objects,
  mood: rawAnalysis.mood,
  // ... map other fields
};
return analysis;
```

### 3. Workflow Not Waiting for Completion

**Symptoms**:
- Upload response doesn't include `scene` field
- Frontend receives only `{ sceneId: "temp_..." }` without scene data

**Check**:
```bash
# Server console should show:
"Using temp ID - waiting for workflow to complete..."
"Workflow completed successfully"

# If you see instead:
"Scene generation workflow triggered"  # ❌ Means it didn't wait
```

**Fix**: Verify [src/app/api/upload/route.ts:127-152](src/app/api/upload/route.ts:127-152)

```typescript
// Should be using await:
if (sceneId.startsWith("temp_")) {
  const workflowResponse = await fetch(...);  // ✅ await is critical
  const workflowResult = await workflowResponse.json();
  return NextResponse.json({
    success: true,
    sceneId,
    scene: workflowResult.scene,  // ✅ Must include scene data
  });
}
```

### 4. Frontend Not Storing Fallback Data

**Symptoms**:
- Server logs show correct analysis data
- Browser console shows `Upload result` has scene data
- But UI still shows "N/A"

**Check**:
```javascript
// Browser console should show:
"Scene data received:" { analysis: { environmentType: "...", ... } }

// If analysis is there but UI shows N/A, check:
console.log("Current scene state:", scene);
console.log("Fallback data:", fallbackSceneData);
console.log("Convex scene:", convexScene);
```

**Fix**: Ensure state is being set correctly in [src/app/page.tsx:125-129](src/app/page.tsx:125-129)

```typescript
if (result.scene) {
  console.log("Setting fallback scene data");
  setFallbackSceneData(result.scene);  // ✅ Should trigger re-render
}

// Verify scene is using fallback:
const scene = (convexScene || fallbackSceneData) as SceneData | null | undefined;
```

---

## Testing Checklist

After making changes, verify:

### ✅ Upload a photo and check:

1. **Server Console**:
   ```
   ✓ Step 1: Analyzing photo with Gemini...
   ✓ Analysis complete: { environmentType: "...", ... }
   ✓ Step 2: Generating environment with fal.ai...
   ✓ Step 3: Uploading to Supabase...
   ✓ Analysis data: { "environmentType": "...", "mood": "...", ... }
   ```

2. **Browser Console**:
   ```javascript
   ✓ Upload result: { success: true, sceneId: "temp_...", scene: {...} }
   ✓ Scene data received: { analysis: {...}, environmentTextureUrl: "...", ... }
   ✓ Analysis data: { environmentType: "...", mood: "...", keyObjects: [...] }
   ```

3. **UI**:
   ```
   ✓ Environment: urban street corner  (not "N/A")
   ✓ Mood: vibrant                     (not "N/A")
   ✓ Objects: 0                        (correct - no objects added yet)
   ```

---

## Quick Fixes

### If analysis is always `null`:

```typescript
// In src/lib/ai-clients.ts, add fallback:
export async function analyzeImageWithGemini(imageUrl: string) {
  try {
    // ... existing code ...
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Gemini analysis failed:", error);

    // Return fallback instead of throwing
    return {
      environmentType: "Generic environment",
      keyObjects: ["unidentified objects"],
      depthPerspective: "Unable to analyze depth",
      colorPalette: ["#808080"],
      mood: "neutral",
      isLandmark: false,
      landmarkName: null,
      location: null,
      landmarkConfidence: 0,
    };
  }
}
```

### If Convex query is interfering:

```typescript
// In src/app/page.tsx, prioritize fallback data:
const scene = fallbackSceneData || convexScene;  // Fallback first!
```

### If temp ID detection is broken:

```typescript
// In src/app/page.tsx, add logging:
console.log("Current scene ID:", currentSceneId);
console.log("Is temp ID?", isTempSceneId);
console.log("Will query Convex?", currentSceneId && !isTempSceneId);
```

---

## Environment Variables to Check

Make sure these are set in `.env.local`:

```bash
# Required for AI analysis
GOOGLE_GEMINI_API_KEY=your_key_here

# Required for image generation
FAL_KEY=your_key_here

# Required for storage
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_key_here

# Required for database
NEXT_PUBLIC_CONVEX_URL=your_url_here

# Optional for GPS features
GOOGLE_MAPS_API_KEY=your_key_here
```

**Test**: Restart Next.js dev server after changing `.env.local`:
```bash
# Stop server (Ctrl+C)
npm run dev  # Restart
```

---

## Still Seeing "N/A"?

### Last Resort Debugging:

Add this to [src/app/page.tsx](src/app/page.tsx) right after line 59:

```typescript
const scene = (convexScene || fallbackSceneData) as SceneData | null | undefined;

// DEBUG: Log everything
console.log("=== SCENE DEBUG ===");
console.log("convexScene:", convexScene);
console.log("fallbackSceneData:", fallbackSceneData);
console.log("final scene:", scene);
console.log("scene?.analysis:", scene?.analysis);
console.log("scene?.analysis?.environmentType:", scene?.analysis?.environmentType);
console.log("==================");
```

Then upload a photo and check the console. Share the output and I can help diagnose further!

---

## Summary

The "N/A" values mean `scene.analysis` is `null`, `undefined`, or missing required fields.

**Most likely cause**: Gemini API call failed or returned unexpected format

**Fix priority**:
1. Check server logs for Gemini errors
2. Verify `GOOGLE_GEMINI_API_KEY` is set
3. Add fallback values in workflow response
4. Check browser console for actual data received
5. Verify `setFallbackSceneData()` is being called

Once you see the console logs, you'll know exactly where the data is getting lost! 🔍
