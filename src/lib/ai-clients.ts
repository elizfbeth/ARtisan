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
  
  const prompt = `Analyze this image in detail. Provide a JSON response with:
1. environmentType: The type of environment (e.g., "beach", "forest", "city", "indoor room")
2. keyObjects: Array of main objects visible in the scene
3. depthPerspective: Description of depth and perspective
4. colorPalette: Array of dominant colors (hex codes)
5. mood: The overall mood/atmosphere (e.g., "calm", "energetic", "mysterious")

Return only valid JSON, no additional text.`;

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
  
  // Use FLUX for high-quality environment generation
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt: `360 degree panoramic environment: ${prompt}. Seamless, immersive, high detail, photorealistic`,
      image_size: "landscape_16_9",
      num_inference_steps: 28,
      guidance_scale: 3.5,
    },
    logs: true,
  });
  
  // Return the generated image URL
  return (result as { images: Array<{ url: string }> }).images[0].url;
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

