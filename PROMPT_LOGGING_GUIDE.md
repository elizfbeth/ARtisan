# Prompt Logging Guide - See What's Sent to fal.ai 🔍

This guide explains how to view the exact prompts being sent to fal.ai for generating 360° environments.

---

## What Was Added

I've added comprehensive logging to help you debug and understand exactly what prompts are being generated and sent to fal.ai.

### Two Logging Sections:

1. **Ultra-Detailed Prompt Generation** (in enhanced workflow)
2. **fal.ai Full Prompt** (before API call)

---

## Example Console Output

When you upload a photo, you'll now see detailed logging like this:

### 1. Enhanced Environment Prompt Generated

```bash
================================================================================
📋 ENHANCED ENVIRONMENT PROMPT GENERATED
================================================================================

📊 Prompt Statistics:
   - Total Characters: 4523
   - Total Words: ~847
   - Has Landmark Data: true
   - Has Location Data: true
   - Has Satellite Analysis: true
   - Has Street View Analysis: true

--------------------------------------------------------------------------------
FULL ULTRA-DETAILED PROMPT:
--------------------------------------------------------------------------------
LANDMARK RECREATION - MARINA BAY SANDS: Create a highly detailed 360°
photorealistic environment of Marina Bay Sands, located in Singapore.
THIS MUST BE INSTANTLY RECOGNIZABLE AS MARINA BAY SANDS. The iconic
integrated resort features three 55-story hotel towers (200m tall)
connected by a massive 340m-long SkyPark rooftop structure resembling
a surfboard. The towers have a distinctive curved architectural form
with sweeping glass curtain walls...

[... 500+ more words of ultra-detailed analysis ...]

TECHNICAL SPECIFICATIONS: Generate as immersive 360-degree equirectangular
panorama of MARINA BAY SANDS suitable for AR/VR memory recreation. The
environment MUST be instantly recognizable as Marina Bay Sands with all
signature architectural features prominently displayed. Ultra-high detail
photorealistic rendering with 4K+ resolution quality...
--------------------------------------------------------------------------------
================================================================================
```

### 2. fal.ai Full Prompt

```bash
================================================================================
🎨 FAL.AI ENVIRONMENT GENERATION - FULL PROMPT
================================================================================

📝 Base Prompt Length: 4523 characters
📝 Full Prompt Length: 4593 characters

--------------------------------------------------------------------------------
FULL PROMPT SENT TO FAL.AI:
--------------------------------------------------------------------------------
360 degree panoramic environment: LANDMARK RECREATION - MARINA BAY SANDS:
Create a highly detailed 360° photorealistic environment of Marina Bay Sands,
located in Singapore. THIS MUST BE INSTANTLY RECOGNIZABLE AS MARINA BAY SANDS...

[... full prompt with fal.ai wrapper ...]

...TECHNICAL SPECIFICATIONS: Generate as immersive 360-degree equirectangular
panorama of MARINA BAY SANDS suitable for AR/VR memory recreation. The
environment MUST be instantly recognizable as Marina Bay Sands with all
signature architectural features prominently displayed. Seamless, immersive,
high detail, photorealistic
--------------------------------------------------------------------------------

⚙️  FAL.AI SETTINGS:
   - Model: fal-ai/flux/dev
   - Image Size: landscape_16_9
   - Inference Steps: 28
   - Guidance Scale: 3.5
================================================================================

✅ Environment generated successfully: https://fal.media/files/...
```

---

## Files Modified

### 1. [src/lib/workflows/enhancedSceneCreation.ts](src/lib/workflows/enhancedSceneCreation.ts)

**Lines 268-287**: Added logging AFTER prompt generation, BEFORE fal.ai call

Shows:
- Prompt statistics (character count, word count)
- Data availability flags (landmark, location, satellite, Street View)
- **Full ultra-detailed prompt** exactly as generated

### 2. [src/lib/ai-clients.ts](src/lib/ai-clients.ts)

**Lines 314-336**: Added logging inside `generateEnvironmentWithFal()` function

Shows:
- Base prompt length vs full prompt length
- **Exact prompt sent to fal.ai** (with "360 degree panoramic environment" wrapper)
- fal.ai model settings (image size, inference steps, guidance scale)
- Generated image URL

---

## How to Use

### Step 1: Start Dev Server

```bash
npm run dev
```

### Step 2: Upload a Photo

Upload any photo (preferably GPS-tagged for best results)

