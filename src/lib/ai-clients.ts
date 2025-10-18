import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import * as fal from "@fal-ai/serverless-client";
import Groq from "groq-sdk";
import { fetchWithRetry } from "./net";
import "./http-init"; // Initialize IPv4-first DNS and increased timeouts

/**
 * AI Service Clients Configuration
 * 
 * Centralized configuration for all AI services used in ARtisan
 */

// ============================================================================
// Gemini 2.5 Flash Client
// ============================================================================

/**
 * Initialize Google Gemini client
 */
export function getGeminiClient() {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY environment variable");
  }
  
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  // Using gemini-2.0-flash-exp (experimental model with latest features)
  // Note: Free tier limit is 50 requests/day (lower than 1.5-flash's 1,500/day)
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
}

/**
 * Analyze an image with Gemini
 */
export async function analyzeImageWithGemini(imageUrl: string) {
  const model = getGeminiClient();

  // Fetch the image with extended timeout and retries
  const imageResponse = await fetchWithRetry(imageUrl, {}, { timeoutMs: 120_000, retries: 3 });
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString("base64");
  
  const prompt = `Analyze this image in EXTREME detail for photorealistic 3D world recreation. Provide a comprehensive JSON response with:

BASIC ANALYSIS:
1. environmentType: Specific environment (e.g., "urban street corner", "tropical beach at sunset")
2. keyObjects: Array of ALL visible objects, ordered by prominence (minimum 15-30 items)
3. depthPerspective: Detailed depth, layers, spatial relationships
4. colorPalette: Array of 10+ dominant colors with hex codes
5. mood: Atmosphere with emotional descriptors
6. isLandmark: Boolean for landmark/tourist attraction
7. landmarkName: Name if landmark (null otherwise)
8. location: City/country if identifiable
9. landmarkConfidence: Score 0-1

DETAILED ANALYSIS:
10. lightingConditions: Time of day, sun position, shadows, light quality, color temperature, highlights
11. weatherConditions: Weather, sky state, clouds, visibility, atmospheric haze
12. architecture: Buildings - materials, styles, colors, textures, age, windows, doors, rooflines
13. vegetation: All plants, trees, grass - types, health, density, seasonal state
14. surfaceMaterials: Ground materials, textures, wear patterns (concrete, asphalt, tile, etc.)
15. signage: ALL text, signs, logos, shop names, street names, advertisements
16. people: Count, activities, clothing, demographics, positions, interactions
17. vehicles: Types, colors, positions, makes/models, states (parked/moving)
18. streetFurniture: Benches, bins, lights, signs, poles, mailboxes, bike racks
19. spatialLayout: Precise object relationships, distances, orientations, alignments
20. foregroundDetails: Everything 0-5m from camera
21. midgroundDetails: Objects 5-20m away
22. backgroundDetails: 20m+ objects, horizon, skyline
23. uniqueFeatures: Distinctive, unusual, or characteristic elements
24. textureDetails: Surface qualities (rough, smooth, weathered, polished, worn, new)
25. scaleIndicators: Objects showing scale (doors, windows, people, cars)

BE EXHAUSTIVE. Include micro-details:
- Pavement cracks, stains, patterns
- Window reflections, dirt, curtains
- Shadow angles and softness
- Architectural trim, moldings
- Brand names, fonts on signs
- Awning colors and materials
- Paving stone types and arrangement
- Graffiti, posters, stickers
- Material weathering and aging
- Exact element positioning
- Rust, peeling paint, wear marks
- Vegetation types and placement
- Lighting fixture styles
- Door and window styles

Return ONLY valid JSON.`;

  // Retry logic for handling overloaded API
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying Gemini image analysis after ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
      ]);

      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse Gemini response as JSON");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      lastError = error as Error;

      // Check if it's a 503 (overloaded) or other retryable error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes("503") ||
                         errorMessage.includes("overloaded") ||
                         errorMessage.includes("429") || // Rate limit
                         errorMessage.includes("500"); // Server error

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to analyze image with Gemini");
}

/**
 * Analyze multiple images with Gemini (for satellite + Street View analysis)
 *
 * @param imageUrls - Array of image URLs to analyze together
 * @param prompt - The analysis prompt
 * @returns Analysis text from Gemini
 */
