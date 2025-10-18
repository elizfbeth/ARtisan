import { NextRequest, NextResponse } from "next/server";
import { executeSceneCreation } from "@/lib/workflows/createScene";
import { executeSceneAudioGeneration } from "@/lib/workflows/generateSceneAudio";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import "@/lib/net"; // initialize IPv4-first DNS order
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Scene Creation Workflow API Route
 * 
 * Orchestrates AR environment creation:
 * - Photo upload → AI generation workflow
 * - Gallery template selection workflow
 * - Executes appropriate workflow and updates Convex
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  // Parse body once and store it
  let body: {
    sceneId?: string;
    photoUrl?: string;
    environmentSource?: string;
    galleryWorldId?: string;
  } = {};
  
  try {
    body = await request.json();
    const { sceneId, photoUrl, environmentSource, galleryWorldId } = body;

    // Validate based on environment source
    if (environmentSource === "gallery-template") {
      if (!galleryWorldId) {
        return NextResponse.json(
          { error: "Gallery world ID is required for template workflow" },
          { status: 400 }
        );
      }
    } else {
      // Standard photo upload workflow
      if (!photoUrl) {
        return NextResponse.json(
          { error: "Photo URL is required for generation workflow" },
          { status: 400 }
        );
      }
    }

    // Create scene if sceneId not provided (for gallery workflow)
    let sceneIdTyped: Id<"scenes">;
    
    if (sceneId) {
      sceneIdTyped = sceneId as Id<"scenes">;
    } else {
      // Create new scene
      sceneIdTyped = await convex.mutation(api.scenes.create, {
        photoUrl: photoUrl || "",
        photoStoragePath: "",
        galleryWorldId: galleryWorldId,
        gallerySource: environmentSource === "gallery-template" ? "template" : undefined,
      });
      console.log("Created new scene:", sceneIdTyped);
    }

    console.log("Starting scene creation workflow:", sceneIdTyped);

    // Update scene status to analyzing/generating
    await convex.mutation(api.scenes.updateStatus, {
      sceneId: sceneId as Id<"scenes">,
      status: "analyzing",
    });

    // Execute the scene creation workflow
    const result = await executeSceneCreation({
      photoUrl,
      sceneId: sceneIdTyped as string,
      environmentSource: environmentSource as "generate" | "gallery-template" | undefined,
      galleryWorldId,
    });

    console.log("Scene creation complete:", result);

    // Update Convex with analysis results (optional for gallery templates)
    if (result.analysis) {
      await convex.mutation(api.scenes.updateAnalysis, {
      sceneId: sceneId as Id<"scenes">,
      analysis: result.analysis,
      });
    }

    // Update Convex with environment texture and gallery data
    await convex.mutation(api.scenes.updateEnvironment, {
      sceneId: sceneId as Id<"scenes">,
      environmentTextureUrl: result.environmentTextureUrl,
      environmentStoragePath: result.environmentStoragePath,
      environmentType: result.environmentType,
      galleryWorldId: result.galleryWorldId,
    });

    // Update waypoints if provided
    if (result.waypoints) {
      await convex.mutation(api.scenes.updateWaypoints, {
        sceneId: sceneIdTyped,
        waypoints: result.waypoints,
      });
    }

    // Optionally trigger scene audio generation (only for standard workflow with analysis)
    if (result.analysis) {
      executeSceneAudioGeneration({
        sceneId: sceneIdTyped,
        environmentType: result.analysis.environmentType,
        mood: result.analysis.mood,
        objectCount: 0,
        objects: [],
      })
        .then(async (audioResult) => {
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
        });
    }

    return NextResponse.json({
      success: true,
      sceneId: sceneIdTyped,
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
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