### Step 3: Check Server Console

Look for the two logging sections in your terminal:

1. **📋 ENHANCED ENVIRONMENT PROMPT GENERATED** - Shows the prompt created from analysis
2. **🎨 FAL.AI ENVIRONMENT GENERATION - FULL PROMPT** - Shows what's sent to fal.ai

### Step 4: Copy and Analyze

You can copy the full prompt from the console to:
- Debug why certain features aren't appearing
- Verify landmark names are emphasized
- Check if satellite/Street View data is included
- Understand how the analysis translates to the prompt

---

## What You Can Debug

### Landmark Recognition Issues

**Look for**:
```
LANDMARK RECREATION - MARINA BAY SANDS: Create a highly detailed 360°
photorealistic environment of Marina Bay Sands...
THIS MUST BE INSTANTLY RECOGNIZABLE AS MARINA BAY SANDS.
```

**If missing**: The landmark wasn't detected or emphasized. Check:
- `Has Landmark Data: false` → JigsawStack/Exa lookup failed
- Analysis confidence too low (< 0.6)

### GPS/Location Issues

**Look for**:
```
EXACT LOCATION RECREATION: Photorealistic 3D world of 10 Bayfront Avenue,
Singapore 018956 at GPS coordinates 1.283611, 103.860833.
```

**If missing**: No GPS data in photo or reverse geocoding failed. Check:
- `Has Location Data: false` → No GPS in EXIF
- "Reverse geocoding failed" error earlier in logs

### Satellite/Street View Integration

**Look for**:
```
SATELLITE AERIAL VIEW DATA: The aerial imagery shows three iconic curved
hotel towers connected by a massive rooftop structure...

STREET VIEW 360° GROUND-LEVEL DATA: NORTH: Towering hotel facade with
glass curtain walls, 57 floors high...
```

**If missing**: Check:
- `Has Satellite Analysis: false` → Invalid Google Maps API key
- `Has Street View Analysis: false` → Street View not available at location

### Prompt Quality Issues

**Check**:
- **Character count**: Should be 3000-6000+ for enhanced workflow
- **Word count**: Should be 500-1000+ words
- **Sections present**: Location, Environment, Architecture, Lighting, etc.

---

## Interpreting the Prompt

### Good Prompt Example (Marina Bay Sands):

```
LANDMARK RECREATION - MARINA BAY SANDS: Create a highly detailed 360°
photorealistic environment of Marina Bay Sands, located in Singapore.
THIS MUST BE INSTANTLY RECOGNIZABLE AS MARINA BAY SANDS.

The iconic integrated resort features three 55-story hotel towers (200m tall)
connected by a massive 340m-long SkyPark rooftop structure resembling a
surfboard. The towers have a distinctive curved architectural form with
sweeping glass curtain walls reflecting the sky and harbor.

SATELLITE AERIAL VIEW DATA: The aerial imagery shows three iconic curved
hotel towers arranged in a distinctive triangular formation, each measuring
200m x 150m footprint. The rooftop SkyPark structure spans 340m connecting
all three towers...

STREET VIEW 360° GROUND-LEVEL DATA:
- NORTH: Towering hotel facade with glass curtain walls, 57 floors high
- EAST: Shoppes at Marina Bay Sands entrance, glass canopy
- SOUTH: Marina Bay waterfront, promenade, viewing platform
- WEST: ArtScience Museum lotus-shaped building

ENVIRONMENT: Urban waterfront luxury resort with sophisticated atmosphere.

ARCHITECTURE: Modern high-rise buildings with glass facades, contemporary
design. Three curved towers with continuous glass curtain walls, steel and
concrete structure...

[... continues for 500+ more words with detailed descriptions of lighting,
materials, vegetation, signage, reflections, etc. ...]

TECHNICAL SPECIFICATIONS: Generate as immersive 360-degree equirectangular
panorama of MARINA BAY SANDS suitable for AR/VR memory recreation. The
environment MUST be instantly recognizable as Marina Bay Sands with all
signature architectural features prominently displayed...
```

**Why this is good**:
✅ Landmark name appears 3 times (start, middle, end)
✅ Specific architectural details (three towers, SkyPark, 340m, curved)
✅ Satellite aerial view data included
✅ Street View directional data included
✅ Clear instruction: "MUST BE INSTANTLY RECOGNIZABLE"
✅ 500+ words of detailed descriptions

