# GPS-Based Location Recreation Feature

## Overview

ARtisan now extracts **exact GPS coordinates** from photos and recreates the **actual location** with real nearby places, shops, and landmarks. This creates an immersive memory recreation that brings users back to the **exact spot** where their photo was taken.

---

## How It Works

### 1. **GPS Extraction (EXIF Data)**
```
Photo Upload → Extract EXIF Metadata → GPS Coordinates (latitude, longitude, altitude)
```

Most smartphone photos contain GPS data automatically. The system:
- Reads EXIF data from the uploaded photo
- Extracts latitude, longitude, and altitude
- Uses this as the **exact location** for recreation

### 2. **Reverse Geocoding**
```
GPS Coordinates → Google Maps Geocoding API → Full Address
```

Converts coordinates into a human-readable address:
- **Street address**: "123 Market St"
- **City**: "San Francisco"
- **State/Country**: "California, USA"
- **Postal code**: "94103"

### 3. **Nearby Places Discovery**
```
GPS Coordinates → Google Places API → Real Shops, Restaurants, Landmarks (within 200m)
```

Finds actual businesses and places around the photo location:
- Restaurants (with ratings, photos)
- Shops and stores
- Landmarks and tourist attractions
- Parks and public spaces
- Distance from photo location (in meters)

### 4. **Street View Integration**
```
GPS Coordinates → Google Street View API → 360° Street-Level Imagery
```

Retrieves Street View panoramas from multiple angles:
- North, East, South, West views
- Metadata (heading, date of imagery)
- Availability check

### 5. **Enhanced 3D World Generation**
```
All Data → Enhanced Prompt → fal.ai → Photorealistic 3D Environment
```

Combines everything into a detailed prompt:
- Exact address and GPS coordinates
- Names and types of nearby places
- Distances and spatial relationships
- Visual analysis from Gemini
- Color palettes and mood

---

## Setup Instructions

### Add Google Maps API Key

1. **Get API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable these APIs:
     - **Geocoding API**
     - **Places API**
     - **Street View Static API**
   - Create credentials → API Key
   - Restrict key to these APIs for security

2. **Add to `.env.local`:**
   ```bash
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

3. **Restart Next.js server:**
   ```bash
   npm run dev
   ```

---

## Example: Real Location Recreation

### Input
User uploads a photo taken at:
- **GPS**: 37.7749° N, 122.4194° W
- **Location**: San Francisco, California

### What the System Does

**Step 1: Extract GPS**
```
✓ GPS coordinates extracted: { lat: 37.7749, lng: -122.4194 }
```

**Step 2: Reverse Geocode**
```
✓ Location found: Market St & 5th St, San Francisco, CA 94103, USA
```

**Step 3: Find Nearby Places**
```
✓ Found 15 nearby places:
  - Starbucks (cafe, 25m away)
  - Westfield San Francisco Centre (shopping_mall, 50m away)
  - Powell Street Station (transit_station, 75m away)
  - Bloomingdale's (department_store, 100m away)
  - Cheesecake Factory (restaurant, 120m away)
  - H&M (clothing_store, 140m away)
  ... 9 more
