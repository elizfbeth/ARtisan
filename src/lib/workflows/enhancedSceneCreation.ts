import {
  analyzeImageWithGemini,
  analyzeMultipleImages,
  generateEnvironmentWithFal,
  searchLandmarkWithJigsawStack,
  searchLandmarkContextWithExa,
} from "../ai-clients";
import { uploadFromUrl } from "../supabase";
import {
  getLocationDataFromPhoto,
  analyzeReferenceImages,
  type LocationData,
} from "../location-services";

/**
 * Enhanced Scene Creation Workflow
 *
 * This workflow creates immersive 3D worlds based on landmark detection:
 * 1. Analyze photo with Gemini (including landmark detection)
 * 2. If landmark detected:
 *    - Check Supabase cache for existing landmark data
 *    - If not cached, use JigsawStack to find additional images
 *    - Use Exa AI to gather contextual information
 *    - Cache results in Supabase for future use
 * 3. Generate enhanced 3D environment using all gathered data
 * 4. Store assets in Supabase
 */

export interface EnhancedSceneCreationInput {
  photoUrl: string;
  sceneId: string;
}

export interface LandmarkData {
  name: string;
  location: string;
  confidence: number;
  additionalImages: string[];
  historicalInfo: string;
  architecturalDetails: string;
  relatedPlaces: string[];
  sources: { title: string; url: string; excerpt: string }[];
  cachedAt?: number;
}

export interface EnhancedAnalysis {
  // Basic analysis
  environmentType: string;
  keyObjects: string[];
  depthPerspective: string;
  colorPalette: string[];
  mood: string;
  isLandmark: boolean;
  landmarkName: string | null;
  location: string | null;
  landmarkConfidence: number;

  // Extended detailed analysis (25+ fields)
  lightingConditions?: string;
  weatherConditions?: string;
  architecture?: string;
  vegetation?: string;
  surfaceMaterials?: string;
  signage?: string;
  people?: string;
  vehicles?: string;
  streetFurniture?: string;
  spatialLayout?: string;
  foregroundDetails?: string;
  midgroundDetails?: string;
  backgroundDetails?: string;
  uniqueFeatures?: string;
  textureDetails?: string;
  scaleIndicators?: string;
  shadowPatterns?: string;
  reflections?: string;
  materialAging?: string;
  culturalElements?: string;
}

export interface EnhancedSceneCreationResult {
  analysis: EnhancedAnalysis;
  landmarkData?: LandmarkData;
  locationData?: LocationData; // Real GPS-based location data
  environmentTextureUrl: string;
  environmentStoragePath: string;
  environmentType: "panorama" | "skybox" | "3d_world";
}

/**
 * Execute the enhanced scene creation workflow
 */