export async function analyzeMultipleImages(
  imageUrls: string[],
  prompt: string
): Promise<string> {
  const model = getGeminiClient();

  console.log(`Analyzing ${imageUrls.length} images with Gemini...`);

  // Fetch and convert all images to base64
  const imageParts: Part[] = await Promise.all(
    imageUrls.map(async (url, index) => {
      try {
        console.log(`  Fetching image ${index + 1}/${imageUrls.length}...`);
        const response = await fetchWithRetry(url, {}, { timeoutMs: 30_000, retries: 2 });
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        return {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64,
          },
        } as Part;
      } catch (error) {
        console.error(`Failed to fetch image ${index + 1}:`, error);
        throw error;
      }
    })
  );

  console.log(`All ${imageUrls.length} images fetched, sending to Gemini...`);

  // Retry logic for handling overloaded API
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying Gemini multi-image analysis after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await model.generateContent([
        { text: prompt },
        ...imageParts,
      ]);

      const responseText = result.response.text();
      console.log(`✓ Gemini multi-image analysis complete (${responseText.length} chars)`);
      return responseText;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes("503") ||
                         errorMessage.includes("overloaded") ||
                         errorMessage.includes("429") ||
                         errorMessage.includes("500");

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      console.warn(`Retryable error on attempt ${attempt + 1}:`, errorMessage);
    }
  }

  throw lastError || new Error("Failed to analyze multiple images with Gemini");
}

/**
 * Generate a description for 3D object synthesis
 */
export async function describeObjectWithGemini(
  inputType: "sketch" | "text" | "photo",
  inputData: string
): Promise<string> {
  const model = getGeminiClient();

  let prompt = "";
  // Use the SDK Part type for multimodal requests
  const parts: Part[] = [] as unknown as Part[];

  if (inputType === "text") {
    prompt = `Convert this description into a detailed 3D object prompt suitable for 3D model generation. Include: shape, style, colors, materials, and key features. Keep it concise but descriptive.\n\nInput: ${inputData}\n\nDetailed 3D prompt:`;
    parts.push({ text: prompt });
  } else {
    // For sketch or photo
    prompt = `Describe this ${inputType === "sketch" ? "sketch" : "object"} as a detailed 3D object. Include: shape, style, colors, materials, and key features. Format it as a prompt suitable for 3D model generation.`;

    parts.push(
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/png",
          data: inputData.split(",")[1] || inputData, // Remove data URL prefix if present
        },
      }
    );
  }

  // Retry logic for handling overloaded API
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying Gemini API after ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await model.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a 503 (overloaded) or other retryable error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes("503") ||
                         errorMessage.includes("overloaded") ||
                         errorMessage.includes("429") || // Rate limit
                         errorMessage.includes("500"); // Server error

      if (!isRetryable || attempt === maxRetries - 1) {
        // If not retryable or last attempt, throw or use fallback
        if (inputType === "text") {
          // For text input, we can use the input directly as a fallback
          console.warn("Gemini API failed, using input as fallback description");
          return `A detailed 3D model of ${inputData}. Realistic materials, proper proportions, suitable for AR display.`;
        }
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to generate description with Gemini");
}

// ============================================================================
// fal.ai Client
// ============================================================================

/**
 * Configure fal.ai client
 */
export function configureFal() {
  if (!process.env.FAL_KEY) {
    throw new Error("Missing FAL_KEY environment variable");
  }
  
  fal.config({
    credentials: process.env.FAL_KEY,
  });
}

/**
 * Generate environment texture with fal.ai
 */