### Bad Prompt Example (Generic):

```
EXACT LOCATION RECREATION: Photorealistic 3D world of 10 Bayfront Avenue.

ENVIRONMENT: Urban with sophisticated atmosphere.

ARCHITECTURE: Modern buildings with glass facades.

LIGHTING: Bright daylight with shadows.

[... 50 words of generic descriptions ...]

TECHNICAL SPECIFICATIONS: Generate as immersive 360-degree equirectangular
panorama suitable for AR/VR memory recreation...
```

**Why this is bad**:
❌ No landmark name
❌ Generic descriptions ("modern buildings")
❌ No satellite or Street View data
❌ Only ~50 words
❌ No specific architectural details

---

## Troubleshooting

### Issue: Prompt is too short (< 500 words)

**Possible causes**:
1. Using basic workflow instead of enhanced workflow
2. Photo analysis incomplete
3. No GPS data (missing satellite/Street View sections)

**Check**:
```bash
# Should be using enhanced workflow
grep "create-scene-enhanced" src/app/api/upload/route.ts
```

### Issue: Landmark name not in prompt

**Possible causes**:
1. Landmark confidence too low (< 0.6)
2. JigsawStack API not working
3. Exa API not working

**Check console for**:
```bash
Landmark detected: Marina Bay Sands (confidence: 0.95)
Gathering fresh landmark data...
```

### Issue: No satellite/Street View data

**Possible causes**:
1. Invalid Google Maps API key
2. Photo has no GPS data
3. Street View not available at location

**Check console for**:
```bash
Step 2b: Fetching Google Maps satellite and Street View imagery...
Reference images available: Satellite=true, Street View=true
```

---

## Customizing the Logging

If you want to modify the logging format or add more details:

### Option 1: Add More Statistics

Edit [src/lib/workflows/enhancedSceneCreation.ts](src/lib/workflows/enhancedSceneCreation.ts:274-280):

```typescript
console.log(`   - Total Characters: ${environmentPrompt.length}`);
console.log(`   - Total Words: ~${Math.round(environmentPrompt.split(" ").length)}`);
console.log(`   - Has Landmark Data: ${!!landmarkData}`);
console.log(`   - Landmark Name: ${landmarkData?.name || "N/A"}`);  // ADD THIS
console.log(`   - Has Location Data: ${!!locationData}`);
console.log(`   - GPS Coordinates: ${locationData?.coordinates ?
    `${locationData.coordinates.latitude}, ${locationData.coordinates.longitude}` : "N/A"}`);  // ADD THIS
```

### Option 2: Save Prompt to File

Add file writing (useful for debugging):

```typescript
import fs from "fs";

// After generating prompt
fs.writeFileSync(
  `./logs/prompt_${Date.now()}.txt`,
  environmentPrompt,
  "utf-8"
);
console.log("✅ Prompt saved to logs/");
```

### Option 3: Reduce Logging Verbosity

If the logs are too long, you can show just a preview:

```typescript
// Show first 500 characters only
console.log(environmentPrompt.substring(0, 500) + "...");
console.log(`[Full prompt: ${environmentPrompt.length} characters]`);
```

---

## Next Steps

### 1. Test with Your Photos

Upload different types of photos to see how the prompts differ:
- Landmark photos (Eiffel Tower, Statue of Liberty, Marina Bay Sands)
- GPS-tagged photos vs non-GPS photos
- Indoor vs outdoor scenes
- Urban vs natural environments

### 2. Compare Prompts to Results

Look at the generated 360° environment and compare it to the prompt:
- Did fal.ai follow the landmark emphasis?
- Are specific architectural details present?
- Does it match the satellite/Street View data?

### 3. Iterate and Improve

If the results don't match the prompt:
- Check if the prompt is specific enough
- Verify landmark name appears multiple times
- Ensure satellite/Street View data is included
- Consider adjusting the prompt template in `createEnhancedEnvironmentPrompt()`

---

## Summary

You now have **comprehensive prompt logging** that shows:

✅ **What prompt is generated** from the photo analysis
✅ **What data sources are included** (landmark, GPS, satellite, Street View)
✅ **Exact prompt sent to fal.ai** with all wrappers and settings
✅ **Prompt statistics** (length, word count, data availability)

This makes debugging much easier and helps you understand exactly how your photos are being translated into 360° environments!

**Next time you upload a photo, check the server console to see the full prompts in action.** 🎨
