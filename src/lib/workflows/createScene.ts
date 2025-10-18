import {
  analyzeImageWithGemini,
  generateEnvironmentWithFal,
} from "../ai-clients";
import { uploadFromUrl } from "../supabase";

/**
 * Scene Creation Workflow
 * 
 * Orchestrates the transformation of a user photo into an AR environment:
 * 1. Analyze photo with Gemini 2.5 Flash
 * 2. Generate environment texture with fal.ai
 * 3. Store assets in Supabase
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
  };
  environmentTextureUrl: string;
  environmentStoragePath: string;
  environmentType: "panorama" | "skybox";
}

/**
 * Execute the scene creation workflow
 */
export async function executeSceneCreation(
  input: SceneCreationInput
): Promise<SceneCreationResult> {
  console.log("Starting scene creation workflow for scene:", input.sceneId);
  console.log("Photo URL:", input.photoUrl);

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
 */
function createEnvironmentPrompt(analysis: {
  environmentType: string;
  keyObjects: string[];
  depthPerspective: string;
  colorPalette: string[];
  mood: string;
}): string {
  const { environmentType, keyObjects, mood, colorPalette } = analysis;
  
  // Build a rich, descriptive prompt for environment generation
  const objectsText = keyObjects.length > 0 
    ? ` featuring ${keyObjects.slice(0, 3).join(", ")}` 
    : "";
    
  const colorsText = colorPalette.length > 0 
    ? ` with ${colorPalette.slice(0, 3).join(", ")} color tones` 
    : "";
  
  return `A ${mood} ${environmentType} scene${objectsText}${colorsText}. Immersive, photorealistic, wide angle view, atmospheric lighting, high detail, seamless panoramic perspective`;
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

