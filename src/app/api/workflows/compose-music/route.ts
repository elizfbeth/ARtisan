import { NextRequest, NextResponse } from "next/server";
import { executeMusicComposition } from "@/lib/workflows/composeMusic";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Music Composition Workflow API Route
 * 
 * Creates adaptive AI-generated soundtrack for the AR scene:
 * - Analyzes scene state with Groq
 * - Generates music with ElevenLabs
 * - Updates scene audio in Convex
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneId, environmentType, mood, objectCount } = body;

    if (!sceneId) {
      return NextResponse.json(
        { error: "Scene ID is required" },
        { status: 400 }
      );
    }

    console.log("Starting music composition workflow:", sceneId);

    // Get scene data if not provided
    let finalEnvironmentType = environmentType;
    let finalMood = mood;
    let finalObjectCount = objectCount;

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
    }

    // Execute the music composition workflow
    const result = await executeMusicComposition({
      sceneId,
      environmentType: finalEnvironmentType,
      mood: finalMood,
      objectCount: finalObjectCount,
    });

    console.log("Music composition complete:", result);

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
    console.error("Music composition workflow error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Workflow failed",
      },
      { status: 500 }
    );
  }
}