export async function generateEnvironmentWithFal(prompt: string): Promise<string> {
  configureFal();

  // Construct the full prompt that will be sent to fal.ai
  // For landmarks, keep it clean and direct. For scenes, add panorama context.
  const isLandmark = prompt.includes("world famous landmark") || prompt.includes("famous landmark");
  
  const fullPrompt = isLandmark 
    ? `${prompt}, photorealistic 360-degree panorama`  // Landmark-first format
    : `Photorealistic 360° equirectangular panorama: ${prompt}`;  // Scene format

  // ============================================================================
  // DETAILED FAL.AI PROMPT LOGGING
  // ============================================================================
  console.log("\n\n" + "█".repeat(80));
  console.log("█" + " ".repeat(78) + "█");
  console.log("█" + " ".repeat(20) + "🎨 FAL.AI PROMPT - THIS IS WHAT FAL.AI RECEIVES" + " ".repeat(11) + "█");
  console.log("█" + " ".repeat(78) + "█");
  console.log("█".repeat(80));
  console.log("\n📝 Base Prompt Length:", prompt.length, "characters");
  console.log("📝 Full Prompt Length:", fullPrompt.length, "characters");
  console.log("\n" + "▼".repeat(80));
  console.log("EXACT PROMPT SENT TO FAL.AI (COPY THIS TO SEE WHAT FAL RECEIVES):");
  console.log("▼".repeat(80));
  console.log(fullPrompt);
  console.log("▲".repeat(80));
  console.log("\n⚙️  FAL.AI MODEL SETTINGS:");
  console.log("   - Model: fal-ai/flux/dev");
  console.log("   - Image Size: landscape_16_9");
  console.log("   - Inference Steps: 28");
  console.log("   - Guidance Scale: 3.5");
  console.log("█".repeat(80) + "\n\n");
  // ============================================================================

  // Use FLUX for high-quality environment generation
  try {
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 28,
        guidance_scale: 3.5,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("🎨 Fal AI is generating the environment...");
        }
      },
    });

    // Check if we got a valid result
    if (!result || typeof result !== 'object') {
      console.error("❌ Invalid result from Fal AI:", result);
      throw new Error("Fal AI returned invalid result");
    }

    const resultObj = result as { images?: Array<{ url: string }> };
    
    if (!resultObj.images || resultObj.images.length === 0) {
      console.error("❌ No images in Fal AI result:", result);
      throw new Error("Fal AI did not generate any images");
    }

    const imageUrl = resultObj.images[0].url;
    
    if (!imageUrl) {
      console.error("❌ No URL in first image:", resultObj.images[0]);
      throw new Error("Fal AI image has no URL");
    }

    console.log("✅ Environment generated successfully:", imageUrl);
    return imageUrl;
  } catch (error) {
    console.error("❌ FAL.AI GENERATION FAILED:");
    console.error("Error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

/**
 * Generate 3D model with fal.ai
 */
export async function generate3DModelWithFal(prompt: string): Promise<string> {
  configureFal();
  
  // Use fal.ai's 3D generation model
  // Note: Check fal.ai documentation for the latest 3D model endpoints
  try {
    const result = await fal.subscribe("fal-ai/stable-diffusion-v35-large", {
      input: {
        prompt: `3D model render: ${prompt}. Clean background, centered, high quality`,
        image_size: "square",
        num_inference_steps: 28,
      },
      logs: true,
    });
    
    return (result as { images: Array<{ url: string }> }).images[0].url;
  } catch (error) {
    console.error("3D generation error, falling back to 2D:", error);
    // Fallback to 2D image generation
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: `${prompt}. Isometric view, clean white background, 3D render style`,
        image_size: "square",
        num_inference_steps: 28,
      },
      logs: true,
    });
    
    return (result as { images: Array<{ url: string }> }).images[0].url;
  }
}

// ============================================================================
// Groq Client
// ============================================================================

/**
 * Initialize Groq client for fast LLM inference
 */
export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable");
  }
  
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

/**
 * Generate music prompt based on scene analysis
 */
