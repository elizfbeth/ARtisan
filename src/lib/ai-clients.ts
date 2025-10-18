import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fal from "@fal-ai/serverless-client";
import Groq from "groq-sdk";

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
  
  // Fetch the image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString("base64");
  
  const prompt = `Analyze this image in detail. Provide a JSON response with:
1. environmentType: The type of environment (e.g., "beach", "forest", "city", "indoor room")
2. keyObjects: Array of main objects visible in the scene
3. depthPerspective: Description of depth and perspective
4. colorPalette: Array of dominant colors (hex codes)
5. mood: The overall mood/atmosphere (e.g., "calm", "energetic", "mysterious")

Return only valid JSON, no additional text.`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      },
    },
  ]);

  const response = await result.response;
  const text = response.text();
  
  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response as JSON");
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate a description for 3D object synthesis
 */
export async function describeObjectWithGemini(
  inputType: "sketch" | "text" | "photo",
  inputData: string
): Promise<string> {
  const model = getGeminiClient();
  
  if (inputType === "text") {
    const prompt = `Convert this description into a detailed 3D object prompt suitable for 3D model generation. Include: shape, style, colors, materials, and key features. Keep it concise but descriptive.\n\nInput: ${inputData}\n\nDetailed 3D prompt:`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } else {
    // For sketch or photo - use multimodal input
    const prompt = `Describe this ${inputType === "sketch" ? "sketch" : "object"} as a detailed 3D object. Include: shape, style, colors, materials, and key features. Format it as a prompt suitable for 3D model generation.`;
    
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/png",
          data: inputData.split(",")[1] || inputData, // Remove data URL prefix if present
        },
      },
    ]);
    
    const response = await result.response;
    return response.text();
  }
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
 * Generate realistic ambient sound prompt based on scene analysis
 */
export async function generateAudioPromptWithGroq(
  environmentType: string,
  mood: string,
  objectCount: number,
  objects?: string[]
): Promise<string> {
  const groq = getGroqClient();
  
  const objectList = objects && objects.length > 0 
    ? `\n- Objects in scene: ${objects.join(", ")}`
    : "";
  
  const prompt = `Generate a realistic ambient sound prompt for an AI sound generator based on this scene:
- Environment: ${environmentType}
- Mood: ${mood}
- Number of objects: ${objectCount}${objectList}

Create a concise prompt (2-3 sentences) describing the realistic ambient sounds that would be heard in this scene. Focus on:
1. Environmental sounds (wind, water, nature, city sounds, etc.)
2. Object-specific sounds if relevant (e.g., if there's a fountain, include water sounds; if there's traffic, include car sounds)
3. Atmospheric layers that create immersion

Do NOT include any musical elements, instruments, tempo, or melody. Only describe natural, realistic sound effects.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a sound designer creating realistic ambient soundscapes for AR experiences. Focus on natural environmental sounds and sound effects, never music.",
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

/**
 * Generate chat response with scene context using Groq
 */
export async function generateChatResponse(
  userMessage: string,
  sceneContext?: {
    environmentType?: string;
    mood?: string;
    locationName?: string;
    objects: Array<{ name: string }>;
  },
  history?: Array<{ role: string; content: string }>
): Promise<string> {
  const groq = getGroqClient();

  // Build context-aware system prompt
  let systemPrompt = "You are a helpful AR scene assistant. You help users understand and interact with their 3D AR environments.";

  if (sceneContext) {
    systemPrompt += `\n\nCurrent Scene Context:`;
    if (sceneContext.environmentType) {
      systemPrompt += `\n- Environment: ${sceneContext.environmentType}`;
    }
    if (sceneContext.mood) {
      systemPrompt += `\n- Mood: ${sceneContext.mood}`;
    }
    if (sceneContext.locationName) {
      systemPrompt += `\n- Location: ${sceneContext.locationName}`;
    }
    if (sceneContext.objects.length > 0) {
      systemPrompt += `\n- Objects: ${sceneContext.objects.map((o) => o.name).join(", ")}`;
    }
  }

  systemPrompt += "\n\nYou can help with:\n- Information about the scene and its elements\n- How to interact with objects (press G to move, R to rotate, S to scale, X to delete)\n- Camera controls (Tab to switch modes, WASD to move)\n- Historical or contextual information about locations\n- Creative suggestions for enhancing the scene";

  // Build messages array
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add history
  if (history && history.length > 0) {
    history.forEach((msg) => {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    });
  }

  // Add current message
  messages.push({ role: "user", content: userMessage });

  const completion = await groq.chat.completions.create({
    messages,
    model: "llama-3.3-70b-versatile",
    temperature: 0.8,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || "I'm not sure how to respond to that.";
}

// ============================================================================
// ElevenLabs Client
// ============================================================================

/**
 * Generate realistic ambient audio with ElevenLabs Sound Generation API
 * Note: This API is designed for sound effects and ambient sounds, NOT music
 * 
 * API Documentation: https://elevenlabs.io/docs/api-reference/sound-generation
 * 
 * IMPORTANT: Verify the correct endpoint and parameters with ElevenLabs documentation.
 * The sound-generation endpoint may require specific API access or different parameters.
 */
export async function generateAudioWithElevenLabs(prompt: string): Promise<ArrayBuffer> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY environment variable");
  }
  
  // Validate prompt length (ElevenLabs has limits - typically 1000 chars)
  const truncatedPrompt = prompt.length > 1000 ? prompt.slice(0, 1000) : prompt;
  
  // Construct request body for ElevenLabs Sound Generation API
  // Based on ElevenLabs API v1 specification
  const requestBody = {
    text: truncatedPrompt,
    duration_seconds: 22, // ElevenLabs supports durations between 0.5 and 22 seconds
    prompt_influence: 0.3, // Range: 0.0 to 1.0 (lower = more realistic, higher = more creative)
  };
  
  console.log("ElevenLabs API request:", { 
    endpoint: "sound-generation",
    promptLength: truncatedPrompt.length,
    duration: 22,
    promptInfluence: 0.3,
  });
  
  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // Read error response for debugging
    const errorText = await response.text();
    console.error("ElevenLabs API error response:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
      requestBody,
    });
    
    // Provide helpful error message based on status code
    let errorMessage = `ElevenLabs API error: ${response.status} ${response.statusText}`;
    if (response.status === 400) {
      errorMessage += " - Check if your API key has access to the Sound Generation endpoint and verify the request parameters.";
    } else if (response.status === 401) {
      errorMessage += " - Invalid API key. Please check your ELEVENLABS_API_KEY environment variable.";
    } else if (response.status === 404) {
      errorMessage += " - The sound-generation endpoint may not be available. Check ElevenLabs API documentation for the correct endpoint.";
    } else if (response.status === 429) {
      errorMessage += " - Rate limit exceeded. Please try again later.";
    }
    
    throw new Error(errorMessage);
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
    const response = await fetch("https://api.mem0.ai/v1/memories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MEM0_API_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        messages: [{ role: "user", content: memory }],
      }),
    });

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
    const response = await fetch(`https://api.mem0.ai/v1/memories?user_id=${userId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.MEM0_API_KEY}`,
      },
    });

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

