import { NextRequest, NextResponse } from "next/server";
import { executeSceneAudioGeneration } from "@/lib/workflows/generateSceneAudio";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Scene Audio Generation Workflow API Route
 * 
 * Creates realistic ambient soundscapes for AR scenes:
 * - Analyzes scene state with Groq
 * - Generates realistic ambient audio with ElevenLabs
 * - Updates scene audio in Convex
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneId, environmentType, mood, objectCount, objects } = body;

    if (!sceneId) {
      return NextResponse.json(
        { error: "Scene ID is required" },
        { status: 400 }
      );
    }

    console.log("Starting scene audio generation workflow:", sceneId);

    // Get scene data if not provided
    let finalEnvironmentType = environmentType;
    let finalMood = mood;
    let finalObjectCount = objectCount;
    let finalObjects = objects;

    if (!environmentType || !mood) {
      const scene = await convex.query(api.scenes.getScene, {
        sceneId,
      });

      if (!scene) {
        return NextResponse.json(
          { error: "Scene not found" },
          { status: 404 }
        );
      }

      finalEnvironmentType = scene.analysis?.environmentType || "ambient";
      finalMood = scene.analysis?.mood || "calm";
      finalObjectCount = scene.objects.length || 0;
      finalObjects = scene.objects || [];
    }

    // Execute the scene audio generation workflow
    const result = await executeSceneAudioGeneration({
      sceneId,
      environmentType: finalEnvironmentType,
      mood: finalMood,
      objectCount: finalObjectCount,
      objects: finalObjects,
    });

    console.log("Scene audio generation complete:", result);

    // Update scene audio in Convex
    await convex.mutation(api.scenes.updateAudio, {
      sceneId,
      audioUrl: result.audioUrl,
      audioStoragePath: result.audioStoragePath,
      audioMood: result.audioMood,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Scene audio generation workflow error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Workflow failed",
      },
      { status: 500 }
    );
  }
}