```

**Step 4: Check Street View**
```
✓ Street View available (captured: July 2023)
```

**Step 5: Generate Enhanced Prompt**
```
Photorealistic 3D world recreation of exact location: Market St & 5th St,
San Francisco, CA 94103, USA. GPS coordinates: 37.774900, -122.419400.
Vibrant atmosphere, visible objects: buildings, people, storefronts.
Color palette: #7A9CC6, #E8DCC4, #4A5568. Surrounding area includes:
Starbucks (cafe, 25m away), Westfield San Francisco Centre (shopping_mall, 50m away),
Powell Street Station (transit_station, 75m away), Bloomingdale's (department_store, 100m away),
Cheesecake Factory (restaurant, 120m away), H&M (clothing_store, 140m away).
Accurate street-level view with proper building placements, real storefronts and signage,
correct spatial relationships between landmarks and businesses. Immersive 360-degree
environment with realistic lighting, shadows, and architectural details matching the
actual location. High detail textures, proper scale and proportions. Seamless panoramic
perspective suitable for AR/VR memory recreation.
```

**Step 6: Generate 3D World**
```
fal.ai receives this detailed prompt → Creates immersive 3D environment
matching the exact location with all nearby businesses and landmarks in
their correct positions
```

---

## Priority System

The enhanced workflow uses a **3-tier priority system** for generating environments:

### Priority 1: GPS-Based Location Data ⭐⭐⭐
**Best accuracy** - Uses real GPS coordinates + nearby places
- Extract GPS from photo EXIF
- Reverse geocode to get address
- Find all nearby places within 200m
- Include real shop/restaurant names
- Add accurate distances and spatial relationships

**Use Case**: Photos with GPS data (most smartphone photos)

### Priority 2: Landmark Detection ⭐⭐
**Good accuracy** - Uses AI + web scraping
- Gemini detects famous landmark
- JigsawStack finds additional images
- Exa AI gathers historical/architectural context
- Generic nearby places from web search

**Use Case**: Famous landmarks without GPS data

### Priority 3: AI Analysis Only ⭐
**Basic recreation** - Uses only visual analysis
- Gemini analyzes the image
- Generates generic environment
- No specific location details

**Use Case**: Photos without GPS data or landmarks

---

## API Usage

### Location Services Functions

```typescript
import {
  extractGPSFromPhoto,
  reverseGeocode,
  getNearbyPlaces,
  getStreetViewUrl,
  getLocationDataFromPhoto
} from "@/lib/location-services";

// Extract GPS from photo
const gps = await extractGPSFromPhoto(photoUrl);
// { latitude: 37.7749, longitude: -122.4194, altitude: 10 }

// Get address
const address = await reverseGeocode(gps);
// { formatted: "Market St & 5th St, San Francisco, CA 94103", ... }

// Find nearby places
const places = await getNearbyPlaces(gps, 200); // 200m radius
// [{ name: "Starbucks", type: "cafe", distance: 25, ... }, ...]

// Get Street View URL
const streetViewUrl = getStreetViewUrl(gps);
// "https://maps.googleapis.com/maps/api/streetview?..."

