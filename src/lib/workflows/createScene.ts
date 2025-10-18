import {
  analyzeImageWithGemini,
  generateEnvironmentWithFal,
} from "../ai-clients";
import { uploadFromUrl } from "../supabase";

/**
 * Scene Creation Workflow - Enhanced with Location Intelligence
 * 
 * Orchestrates the transformation of a user photo into an AR environment:
 * 1. Analyze photo with Gemini 2.5 Flash (includes location detection)
 * 2. Search for location-specific information using Exa AI
 * 3. Generate enhanced environment texture with fal.ai
 * 4. Store assets in Supabase
 * 
 * This workflow is typically triggered via Manus AI orchestration
 */

export interface SceneCreationInput {
  photoUrl: string;
  sceneId: string;
}

export interface SceneCreationResult {
  analysis: {
    environmentType: string;
    keyObjects: string[];
    depthPerspective: string;
    colorPalette: string[];
    mood: string;
    location?: {
      hasLocation: boolean;
      locationName: string;
      locationType: string;
      locationKeywords: string[];
    };
  };
  locationContext?: {
    description: string;
    facts: string[];
    atmosphere: string;
    historicalContext: string;
  };
  environmentTextureUrl: string;
  environmentStoragePath: string;
  environmentType: "panorama" | "skybox";
  waypoints?: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    label: string;
  }>;
}

/**
 * Execute the scene creation workflow
 */
export async function executeSceneCreation(
  input: SceneCreationInput
): Promise<SceneCreationResult> {
  console.log("Starting scene creation workflow for scene:", input.sceneId);
  
  // Step 1: Analyze the photo with Gemini (includes location detection)
  console.log("Step 1: Analyzing photo with Gemini...");
  const analysis = await analyzeImageWithGemini(input.photoUrl);
  console.log("Analysis complete:", analysis);
  
  // Step 2: Get location-specific information if location detected
  let locationContext;
  let waypoints;
  
  if (analysis.location?.hasLocation && analysis.location.locationName) {
    console.log("Step 2: Location detected:", analysis.location.locationName);
    // TODO: Implement Exa AI integration for location-specific information
    // For now, skip location context retrieval
    
    // Generate waypoints for Street View navigation
    waypoints = generateWaypoints(analysis.location.locationName);
  }
  
  // Step 3: Generate environment prompt based on analysis and location context
  const environmentPrompt = createEnvironmentPrompt(analysis, locationContext);
  console.log("Generated environment prompt:", environmentPrompt);
  
  // Step 4: Generate environment texture with fal.ai
  console.log("Step 4: Generating 360° panoramic environment with fal.ai...");
  const generatedImageUrl = await generateEnvironmentWithFal(environmentPrompt);
  console.log("Environment generated:", generatedImageUrl);
  
  // Step 5: Upload to Supabase storage
  console.log("Step 5: Uploading to Supabase...");
  const storagePath = `scenes/${input.sceneId}/environment.jpg`;
  const { url: environmentTextureUrl, path: environmentStoragePath } = 
    await uploadFromUrl("ENVIRONMENTS", storagePath, generatedImageUrl, "image/jpeg");
  console.log("Upload complete:", environmentTextureUrl);
  
  return {
    analysis,
    locationContext,
    environmentTextureUrl,
    environmentStoragePath,
    environmentType: "panorama",
    waypoints,
  };
}

/**
 * Create an environment generation prompt from Gemini analysis and location context
 */
function createEnvironmentPrompt(
  analysis: {
    environmentType: string;
    keyObjects: string[];
    depthPerspective: string;
    colorPalette: string[];
    mood: string;
    location?: {
      hasLocation: boolean;
      locationName: string;
      locationType: string;
      locationKeywords: string[];
    };
  },
  locationContext?: {
    description: string;
    facts: string[];
    atmosphere: string;
    historicalContext: string;
  }
): string {
  const { environmentType, keyObjects, mood, colorPalette, location } = analysis;
  
  // Build a rich, descriptive prompt for environment generation
  const objectsText = keyObjects.length > 0 
    ? ` featuring ${keyObjects.slice(0, 3).join(", ")}` 
    : "";
    
  const colorsText = colorPalette.length > 0 
    ? ` with ${colorPalette.slice(0, 3).join(", ")} color tones` 
    : "";
  
  // Add location-specific context if available
  let locationText = "";
  if (location?.hasLocation && locationContext) {
    locationText = ` at ${location.locationName}. ${locationContext.atmosphere}. ${locationContext.description}`;
  }
  
  return `A ${mood} ${environmentType} scene${objectsText}${colorsText}${locationText}. Immersive, photorealistic, wide angle view, atmospheric lighting, high detail, seamless 360-degree equirectangular panoramic perspective`;
}

/**
 * Generate waypoints for Street View navigation based on location
 */
function generateWaypoints(locationName: string): Array<{
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
}> {
  // Generate 4 cardinal direction waypoints
  const distance = 10;
  return [
    {
      id: "north",
      position: { x: 0, y: 1.6, z: -distance },
      label: `North of ${locationName}`,
    },
    {
      id: "east",
      position: { x: distance, y: 1.6, z: 0 },
      label: `East of ${locationName}`,
    },
    {
      id: "south",
      position: { x: 0, y: 1.6, z: distance },
      label: `South of ${locationName}`,
    },
    {
      id: "west",
      position: { x: -distance, y: 1.6, z: 0 },
      label: `West of ${locationName}`,
    },
  ];
}

/**
 * Fallback: Generate a simple procedural environment if AI generation fails
 */
export function generateFallbackEnvironment(mood: string, environmentType: string): {
  type: "procedural";
  config: {
    skyColor: string;
    groundColor: string;
    fogDensity: number;
  };
} {
  // Simple color schemes based on mood and environment
  const colorSchemes: Record<string, { sky: string; ground: string; fog: number }> = {
    calm: { sky: "#87CEEB", ground: "#90EE90", fog: 0.01 },
    energetic: { sky: "#FF6347", ground: "#FFD700", fog: 0.005 },
    mysterious: { sky: "#2F4F4F", ground: "#483D8B", fog: 0.03 },
    default: { sky: "#87CEEB", ground: "#DEB887", fog: 0.015 },
  };
  
  const scheme = colorSchemes[mood.toLowerCase()] || colorSchemes.default;
  
  return {
    type: "procedural",
    config: {
      skyColor: scheme.sky,
      groundColor: scheme.ground,
      fogDensity: scheme.fog,
    },
  };
}