export async function executeEnhancedSceneCreation(
  input: EnhancedSceneCreationInput
): Promise<EnhancedSceneCreationResult> {
  console.log("Starting enhanced scene creation workflow for scene:", input.sceneId);
  console.log("Photo URL:", input.photoUrl);

  // Give Supabase a moment to make the file available
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 1: Extract real location data from photo GPS
  console.log("Step 1: Extracting location from photo GPS...");
  const locationData = await getLocationDataFromPhoto(input.photoUrl);

  if (locationData) {
    console.log("✓ Location found:", locationData.address.formatted);
    console.log(`✓ Found ${locationData.nearbyPlaces.length} nearby places`);
    console.log("Nearby:", locationData.nearbyPlaces.slice(0, 5).map(p => p.name).join(", "));
  } else {
    console.log("⚠ No GPS data in photo, will rely on AI analysis only");
  }

  // Step 2: Analyze the photo with Gemini (including landmark detection)
  console.log("Step 2: Analyzing photo with Gemini...");
  const analysis = await analyzeImageWithGemini(input.photoUrl);
  console.log("Analysis complete:", analysis);

  let landmarkData: LandmarkData | undefined;
  let environmentType: "panorama" | "skybox" | "3d_world" = "panorama";

  // If we have real location data, this is always a 3D world
  if (locationData) {
    environmentType = "3d_world";
  }

  // Step 2a: If landmark detected, gather additional context
  if (analysis.isLandmark && analysis.landmarkName && analysis.landmarkConfidence > 0.6) {
    console.log(`Landmark detected: ${analysis.landmarkName} (confidence: ${analysis.landmarkConfidence})`);
    environmentType = "3d_world";

    // Check cache first
    const cachedData = await getLandmarkFromCache(analysis.landmarkName);

    if (cachedData) {
      console.log("Using cached landmark data");
      landmarkData = cachedData;
    } else {
      console.log("Gathering fresh landmark data...");

      // Parallel execution for speed
      const [jigsawData, exaData] = await Promise.all([
        searchLandmarkWithJigsawStack(analysis.landmarkName, analysis.location || undefined),
        searchLandmarkContextWithExa(analysis.landmarkName, analysis.location || undefined),
      ]);

      landmarkData = {
        name: analysis.landmarkName,
        location: analysis.location || "Unknown",
        confidence: analysis.landmarkConfidence,
        additionalImages: jigsawData.images,
        historicalInfo: exaData.historicalInfo,
        architecturalDetails: exaData.architecturalDetails,
        relatedPlaces: exaData.relatedPlaces,
        sources: exaData.sources,
      };

      // Cache for future use
      await cacheLandmarkData(analysis.landmarkName, landmarkData);
      console.log("Landmark data cached successfully");
    }
  }

  // Step 2b: Fetch and analyze Google Maps satellite + Street View imagery
  let satelliteAnalysis: string | undefined;
  let streetViewAnalysis: string | undefined;

  if (locationData && locationData.coordinates) {
    console.log("Step 2b: Fetching Google Maps satellite and Street View imagery...");
    const referenceImages = await analyzeReferenceImages(locationData.coordinates);

    if (referenceImages) {
      console.log(`Reference images available: Satellite=${referenceImages.hasSatellite}, Street View=${referenceImages.hasStreetView}`);

      // Analyze satellite imagery if available
      if (referenceImages.hasSatellite && referenceImages.satelliteImageUrls.close) {
        console.log("Analyzing satellite imagery with Gemini...");
        try {
          satelliteAnalysis = await analyzeMultipleImages(
            [
              referenceImages.satelliteImageUrls.close,
              referenceImages.satelliteImageUrls.medium,
              referenceImages.satelliteImageUrls.wide,
            ].filter((url): url is string => url !== null),
            `Analyze these satellite/aerial images to extract CONTEXTUAL INFORMATION ONLY about nearby features and spatial relationships. DO NOT describe the aerial view itself.

Focus on identifying:

1. PROMINENT BUILDINGS: Names, purposes, or distinctive characteristics of visible buildings (e.g., "Large office tower to the north", "Shopping complex to the east").

2. NEARBY LANDMARKS: Any recognizable landmarks or notable structures within 500m.

3. SPATIAL RELATIONSHIPS: Which buildings are adjacent, distances between major structures, overall density (e.g., "Dense urban core", "Suburban spacing").

4. STREET NETWORK: Major streets, intersections, or road names if identifiable (for ground-level context).

5. VEGETATION DISTRIBUTION: Location of parks, tree-lined streets, green spaces (e.g., "Park 200m to the west").

6. WATER FEATURES: Rivers, canals, or water bodies nearby (and their direction from the location).

7. UNIQUE CONTEXTUAL FEATURES: Shopping districts, transport hubs, notable areas within view.

Format as: List nearby features and their relative positions/distances. DO NOT use aerial perspective language (no "from above", "overhead", "bird's eye"). Describe as if explaining to someone standing at ground level what's around them.`
          );
          console.log("✓ Satellite analysis complete");
        } catch (error) {
          console.error("Failed to analyze satellite imagery:", error);
        }
      }

      // Analyze Street View 360° imagery if available
      if (referenceImages.hasStreetView && referenceImages.streetViewImageUrls && referenceImages.streetViewImageUrls.length > 0) {
        console.log(`Analyzing Street View panorama (${referenceImages.streetViewImageUrls.length} directions)...`);
        try {
          streetViewAnalysis = await analyzeMultipleImages(
            referenceImages.streetViewImageUrls,
            `Analyze these Street View images captured from 8 different directions (N, NE, E, SE, S, SW, W, NW) at the same GPS location.

Create a comprehensive 360° description of the ground-level environment including:

1. BUILDINGS IN EACH DIRECTION: Describe visible buildings, their heights, architectural styles, facade materials, colors, and distinctive features in each direction.

2. STREET-LEVEL DETAILS: Sidewalks, curbs, road surfaces, lane markings, crosswalks, and pedestrian areas.

3. STREET FURNITURE: Benches, trash cans, bike racks, bollards, planters, news stands, phone booths in each direction.

4. SIGNAGE: All visible signs including street names, shop signs, directional signs, advertisements. Include text when readable.

5. LIGHTING: Street lamps, building lights, decorative lighting, their styles and positions.

6. VEGETATION: Trees, bushes, planters, green walls. Note species if identifiable, sizes, and locations.

7. VEHICLES: Parked cars, bikes, buses. Note types and positions.

8. ARCHITECTURAL DETAILS: Windows, doors, awnings, balconies, cornices, building entrances.

9. DISTANCES: Approximate distances to visible buildings and features in each direction.

10. MATERIALS & TEXTURES: Ground surfaces (asphalt, concrete, brick, etc.), building materials, weathering and aging.

Format your response as a detailed directional guide (North: ..., Northeast: ..., etc.) suitable for creating an accurate 360° environment.`
          );
          console.log("✓ Street View analysis complete");
        } catch (error) {
          console.error("Failed to analyze Street View imagery:", error);
        }
      }
    }
  } else {
    console.log("⚠ No GPS coordinates available - skipping Google Maps reference imagery");
  }

  // Step 3: Generate environment prompt based on all available data
  // Pass the FULL raw analysis to preserve all details
  const environmentPrompt = createEnhancedEnvironmentPrompt(
    analysis,
    landmarkData,
    locationData || undefined,
    satelliteAnalysis,
    streetViewAnalysis
  );

  // ============================================================================
  // ULTRA-DETAILED PROMPT LOGGING (BEFORE FAL.AI)
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log("📋 ENHANCED ENVIRONMENT PROMPT GENERATED");
  console.log("=".repeat(80));
  console.log("\n📊 Prompt Statistics:");
  console.log(`   - Total Characters: ${environmentPrompt.length}`);
  console.log(`   - Total Words: ~${Math.round(environmentPrompt.split(" ").length)}`);
  console.log(`   - Has Landmark Data: ${!!landmarkData}`);
  console.log(`   - Has Location Data: ${!!locationData}`);
  console.log(`   - Has Satellite Analysis: ${!!satelliteAnalysis}`);
  console.log(`   - Has Street View Analysis: ${!!streetViewAnalysis}`);
  console.log("\n" + "-".repeat(80));
  console.log("FULL ULTRA-DETAILED PROMPT:");
  console.log("-".repeat(80));
  console.log(environmentPrompt);
  console.log("-".repeat(80));
  console.log("=".repeat(80) + "\n");
  // ============================================================================

  // Step 4: Generate environment texture with fal.ai
  console.log("Step 3: Generating environment with fal.ai...");
  const generatedImageUrl = await generateEnvironmentWithFal(environmentPrompt);
  console.log("Environment generated:", generatedImageUrl);

  // Step 5: Upload to Supabase storage
  console.log("Step 4: Uploading to Supabase...");
  const storagePath = `scenes/${input.sceneId}/environment.jpg`;
  const { url: environmentTextureUrl, path: environmentStoragePath } =
    await uploadFromUrl("ENVIRONMENTS", storagePath, generatedImageUrl, "image/jpeg");
  console.log("Upload complete:", environmentTextureUrl);

  return {
    analysis,
    landmarkData,
    locationData: locationData || undefined,
    environmentTextureUrl,
    environmentStoragePath,
    environmentType,
  };
}

