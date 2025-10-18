import {
  generateAudioPromptWithGroq,
  generateAudioWithElevenLabs,
} from "../ai-clients";
import { uploadFile } from "../supabase";

/**
 * Scene Audio Generation Workflow
 * 
 * Creates realistic ambient soundscapes for AR scenes:
 * 1. Analyze scene state with Groq
 * 2. Generate ambient sound prompt based on environment and objects
 * 3. Create realistic audio with ElevenLabs Sound Generation API
 * 4. Store audio in Supabase
 * 
 * The audio dynamically reflects environmental sounds and object-specific audio
 */

export interface SceneAudioInput {
  sceneId: string;
  environmentType: string;
  mood: string;
  objectCount: number;
  objects?: Array<{ name: string }>;
}

export interface SceneAudioResult {
  audioUrl: string;
  audioStoragePath: string;
  audioMood: string;
  audioPrompt: string;
}

/**
 * Execute the scene audio generation workflow
 */
export async function executeSceneAudioGeneration(
  input: SceneAudioInput
): Promise<SceneAudioResult> {
  console.log("Starting scene audio generation workflow for scene:", input.sceneId);
  
  // Extract object names for sound context
  const objectNames = input.objects?.map((obj) => obj.name) || [];
  
  // Step 1: Generate audio prompt with Groq
  console.log("Step 1: Generating audio prompt with Groq...");
  const audioPrompt = await generateAudioPromptWithGroq(
    input.environmentType,
    input.mood,
    input.objectCount,
    objectNames
  );
  console.log("Audio prompt generated:", audioPrompt);
  
  // Step 2: Generate realistic ambient audio with ElevenLabs
  console.log("Step 2: Generating audio with ElevenLabs...");
  try {
    const audioBuffer = await generateAudioWithElevenLabs(audioPrompt);
    console.log("Audio generated, size:", audioBuffer.byteLength, "bytes");

    // Step 3: Upload to Supabase storage
    console.log("Step 3: Uploading to Supabase...");
    const storagePath = `scenes/${input.sceneId}/audio_${Date.now()}.mp3`;
    const { url: audioUrl, path: audioStoragePath } = await uploadFile(
      "AUDIO",
      storagePath,
      Buffer.from(audioBuffer),
      "audio/mpeg"
    );
    console.log("Upload complete:", audioUrl);

    return {
      audioUrl,
      audioStoragePath,
      audioMood: input.mood,
      audioPrompt,
    };
  } catch (error) {
    console.warn("Scene audio generation failed (non-critical):", error);

    // Return a result indicating audio generation is not available
    // This allows the app to continue without audio
    throw error; // Re-throw so the error is handled by the API route
  }
}

/**
 * Determine when audio should be regenerated
 */
export function shouldRegenerateAudio(
  currentObjectCount: number,
  previousObjectCount: number,
  timeSinceLastGeneration: number
): boolean {
  const OBJECT_THRESHOLD = 3; // Regenerate after adding 3 objects
  const TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // Regenerate if significant objects added
  if (currentObjectCount - previousObjectCount >= OBJECT_THRESHOLD) {
    return true;
  }
  
  // Regenerate if enough time has passed
  if (timeSinceLastGeneration >= TIME_THRESHOLD) {
    return true;
  }
  
  return false;
}

/**
 * Generate an audio prompt template based on scene characteristics
 */
export function createAudioPromptTemplate(
  environmentType: string,
  mood: string,
  objectCount: number,
  objects?: Array<{ name: string }>
): string {
  // Map environment types to realistic sound characteristics
  const environmentMap: Record<string, string> = {
    beach: "gentle waves crashing on shore, seagulls calling, soft wind, distant ocean sounds",
    forest: "rustling leaves, birds chirping, insects buzzing, wind through trees, occasional woodland creatures",
    city: "distant traffic, car horns, footsteps on pavement, muffled voices, urban ambience",
    mountain: "strong wind gusts, echoes, occasional bird calls, subtle rock sounds, expansive atmosphere",
    desert: "gentle wind, sand shifting, sparse ambient sounds, dry atmospheric tones",
    indoor: "subtle room tone, air conditioning hum, occasional distant sounds, intimate space ambience",
    default: "gentle ambient sounds, subtle environmental layers, peaceful atmosphere",
  };
  
  // Map moods to sound intensity and characteristics
  const moodMap: Record<string, string> = {
    calm: "soft and peaceful, quiet layers, soothing ambient tones",
    energetic: "dynamic sounds, more activity, vibrant environmental layers",
    mysterious: "subtle and enigmatic, quiet whispers, atmospheric depth",
    joyful: "bright and lively, cheerful environmental sounds, uplifting ambience",
    melancholic: "quiet and contemplative, gentle sounds, somber atmosphere",
    default: "balanced ambient sounds, natural environmental layers",
  };
  
  const envSounds = environmentMap[environmentType.toLowerCase()] || environmentMap.default;
  const moodSounds = moodMap[mood.toLowerCase()] || moodMap.default;
  
  // Add object-specific sounds
  let objectSounds = "";
  if (objects && objects.length > 0) {
    const objectSoundMap: Record<string, string> = {
      car: "engine sounds, tire on road",
      water: "flowing water, splashing",
      fountain: "water fountain, flowing and splashing",
      bird: "bird calls, wing flaps",
      dog: "dog barking, panting",
      cat: "cat meowing, purring",
      tree: "leaves rustling, branches creaking",
      wind: "wind gusts, air movement",
      fire: "crackling fire, flames",
      rain: "rainfall, water drops",
      thunder: "distant thunder rumbles",
    };
    
    const detectedSounds: string[] = [];
    objects.forEach((obj) => {
      const objNameLower = obj.name.toLowerCase();
      Object.keys(objectSoundMap).forEach((key) => {
        if (objNameLower.includes(key)) {
          detectedSounds.push(objectSoundMap[key]);
        }
      });
    });
    
    if (detectedSounds.length > 0) {
      objectSounds = ` Include: ${detectedSounds.join(", ")}.`;
    }
  }
  
  // Adjust complexity based on object count
  const complexity = objectCount > 5 
    ? "Rich, layered soundscape with multiple environmental elements"
    : objectCount > 2
    ? "Moderate ambient layers with complementary sounds"
    : "Simple, clean ambient atmosphere";
  
  return `Create realistic ambient sounds: ${envSounds}. ${moodSounds}. ${complexity}.${objectSounds} 30 seconds, seamlessly loopable.`;
}

/**
 * Create fallback silent audio or simple tone
 */
export function createFallbackAudio(): {
  type: "silent";
  duration: number;
} {
  return {
    type: "silent",
    duration: 30,
  };
}
