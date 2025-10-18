import { NextRequest, NextResponse } from "next/server";
import { executeSceneCreation } from "@/lib/workflows/createScene";
import { executeSceneAudioGeneration } from "@/lib/workflows/generateSceneAudio";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Scene Creation Workflow API Route
 * 
 * Orchestrates the transformation of a photo into an AR environment:
 * - Called by Convex action after photo upload
 * - Executes Gemini analysis and fal.ai generation
 * - Updates Convex with results
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  // Parse body once and store it
  let body: { sceneId?: string; photoUrl?: string } = {};
  
  try {
    body = await request.json();
    const { sceneId, photoUrl } = body;

    if (!sceneId || !photoUrl) {
      return NextResponse.json(
        { error: "Scene ID and photo URL are required" },
        { status: 400 }
      );
    }

    console.log("Starting scene creation workflow:", sceneId);

    // Cast sceneId to proper Convex ID type
    const sceneIdTyped = sceneId as Id<"scenes">;

    // Update scene status to analyzing
    await convex.mutation(api.scenes.updateStatus, {
      sceneId: sceneIdTyped,
      status: "analyzing",
    });

    // Execute the scene creation workflow
    const result = await executeSceneCreation({
      photoUrl,
      sceneId,
    });

    console.log("Scene creation complete:", result);

    // Update Convex with analysis results
    await convex.mutation(api.scenes.updateAnalysis, {
      sceneId: sceneIdTyped,
      analysis: result.analysis,
    });

    // Update Convex with environment texture
    await convex.mutation(api.scenes.updateEnvironment, {
      sceneId: sceneIdTyped,
      environmentTextureUrl: result.environmentTextureUrl,
      environmentStoragePath: result.environmentStoragePath,
      environmentType: result.environmentType,
    });

    // Optionally trigger scene audio generation for the scene (async, non-blocking)
    // Run this in the background without blocking the response
    executeSceneAudioGeneration({
      sceneId,
      environmentType: result.analysis.environmentType,
      mood: result.analysis.mood,
      objectCount: 0, // Initial generation with no objects
      objects: [],
    })
      .then(async (audioResult) => {
        // Update Convex with audio URL
        await convex.mutation(api.scenes.updateAudio, {
          sceneId: sceneIdTyped,
          audioUrl: audioResult.audioUrl,
          audioStoragePath: audioResult.audioStoragePath,
          audioMood: audioResult.audioMood,
        });
        console.log("Scene audio generation complete:", audioResult);
      })
      .catch((error) => {
        console.error("Scene audio generation failed (non-critical):", error);
        // Don't fail the whole workflow if audio generation fails
      });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Scene creation workflow error:", error);

    // Update scene status to error if we have a sceneId
    try {
      if (body.sceneId) {
        await convex.mutation(api.scenes.updateStatus, {
          sceneId: body.sceneId as Id<"scenes">,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (updateError) {
      console.error("Failed to update error status:", updateError);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Workflow failed",
      },
      { status: 500 }
    );
  }
}