/**
 * Create environment generation prompt for Fal AI
 * 
 * CONSISTENT APPROACH: Always send COMPLETE detailed analysis to Fal AI
 * to ensure the most accurate replication of the input image, regardless
 * of whether it's a landmark or a regular scene.
 */
function createEnhancedEnvironmentPrompt(
  analysis: EnhancedAnalysis,
  landmarkData?: LandmarkData,
  locationData?: LocationData,
  satelliteAnalysis?: string,
  streetViewAnalysis?: string
): string {
  const landmarkName = landmarkData?.name || (analysis.isLandmark ? analysis.landmarkName : null);
  const parts: string[] = [];
  
  // ============================================================================
  // ALWAYS SEND COMPLETE DETAILED ANALYSIS (Consistent for all images)
  // ============================================================================
  
  // If it's a landmark, emphasize that first
  if (landmarkName) {
    parts.push(`PRIMARY LANDMARK: ${landmarkName}`);
    if (landmarkData?.location || analysis.location) {
      parts.push(` in ${landmarkData?.location || analysis.location}`);
    }
    parts.push(`. `);
  }
  
  // Environment and mood
  parts.push(`Environment: ${analysis.environmentType}`);
  if (analysis.mood) {
    parts.push(`. Mood: ${analysis.mood}`);
  }
  
  // ALL visible objects (not just top 10)
  if (analysis.keyObjects && analysis.keyObjects.length > 0) {
    parts.push(`. Visible elements: ${analysis.keyObjects.join(", ")}`);
  }
  
  // FULL Architecture details (critical for CBD scenes)
  if (analysis.architecture) {
    parts.push(`. Architecture: ${analysis.architecture}`);
  }
  
  // FULL Signage details (CRITICAL for identifying location like Singapore CBD)
  if (analysis.signage) {
    parts.push(`. Signage and text: ${analysis.signage}`);
  }
  
  // Spatial layout and depth
  if (analysis.spatialLayout) {
    parts.push(`. Spatial layout: ${analysis.spatialLayout}`);
  } else if (analysis.depthPerspective) {
    parts.push(`. Depth perspective: ${analysis.depthPerspective}`);
  }
  
  // Foreground, midground, background
  if (analysis.foregroundDetails) {
    parts.push(`. Foreground: ${analysis.foregroundDetails}`);
  }
  if (analysis.midgroundDetails) {
    parts.push(`. Midground: ${analysis.midgroundDetails}`);
  }
  if (analysis.backgroundDetails) {
    parts.push(`. Background: ${analysis.backgroundDetails}`);
  }
  
  // Lighting conditions (FULL)
  if (analysis.lightingConditions) {
    parts.push(`. Lighting: ${analysis.lightingConditions}`);
  }
  
  // Weather and sky
  if (analysis.weatherConditions) {
    parts.push(`. Weather: ${analysis.weatherConditions}`);
  }
  
  // Surface materials and textures
  if (analysis.surfaceMaterials) {
    parts.push(`. Surface materials: ${analysis.surfaceMaterials}`);
  }
  if (analysis.textureDetails) {
    parts.push(`. Textures: ${analysis.textureDetails}`);
  }
  
  // Unique features (critical for identifying specific locations)
  if (analysis.uniqueFeatures) {
    parts.push(`. Distinctive features: ${analysis.uniqueFeatures}`);
  }
  
  // Urban elements
  if (analysis.streetFurniture) {
    parts.push(`. Street furniture: ${analysis.streetFurniture}`);
  }
  if (analysis.vehicles) {
    parts.push(`. Vehicles: ${analysis.vehicles}`);
  }
  if (analysis.people) {
    parts.push(`. People: ${analysis.people}`);
  }
  if (analysis.vegetation) {
    parts.push(`. Vegetation: ${analysis.vegetation}`);
  }
  
  // Color palette
  if (analysis.colorPalette && analysis.colorPalette.length > 0) {
    parts.push(`. Color palette: ${analysis.colorPalette.join(", ")}`);
  }
  
  // Add GPS location if available (helps with non-landmark scenes)
  if (locationData) {
    parts.push(`. Location: ${locationData.address.formatted}`);
    if (locationData.nearbyPlaces.length > 0) {
      const nearbyNames = locationData.nearbyPlaces.slice(0, 5).map(p => p.name).join(", ");
      parts.push(`. Nearby: ${nearbyNames}`);
    }
  }
  
  // Extract contextual info from satellite (but DON'T include aerial view directly)
  // Satellite data is used ONLY to learn about nearby features and spatial relationships
  if (satelliteAnalysis) {
    // Filter out aerial perspective language to avoid top-down view
    const contextualInfo = satelliteAnalysis
      .replace(/from above|aerial|bird's eye|overhead|top-down|roof|rooftop/gi, '')
      .replace(/satellite|aerial view/gi, 'nearby area');
    
    if (contextualInfo.length > 100) {
      parts.push(`. Surrounding area has: ${contextualInfo}`);
    }
  }
  
  // Add street view analysis if available (this IS ground-level, so include fully)
  if (streetViewAnalysis) {
    parts.push(`. Street view 360° ground-level observations: ${streetViewAnalysis}`);
  }
  
  // Technical specs - CRITICAL: Emphasize GROUND-LEVEL perspective (NOT aerial)
  parts.push(`. Generate as 360-degree immersive equirectangular panorama from GROUND LEVEL ONLY (eye-level perspective at 1.5-2 meters height, as if a person standing on the ground). DO NOT use aerial or top-down view. Photorealistic, highly detailed, accurate recreation of this exact scene${landmarkName ? ` with ${landmarkName} as the prominent central feature` : ''}. Seamless horizontal 360-degree panorama`);
  
  const prompt = parts.join("");
  
  // Log what we're sending
  if (landmarkName) {
    console.log(`🏛️ LANDMARK PROMPT (${landmarkName.toUpperCase()}): ${prompt.length} characters`);
  } else {
    console.log(`📸 SCENE PROMPT: ${prompt.length} characters`);
  }
  console.log(`   Content: ${analysis.signage ? '✓' : '✗'} Signage, ${analysis.architecture ? '✓' : '✗'} Architecture, ${analysis.uniqueFeatures ? '✓' : '✗'} Unique Features, ${satelliteAnalysis ? '✓' : '✗'} Satellite, ${streetViewAnalysis ? '✓' : '✗'} Street View`);
  
  return prompt;
}

/**
 * Calculate cardinal direction from point A to point B
 */
function getDirection(from: { latitude: number; longitude: number }, to: { lat: number; lng: number }): string {
  const dLon = to.lng - from.longitude;
  const dLat = to.lat - from.latitude;

  const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
  const normalizedAngle = (angle + 360) % 360;

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalizedAngle / 45) % 8;

  return directions[index];
}

/**
 * Get landmark data from cache
 * Note: This is a placeholder - the actual implementation will use Convex
 * and should be called from the API route with access to the Convex client
 */
async function getLandmarkFromCache(landmarkName: string): Promise<LandmarkData | null> {
  // This will be implemented in the API route where we have access to Convex
  // For now, always return null to fetch fresh data
  console.log(`Cache check for landmark: ${landmarkName} (not yet implemented)`);
  return null;
}

/**
 * Cache landmark data for future use
 * Note: This is a placeholder - the actual implementation will use Convex
 * and should be called from the API route with access to the Convex client
 */
async function cacheLandmarkData(landmarkName: string, data: LandmarkData): Promise<void> {
  // This will be implemented in the API route where we have access to Convex
  console.log(`Would cache landmark data for: ${landmarkName} (not yet implemented)`);
  console.log(`Data includes ${data.additionalImages.length} images and ${data.sources.length} sources`);
}