export async function generateMusicPromptWithGroq(
  environmentType: string,
  mood: string,
  objectCount: number
): Promise<string> {
  const groq = getGroqClient();
  
  const prompt = `Generate a music prompt for an AI composer based on this scene:
- Environment: ${environmentType}
- Mood: ${mood}
- Number of objects: ${objectCount}

Create a concise prompt (2-3 sentences) describing the ideal background music. Include genre, instruments, tempo, and atmosphere.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a music director helping compose soundtracks for AR experiences.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content || "";
}

// ============================================================================
// ElevenLabs Client
// ============================================================================

/**
 * Generate music with ElevenLabs
 */
export async function generateMusicWithElevenLabs(prompt: string): Promise<ArrayBuffer> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY environment variable");
  }
  
  // Use ElevenLabs Sound Generation API
  const response = await fetchWithRetry("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: 30,
      prompt_influence: 0.7,
    }),
  }, { timeoutMs: 60_000, retries: 2 });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  return response.arrayBuffer();
}

// ============================================================================
// JigsawStack Client
// ============================================================================

/**
 * Search for images and information about a landmark using JigsawStack
 */
export async function searchLandmarkWithJigsawStack(landmarkName: string, location?: string): Promise<{
  images: string[];
  details: {
    title: string;
    description: string;
    source: string;
    url: string;
  }[];
}> {
  if (!process.env.JIGSAWSTACK_API_KEY) {
    console.warn("JigsawStack API key not configured, skipping landmark search");
    return { images: [], details: [] };
  }

  try {
    const searchQuery = location ? `${landmarkName} ${location}` : landmarkName;

    // Use JigsawStack's web scraping API to find images and details
    const response = await fetchWithRetry("https://api.jigsawstack.com/v1/web/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.JIGSAWSTACK_API_KEY,
      },
      body: JSON.stringify({
        query: searchQuery,
        search_type: "images_and_content",
        max_results: 10,
      }),
    }, { timeoutMs: 30_000, retries: 2 });

    if (!response.ok) {
      console.error("JigsawStack API error:", response.statusText);
      return { images: [], details: [] };
    }

    const data = await response.json();

    return {
      images: data.images?.map((img: { url: string }) => img.url) || [],
      details: data.results?.map((result: { title: string; snippet: string; link: string }) => ({
        title: result.title,
        description: result.snippet,
        source: new URL(result.link).hostname,
        url: result.link,
      })) || [],
    };
  } catch (error) {
    console.error("JigsawStack error:", error);
    return { images: [], details: [] };
  }
}

// ============================================================================
// Exa AI Client
// ============================================================================

/**
 * Search for contextual information about a landmark using Exa AI
 */
export async function searchLandmarkContextWithExa(landmarkName: string, location?: string): Promise<{
  context: string;
  relatedPlaces: string[];
  historicalInfo: string;
  architecturalDetails: string;
  sources: { title: string; url: string; excerpt: string }[];
}> {
  if (!process.env.EXA_API_KEY) {
    console.warn("Exa API key not configured, skipping contextual search");
    return {
      context: "",
      relatedPlaces: [],
      historicalInfo: "",
      architecturalDetails: "",
      sources: [],
    };
  }

  try {
    const searchQuery = location
      ? `${landmarkName} ${location} architecture history features nearby attractions`
      : `${landmarkName} architecture history features nearby attractions`;

    // Use Exa's neural search API for high-quality contextual results
    const response = await fetchWithRetry("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXA_API_KEY,
      },
      body: JSON.stringify({
        query: searchQuery,
        num_results: 5,
        use_autoprompt: true,
        type: "neural",
        contents: {
          text: { max_characters: 1000 },
        },
      }),
    }, { timeoutMs: 30_000, retries: 2 });

    if (!response.ok) {
      console.error("Exa AI API error:", response.statusText);
      return {
        context: "",
        relatedPlaces: [],
        historicalInfo: "",
        architecturalDetails: "",
        sources: [],
      };
    }

    const data = await response.json();

    // Extract relevant information from results
    const sources = data.results?.map((result: {
      title: string;
      url: string;
      text?: string;
    }) => ({
      title: result.title,
      url: result.url,
      excerpt: result.text || "",
    })) || [];

    // Combine excerpts to create comprehensive context
    const fullContext = sources.map((s: { excerpt: string }) => s.excerpt).join("\n\n");

    return {
      context: fullContext,
      relatedPlaces: extractPlaces(fullContext),
      historicalInfo: extractHistoricalInfo(fullContext),
      architecturalDetails: extractArchitecturalDetails(fullContext),
      sources,
    };
  } catch (error) {
    console.error("Exa AI error:", error);
    return {
      context: "",
      relatedPlaces: [],
      historicalInfo: "",
      architecturalDetails: "",
      sources: [],
    };
  }
}

/**
 * Helper: Extract place names from context
 */
function extractPlaces(context: string): string[] {
  // Simple extraction - could be enhanced with NLP
  const placeKeywords = ["near", "nearby", "adjacent", "next to", "close to"];
  const places: string[] = [];

  placeKeywords.forEach(keyword => {
    const regex = new RegExp(`${keyword}\\s+([A-Z][a-zA-Z\\s]+?)(?:[,.]|$)`, "g");
    const matches = context.matchAll(regex);
    for (const match of matches) {
      if (match[1]) places.push(match[1].trim());
    }
  });

  return [...new Set(places)].slice(0, 5);
}

/**
 * Helper: Extract historical information
 */
function extractHistoricalInfo(context: string): string {
  const sentences = context.split(/[.!?]+/);
  const historical = sentences.filter(s =>
    s.match(/\b(built|constructed|established|founded|created|century|year|historic|heritage)\b/i)
  );
  return historical.slice(0, 3).join(". ") + ".";
}

/**
 * Helper: Extract architectural details
 */
function extractArchitecturalDetails(context: string): string {
  const sentences = context.split(/[.!?]+/);
  const architectural = sentences.filter(s =>
    s.match(/\b(architecture|design|structure|style|facade|tower|dome|column|arch|material|stone|marble)\b/i)
  );
  return architectural.slice(0, 3).join(". ") + ".";
}

// ============================================================================
// Mem0 Client
// ============================================================================

/**
 * Store user preference in Mem0
 */
export async function storeMemory(userId: string, memory: string) {
  if (!process.env.MEM0_API_KEY) {
    console.warn("Mem0 API key not configured, skipping memory storage");
    return;
  }
  
  try {
    const response = await fetchWithRetry("https://api.mem0.ai/v1/memories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MEM0_API_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        messages: [{ role: "user", content: memory }],
      }),
    }, { timeoutMs: 30_000, retries: 2 });

    if (!response.ok) {
      console.error("Failed to store memory:", response.statusText);
    }
  } catch (error) {
    console.error("Mem0 error:", error);
  }
}

/**
 * Retrieve user memories from Mem0
 */
export async function retrieveMemories(userId: string): Promise<string[]> {
  if (!process.env.MEM0_API_KEY) {
    return [];
  }
  
  try {
    const response = await fetchWithRetry(`https://api.mem0.ai/v1/memories?user_id=${userId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.MEM0_API_KEY}`,
      },
    }, { timeoutMs: 30_000, retries: 2 });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.memories?.map((m: { memory: string }) => m.memory) || [];
  } catch (error) {
    console.error("Mem0 error:", error);
    return [];
  }
}

