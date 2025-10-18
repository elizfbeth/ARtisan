import {
  describeObjectWithGemini,
  generate3DModelWithFal,
} from "../ai-clients";
import { uploadFromUrl } from "../supabase";

/**
 * Object Synthesis Workflow (Doodle to Life)
 * 
 * Transforms user input (sketch, text, or photo) into a 3D object:
 * 1. Process input with Gemini to create detailed description
 * 2. Generate 3D model with fal.ai
 * 3. Store model in Supabase
 * 
 * This workflow brings user imagination to life in the AR scene
 */

export interface ObjectSynthesisInput {
  sceneId: string;
  inputType: "sketch" | "text" | "photo";
  inputData: string; // Base64 image or text prompt
  inputName?: string;
}

export interface ObjectSynthesisResult {
  objectId: string;
  name: string;
  description: string;
  modelUrl: string;
  modelType: "glb" | "image";
  storagePath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/**
 * Execute the object synthesis workflow
 */
export async function executeObjectSynthesis(
  input: ObjectSynthesisInput
): Promise<ObjectSynthesisResult> {
  console.log("Starting object synthesis workflow for scene:", input.sceneId);
  console.log("Input type:", input.inputType);
  
  let description: string;
  let generatedModelUrl: string;
  let modelType: "glb" | "image";
  
  // Step 1 & 2: Process based on input type
  if (input.inputType === "text") {
    // TEXT WORKFLOW: Gemini description → FLUX image → Meshy 3D
    console.log("Step 1: Generating detailed description with Gemini...");
    description = await describeObjectWithGemini(
      input.inputType,
      input.inputData
    );
    console.log("Description generated:", description);
    
    console.log("Step 2: Generating 3D model from text description...");
    console.log("Note: This will generate an image first, then convert to 3D (30-60 seconds)...");
    const result = await generate3DModelWithFal(description, undefined, false);
    generatedModelUrl = result.modelUrl;
    modelType = result.modelType;
    
  } else {
    // IMAGE WORKFLOW (sketch/photo): Base64 image → Gemini enhancement → Meshy 3D
    console.log("Step 1: Processing image input for 3D conversion...");
    
    // Generate description for naming purposes
    description = await describeObjectWithGemini(
      input.inputType,
      input.inputData
    );
    console.log("Description generated for naming:", description.substring(0, 100) + "...");
    
    console.log("Step 2: Generating 3D model from image with Gemini enhancement...");
    console.log("Note: 3D model generation may take 30-60 seconds...");
    
    // Pass base64 image directly to Meshy with Gemini enhancement enabled
    const result = await generate3DModelWithFal(
      undefined,
      input.inputData,
      true // Enable Gemini enhancement for better 3D conversion
    );
    generatedModelUrl = result.modelUrl;
    modelType = result.modelType;
  }
  
  console.log("Model generated:", { url: generatedModelUrl, type: modelType });
  
  // Step 3: Upload to Supabase storage
  console.log("Step 3: Uploading to Supabase...");
  const objectId = generateObjectId();
  
  // Use appropriate file extension and content type based on model type
  const fileExtension = modelType === "glb" ? ".glb" : ".png";
  const contentType = modelType === "glb" ? "model/gltf-binary" : "image/png";
  const storagePath = `scenes/${input.sceneId}/objects/${objectId}${fileExtension}`;
  
  const { url: modelUrl, path: finalStoragePath } = 
    await uploadFromUrl("MODELS", storagePath, generatedModelUrl, contentType);
  console.log("Upload complete:", { url: modelUrl, type: modelType });
  
  // Generate a name if not provided
  const objectName = input.inputName || generateObjectName(description);
  
  // Default position: in front of camera at origin
  const position = { x: 0, y: 1, z: -3 };
  const rotation = { x: 0, y: 0, z: 0 };
  const scale = { x: 1, y: 1, z: 1 };
  
  return {
    objectId,
    name: objectName,
    description,
    modelUrl,
    modelType,
    storagePath: finalStoragePath,
    position,
    rotation,
    scale,
  };
}

/**
 * Generate a unique object ID
 */
function generateObjectId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a simple name from the description
 */
function generateObjectName(description: string): string {
  // Extract first few words or use a default
  const words = description.split(" ").slice(0, 3).join(" ");
  return words.length > 30 ? words.substring(0, 30) + "..." : words;
}

/**
 * Validate input data based on type
 */
export function validateObjectInput(input: ObjectSynthesisInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.sceneId) {
    return { valid: false, error: "Scene ID is required" };
  }
  
  if (!input.inputType) {
    return { valid: false, error: "Input type is required" };
  }
  
  if (!input.inputData) {
    return { valid: false, error: "Input data is required" };
  }
  
  // Validate text input
  if (input.inputType === "text") {
    if (input.inputData.trim().length < 3) {
      return { valid: false, error: "Text input is too short" };
    }
    if (input.inputData.length > 500) {
      return { valid: false, error: "Text input is too long (max 500 characters)" };
    }
  }
  
  // Validate image input (sketch or photo)
  if (input.inputType === "sketch" || input.inputType === "photo") {
    if (!input.inputData.includes("base64") && !input.inputData.startsWith("data:image")) {
      return { valid: false, error: "Invalid image data format" };
    }
  }
  
  return { valid: true };
}

/**
 * Create a simple geometric primitive as fallback
 */
export function createFallbackObject(name: string): {
  type: "primitive";
  geometry: string;
  color: string;
} {
  // Simple fallback geometries
  const geometries = ["box", "sphere", "cylinder", "cone", "torus"];
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
  
  const randomGeometry = geometries[Math.floor(Math.random() * geometries.length)];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  return {
    type: "primitive",
    geometry: randomGeometry,
    color: randomColor,
  };
}

