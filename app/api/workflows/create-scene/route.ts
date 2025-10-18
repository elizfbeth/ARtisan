import { NextRequest, NextResponse } from "next/server";
import { executeSceneCreation } from "@/lib/workflows/createScene";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

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
  try {
    const body = await request.json();
    const { sceneId, photoUrl } = body;

    if (!sceneId || !photoUrl) {
      return NextResponse.json(
        { error: "Scene ID and photo URL are required" },
        { status: 400 }
      );
    }

    console.log("Starting scene creation workflow:", sceneId);

    // Update scene status to analyzing
    await convex.mutation(api.scenes.updateStatus, {
      sceneId,
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
      sceneId,
      analysis: result.analysis,
    });

    // Update Convex with environment texture
    await convex.mutation(api.scenes.updateEnvironment, {
      sceneId,
      environmentTextureUrl: result.environmentTextureUrl,
      environmentStoragePath: result.environmentStoragePath,
      environmentType: result.environmentType,
    });

    // Optionally trigger music generation for the scene
    try {
      await convex.action(api.workflows.composeMusicWorkflow, {
        sceneId,
      });
    } catch (error) {
      console.error("Music generation failed (non-critical):", error);
      // Don't fail the whole workflow if music generation fails
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Scene creation workflow error:", error);

    // Update scene status to error if we have a sceneId
    try {
      const body = await request.clone().json();
      if (body.sceneId) {
        await convex.mutation(api.scenes.updateStatus, {
          sceneId: body.sceneId,
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

