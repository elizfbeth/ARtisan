# Audio Button Fix - Summary

## Problem

The play scene audio button was not showing in the AR viewer.

## Root Cause

1. The audio player button in `ARViewer.tsx` was only rendering when `audioUrl` existed
2. Audio generation was failing silently in the background
3. Missing `NEXT_PUBLIC_APP_URL` environment variable prevented the audio generation workflow from completing

## Changes Made

### 1. ARViewer Component (`src/components/ARViewer.tsx`)

- **Changed**: Audio player now always renders, regardless of whether audio exists
- **Added**: Multiple visual states:
  - Disabled/muted icon when no audio available
  - Loading spinner while audio is loading
  - Play/pause icons when audio is ready
- **Improved**: Better user feedback with tooltips showing current state
- **Fixed**: Button properly shows disabled state when audio is not available

### 2. Main Page Component (`src/app/page.tsx`)

- **Added**: `isGeneratingAudio` state to track audio generation progress
- **Improved**: "Regenerate Scene Audio" button now shows:
  - "Generate Scene Audio" when no audio exists
  - "Regenerate Scene Audio" when audio already exists
  - Loading state with spinner while generating
  - Success indicator when audio is available
- **Added**: Better error handling with user-friendly alerts

### 3. Environment Setup (`ENV_SETUP.md`)

- **Added**: `NEXT_PUBLIC_APP_URL` to environment variables
- This is required for Convex actions to call back to Next.js API routes

## How to Fix

### Step 1: Add Missing Environment Variable

Add this to your `.env.local` file:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set it to your actual deployment URL:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 2: Restart Development Server

After adding the environment variable:

```bash
# Stop the current dev server (Ctrl+C)
# Restart it
npm run dev
```

### Step 3: Test Audio Generation

1. Upload a new photo to create a scene
2. Once the scene loads, you should see:
   - Audio button in bottom-right corner of AR viewer
   - If audio was generated automatically, button will be enabled (black)
   - If no audio, button will be disabled (gray)
3. Click the "Generate Scene Audio" button in the sidebar to manually trigger audio generation
4. Wait for generation to complete (button will show loading state)
5. Once complete, the audio button in AR viewer will become enabled

## Current Audio Button States

### In AR Viewer (Bottom-Right)

- **Gray/Disabled**: No audio available yet
- **Loading Spinner**: Audio is being loaded
- **Black/Play**: Audio ready, click to play
- **Black/Pause**: Audio playing, click to pause

### In Sidebar Actions Panel

- **Purple "Generate Scene Audio"**: No audio exists, click to create
- **Gray with spinner**: Audio is being generated
- **Purple "Regenerate Scene Audio"**: Audio exists, click to create new version
- **Green checkmark**: Shows when audio is available

## Troubleshooting

### ElevenLabs "Bad Request" Error?

The app uses **two audio generation methods** with automatic fallback:

**Method 1: Sound Effects API** (Primary)

- Generates realistic ambient soundscapes with actual sound effects
- Requires **ElevenLabs paid subscription** with Sound Effects feature enabled
- If you see "Bad Request" or "Bad gateway" errors, this feature isn't available on your account

**Method 2: Text-to-Speech API** (Automatic Fallback)

- Generates a calm voice narration describing the scene's soundscape
- Works with **free/basic ElevenLabs accounts**
- Automatically used if Sound Effects API fails
- You'll hear something like "You are standing in a calm beach scene..."

**What to do:**

✅ **Current Setup (Recommended)**: The code now automatically tries Sound Effects first, then falls back to TTS. Just click "Generate Scene Audio" and let it work!

💰 **For Real Sound Effects**: Upgrade your ElevenLabs account at [elevenlabs.io/pricing](https://elevenlabs.io/pricing) to enable the Sound Effects API

🔇 **To Disable Audio**: Remove/comment lines 68-75 in `src/app/api/workflows/create-scene/route.ts`

### Audio Generation Still Failing?

Check the terminal/console for errors related to:

- ElevenLabs API key (required for audio generation)
- Groq API key (required for sound prompt generation)
- Network connectivity
- API rate limits or quota exceeded

### Button Shows But Audio Won't Play?

- Check browser console for audio playback errors
- Ensure browser allows audio autoplay (click the button after interacting with the page)
- Verify the audio URL is accessible (check Network tab in DevTools)
- Try clicking play after the page has fully loaded

## Technical Details

### Audio Generation Workflow

1. Scene is created from uploaded photo
2. After environment generation, audio generation is automatically triggered
3. Groq generates a sound prompt based on scene analysis
4. ElevenLabs creates the audio:
   - **First attempt**: Sound Effects API (if subscription supports it)
   - **Fallback**: Text-to-Speech API narration
5. Audio is uploaded to Supabase storage
6. Scene is updated with audio URL via Convex real-time sync
7. UI automatically updates when audio becomes available

**Note**: The fallback mechanism ensures audio generation always succeeds, even with a free ElevenLabs account. You'll just get narration instead of sound effects.

### Why the Button Is Always Visible Now

Previously, the button was hidden when no audio existed, making it unclear if:

- Audio generation failed
- Audio wasn't implemented
- Audio was still generating

Now, the button is always visible with clear visual states, providing better user feedback and making it obvious when audio is available or needs to be generated.
