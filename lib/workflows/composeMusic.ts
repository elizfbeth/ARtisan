import {
  generateMusicPromptWithGroq,
  generateMusicWithElevenLabs,
} from "../ai-clients";
import { uploadFile } from "../supabase";

/**
 * Music Composition Workflow
 * 
 * Creates an adaptive AI-generated soundtrack for the AR scene:
 * 1. Analyze scene state with Groq
 * 2. Generate music prompt based on environment and objects
 * 3. Create soundtrack with ElevenLabs
 * 4. Store audio in Supabase
 * 
 * The music dynamically reflects the current state of the AR experience
 */

export interface MusicCompositionInput {
  sceneId: string;
  environmentType: string;
  mood: string;
  objectCount: number;
}

export interface MusicCompositionResult {
  audioUrl: string;
  audioStoragePath: string;
  audioMood: string;
  musicPrompt: string;
}

/**
 * Execute the music composition workflow
 */
export async function executeMusicComposition(
  input: MusicCompositionInput
): Promise<MusicCompositionResult> {
  console.log("Starting music composition workflow for scene:", input.sceneId);
  
  // Step 1: Generate music prompt with Groq
  console.log("Step 1: Generating music prompt with Groq...");
  const musicPrompt = await generateMusicPromptWithGroq(
    input.environmentType,
    input.mood,
    input.objectCount
  );
  console.log("Music prompt generated:", musicPrompt);
  
  // Step 2: Generate music with ElevenLabs
  console.log("Step 2: Generating music with ElevenLabs...");
  const audioBuffer = await generateMusicWithElevenLabs(musicPrompt);
  console.log("Music generated, size:", audioBuffer.byteLength, "bytes");
  
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
    musicPrompt,
  };
}

/**
 * Determine when music should be regenerated
 */
export function shouldRegenerateMusic(
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
 * Generate a music prompt template based on scene characteristics
 */
export function createMusicPromptTemplate(
  environmentType: string,
  mood: string,
  objectCount: number
): string {
  // Map environment types to musical characteristics
  const environmentMap: Record<string, string> = {
    beach: "tropical, relaxing with ocean sounds and steel drums",
    forest: "natural, ambient with acoustic guitar and nature sounds",
    city: "urban, electronic with synth pads and rhythmic elements",
    mountain: "epic, orchestral with strings and atmospheric pads",
    desert: "minimal, ethereal with ethnic instruments",
    indoor: "intimate, cozy with piano and soft strings",
    default: "ambient, atmospheric with gentle melodies",
  };
  
  // Map moods to musical characteristics
  const moodMap: Record<string, string> = {
    calm: "slow tempo, peaceful, soothing harmonies",
    energetic: "upbeat tempo, dynamic, vibrant rhythms",
    mysterious: "minor key, suspenseful, evolving textures",
    joyful: "major key, cheerful, bright melodies",
    melancholic: "slow, contemplative, emotional depth",
    default: "moderate tempo, balanced, harmonic",
  };
  
  const envStyle = environmentMap[environmentType.toLowerCase()] || environmentMap.default;
  const moodStyle = moodMap[mood.toLowerCase()] || moodMap.default;
  
  // Adjust complexity based on object count
  const complexity = objectCount > 5 
    ? "rich, layered composition with multiple instruments"
    : objectCount > 2
    ? "moderate complexity with a few complementary instruments"
    : "simple, minimalist arrangement";
  
  return `Create a ${moodStyle} music track with a ${envStyle} style. ${complexity}. 30 seconds, seamlessly loopable.`;
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

