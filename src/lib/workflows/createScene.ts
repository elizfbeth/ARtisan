import {
  analyzeImageWithGemini,
  generateEnvironmentWithFal,
} from "../ai-clients";
import { uploadFromUrl } from "../supabase";
import {
  fetchWorldDetails,
  getBest3DFormat,
  GalleryWorld,
} from "../gallery";

/**
 * Scene Creation Workflow - Enhanced with Location Intelligence & Gallery Templates
 * 
 * Orchestrates the transformation of a user photo into an AR environment:
 * 1. Analyze photo with Gemini 2.5 Flash (includes location detection)
 * 2. Search for location-specific information using Exa AI
 * 3. Generate enhanced environment texture with fal.ai OR use Gallery template
 * 4. Store assets in Supabase
 * 
 * This workflow is typically triggered via Manus AI orchestration
 */

export type EnvironmentSource = "generate" | "gallery-template";

export interface SceneCreationInput {
  photoUrl?: string;
  sceneId: string;
  environmentSource?: EnvironmentSource;
  galleryWorldId?: string;
}

export interface SceneCreationResult {
  analysis?: {
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
  environmentType: "panorama" | "skybox" | "gallery";
  galleryWorldId?: string;
  galleryData?: GalleryWorld;
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
  console.log("Environment source:", input.environmentSource);
  console.log("Photo URL:", input.photoUrl);
  console.log("Gallery World ID:", input.galleryWorldId);

  // GALLERY TEMPLATE WORKFLOW
  if (input.environmentSource === "gallery-template" && input.galleryWorldId) {
    console.log("Using gallery template workflow...");

    // Fetch gallery world data
    const galleryWorld = await fetchWorldDetails(input.galleryWorldId);
    console.log("Gallery world fetched:", galleryWorld.display_name);

    // Get the best 3D format
    const best3D = getBest3DFormat(galleryWorld);
    console.log("Best 3D format:", best3D.format, best3D.url);

    // Use the thumbnail as environment texture
    const thumbnailUrl = galleryWorld.generation_output.cond_image_url;

    return {
      environmentTextureUrl: thumbnailUrl,
      environmentStoragePath: "", // Gallery URLs are external, no storage path needed
      environmentType: "gallery",
      galleryWorldId: input.galleryWorldId,
      galleryData: galleryWorld,
    };
  }

  // STANDARD PHOTO UPLOAD WORKFLOW
  if (!input.photoUrl) {
    throw new Error("Photo URL is required for generation workflow");
  }

  // Give Supabase a moment to make the file available
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 1: Analyze the photo with Gemini
  console.log("Step 1: Analyzing photo with Gemini...");
  const analysis = await analyzeImageWithGemini(input.photoUrl);
  console.log("Analysis complete:", analysis);

  // Step 2: Generate environment prompt based on analysis
  const environmentPrompt = createEnvironmentPrompt(analysis);
  console.log("Generated environment prompt:", environmentPrompt);

  // Step 3: Generate environment texture with fal.ai
  console.log("Step 2: Generating environment with fal.ai...");
  const generatedImageUrl = await generateEnvironmentWithFal(environmentPrompt);
  console.log("Environment generated:", generatedImageUrl);

  // Step 4: Upload to Supabase storage
  console.log("Step 3: Uploading to Supabase...");
  const storagePath = `scenes/${input.sceneId}/environment.jpg`;
  const { url: environmentTextureUrl, path: environmentStoragePath } =
    await uploadFromUrl("ENVIRONMENTS", storagePath, generatedImageUrl, "image/jpeg");
  console.log("Upload complete:", environmentTextureUrl);

  return {
    analysis,
    environmentTextureUrl,
    environmentStoragePath,
    environmentType: "panorama",
  };
}

/**
 * Create an environment generation prompt from Gemini analysis
 * Includes ALL detailed analysis for accurate scene replication
 */
function createEnvironmentPrompt(analysis: Record<string, unknown>): string {
  // Safely extract fields with fallbacks
  const environmentType = (typeof analysis?.environmentType === "string" ? analysis.environmentType : null) || "generic environment";
  const keyObjects = Array.isArray(analysis?.keyObjects) ? analysis.keyObjects : [];
  const mood = (typeof analysis?.mood === "string" ? analysis.mood : null) || "atmospheric";
  const colorPalette = Array.isArray(analysis?.colorPalette) ? analysis.colorPalette : [];
  
  // Extract location and landmark info
  const landmarkName = typeof analysis?.landmarkName === "string" ? analysis.landmarkName : null;
  const location = typeof analysis?.location === "string" ? analysis.location : null;
  const isLandmark = analysis?.isLandmark === true;
  
  // Extract detailed analysis fields
  const architecture = typeof analysis?.architecture === "string" ? analysis.architecture : "";
  const signage = typeof analysis?.signage === "string" ? analysis.signage : "";
  const lightingConditions = typeof analysis?.lightingConditions === "string" ? analysis.lightingConditions : "";
  const uniqueFeatures = typeof analysis?.uniqueFeatures === "string" ? analysis.uniqueFeatures : "";

  // Build location text
  let locationText = "";
  if (isLandmark && landmarkName) {
    locationText = ` of ${landmarkName}`;
    if (location) {
      locationText += ` in ${location}`;
    }
  } else if (location) {
    locationText = ` in ${location}`;
  }

  // Build object and color text
  const objectsText = keyObjects.length > 0
    ? ` featuring ${keyObjects.join(", ")}`
    : "";

  const colorsText = colorPalette.length > 0
    ? ` with ${colorPalette.join(", ")} color tones`
    : "";

  // Build comprehensive prompt with ALL details
  const parts: string[] = [];
  
  // Base scene
  parts.push(`A ${mood} ${environmentType} scene${locationText}${objectsText}${colorsText}. The image has to be point of view as a person on the ground. This image will be converted to a 360-degree panoramic view so make it seamless.`);
  
  // Architecture details
  if (architecture) {
    parts.push(`. Architecture: ${architecture}`);
  }
  
  // Signage (critical for location identification)
  if (signage) {
    parts.push(`. Signage and text: ${signage}`);
  }
  
  // Lighting
  if (lightingConditions) {
    parts.push(`. Lighting: ${lightingConditions}`);
  }
  
  // Unique features
  if (uniqueFeatures) {
    parts.push(`. Distinctive features: ${uniqueFeatures}`);
  }
  
  // Technical requirements - emphasize ground-level perspective
  parts.push(`. Generate as 360-degree immersive equirectangular panorama from GROUND LEVEL perspective (eye-level at 1.5-2 meters height). The viewpoint must be from a person standing on the ground, NOT from above or aerial view. Photorealistic, atmospheric lighting, high detail, seamless horizontal 360-degree panorama`);

  return parts.join("");
}

/**
 * Fallback: Generate a simple procedural environment if AI generation fails
 */
export function generateFallbackEnvironment(mood: string): {
  type: "procedural";
  config: {
    skyColor: string;
    groundColor: string;
    fogDensity: number;
  };
} {
  // Simple color schemes based on mood
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

