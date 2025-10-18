# Street View Navigation & Location Intelligence

## Overview
ARtisan now features Google Maps Street View-style navigation with AI-powered location intelligence using Exa AI.

## New Features

### 1. Street View Navigation
- **360° Panoramic View**: Immersive equirectangular panoramas
- **Mouse Drag Navigation**: Drag to look around like Google Street View
- **Click-to-Move Waypoints**: Blue circular markers for navigation
- **Smooth Transitions**: Animated movement between locations
- **Location Info Panel**: Display contextual information

### 2. Location Intelligence (Exa AI)
- **Automatic Detection**: Gemini AI identifies locations in images
- **Web Search**: Exa AI gathers location-specific information
- **Rich Context**: Descriptions, facts, atmosphere, history
- **Enhanced Generation**: Location data improves panorama quality

### 3. Enhanced Image Analysis
Gemini now extracts:
- `hasLocation`: Boolean for detection
- `locationName`: Name of place/landmark
- `locationType`: Category
- `locationKeywords`: Search terms for Exa AI

## How It Works

1. Photo Upload → Gemini Analysis → Location Detection
2. Exa AI Search → Context Gathering
3. Enhanced Panorama Generation with Location Data
4. Street View Navigation or Standard WASD Mode

## API Keys Required

Add to `.env.local`:
```bash
EXA_API_KEY=your_key_here
```

Get from: https://exa.ai/

## Controls

**Street View Mode:**
- Drag Mouse - Look around 360°
- Click Blue Circles - Move to waypoint
- ℹ️ Button - Toggle location info

**Standard Mode:**
- WASD - Move
- Mouse - Look around
- ESC - Exit

## Technology Stack

- **Gemini 2.5 Flash** - Image analysis
- **Exa AI** - Web search
- **Groq LLM** - Context synthesis
- **fal.ai FLUX** - Panorama generation
- **React Three Fiber** - 3D rendering