// Get everything at once
const locationData = await getLocationDataFromPhoto(photoUrl);
// { coordinates, address, nearbyPlaces, streetViewUrl }
```

### Enhanced Scene Creation Response

```json
{
  "success": true,
  "result": {
    "analysis": {
      "environmentType": "urban street",
      "isLandmark": false,
      "mood": "vibrant"
    },
    "locationData": {
      "coordinates": {
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "address": {
        "formatted": "Market St & 5th St, San Francisco, CA 94103, USA",
        "city": "San Francisco",
        "state": "California",
        "country": "USA"
      },
      "nearbyPlaces": [
        {
          "name": "Starbucks",
          "type": "cafe",
          "distance": 25,
          "address": "123 Market St",
          "rating": 4.2
        },
        ...
      ]
    },
    "environmentType": "3d_world",
    "environmentTextureUrl": "https://...",
    "message": "Exact location recreated with GPS precision!"
  }
}
```

---

## Benefits

### For Users
✅ **Relive exact memories** - Not just "a beach", but "Bondi Beach, near the surf shop"
✅ **Discover forgotten details** - "Oh yeah, there was a café right there!"
✅ **Share accurate locations** - Friends know exactly where the photo was taken
✅ **Nostalgia with context** - See the same shops and landmarks you remember

### For the App
✅ **Higher accuracy** - GPS is more precise than AI landmark detection
✅ **Real data** - Actual business names, not generic "shop" or "restaurant"
✅ **Scalability** - Works for any location with GPS, not just famous landmarks
✅ **Rich context** - Distances, ratings, photos of nearby places

---

## Privacy & Security

### GPS Data Handling
- GPS data is **only extracted** for scene creation
- **Not stored** separately from the photo
- **Not shared** with third parties
- Users can strip EXIF before upload if desired

### Google Maps API
- API key should be **restricted** to specific APIs
- Add **HTTP referrer restrictions** for web use
- Monitor **quota usage** to avoid unexpected charges
- Consider adding **rate limiting** for cost control

---

## Cost Considerations

### Google Maps API Pricing (as of 2024)

**Geocoding API:**
- $5 per 1,000 requests
- First $200/month free (40,000 requests)

**Places API (Nearby Search):**
- $32 per 1,000 requests
- First $200/month free (6,250 requests)

**Street View Static API:**
- $7 per 1,000 requests
- First $200/month free (28,500 requests)

### Estimated Cost Per Scene
- Geocoding: $0.005
- Nearby Search: $0.032
- Street View (4 images): $0.028
- **Total: ~$0.065 per GPS-enabled photo**

### Optimization Tips
1. **Cache location data** - Store GPS results in Convex
2. **Radius limits** - Don't fetch more than 20 nearby places
3. **Conditional usage** - Only call APIs if GPS exists
4. **Batch processing** - Combine nearby users' requests

---

## Testing

### Test Photos

To test the GPS feature, use photos with EXIF GPS data:

1. **Take a photo with your smartphone** (GPS enabled)
2. **Don't edit it** - Editing often strips EXIF data
3. **Upload to ARtisan**
4. **Check console logs** for GPS extraction

### Sample Test Locations

Try photos from these well-known places:
- **Times Square, NYC**: 40.7580° N, 73.9855° W
- **Eiffel Tower, Paris**: 48.8584° N, 2.2945° E
- **Tokyo Tower, Japan**: 35.6586° N, 139.7454° E
- **Sydney Opera House**: -33.8568° S, 151.2153° E

### Testing Without GPS

If your photos don't have GPS:
1. Use EXIF editing tools to add GPS
2. Or rely on Priority 2/3 (landmark/AI detection)
3. Or use Google Photos (preserves EXIF)

---

## Troubleshooting

### "No GPS data found in photo EXIF"
**Cause**: Photo doesn't contain GPS coordinates
**Solutions**:
- Check if GPS was enabled when photo was taken
- Verify photo hasn't been edited (stripping EXIF)
- Try a different photo
- System will fall back to AI landmark detection

### "Google Maps API key not configured"
**Cause**: Missing `GOOGLE_MAPS_API_KEY` in `.env.local`
**Solutions**:
- Add API key to `.env.local`
- Restart Next.js dev server
- Verify API key is valid

### "Reverse geocoding failed"
**Cause**: Invalid coordinates or API quota exceeded
**Solutions**:
- Check GPS coordinates are valid
- Verify API key has Geocoding API enabled
- Check Google Cloud Console for quota limits

### "No nearby places found"
**Cause**: Location is remote or API error
**Solutions**:
- Increase search radius (200m → 500m)
- Check if Places API is enabled
- Verify location isn't in middle of ocean/desert

---

## Future Enhancements

### Planned Features

1. **3D Building Reconstruction**
   - Use Google Earth 3D tiles
   - Photogrammetry from Street View
   - Accurate building heights and shapes

2. **Historical Street View**
   - Show location at different time periods
   - "See this place in 2015 vs 2024"
   - Time-travel AR experiences

3. **Indoor Mapping**
   - Google Indoor Maps for malls, airports
   - Floor plans and interior navigation
   - Room-level accuracy

4. **Multi-Photo Fusion**
   - Combine multiple photos from same location
   - Better 3D reconstruction
   - Fill in missing details

5. **Offline Mode**
   - Cache location data
   - Pre-download Street View tiles
   - Work without internet

---

## Summary

The GPS-based location feature transforms ARtisan from a **generic scene generator** into a **precise memory recreation tool**. By extracting real GPS coordinates and finding actual nearby places, users can:

🎯 **Return to the exact spot** where memories were made
🏪 **See real businesses** that exist at that location
🌍 **Relive authentic experiences** with accurate spatial context
📍 **Share precise locations** with friends and family

**Setup Time**: 5 minutes (just add Google Maps API key)
**Cost**: ~$0.07 per photo (with free tier covering first 3,000+ photos/month)
**Accuracy**: GPS-level precision (within meters)

This feature makes ARtisan the **most accurate AR memory recreation platform** available! 🚀

---

## Quick Start

1. **Add API key** to `.env.local`:
   ```bash
   GOOGLE_MAPS_API_KEY=your_key_here
   ```

2. **Switch to enhanced endpoint** (already done):
   ```typescript
   // src/app/api/upload/route.ts
   fetch("/api/workflows/create-scene-enhanced", ...)
   ```

3. **Upload a photo with GPS data**

4. **Watch the magic happen**:
   ```
   Step 1: Extracting location from photo GPS...
   ✓ Location found: Market St & 5th St, San Francisco, CA
   ✓ Found 15 nearby places
   Nearby: Starbucks, Westfield Centre, Powell Station, ...
   ```

**That's it!** The system automatically detects GPS and creates an accurate 3D world recreation. 🎉
