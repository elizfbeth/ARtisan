import { NextRequest, NextResponse } from "next/server";
import { executeSceneCreation } from "@/lib/workflows/createScene";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import "@/lib/http-init"; // initialize IPv4-first DNS order
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Test Scene Creation Workflow API Route
 *
 * Temporary route for testing with improved error handling
 * Uses the standard workflow without enhanced features
 */

// Verify Convex URL is configured
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request: NextRequest) {
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
    console.log("Photo URL:", photoUrl);

    // Update scene status to analyzing with timeout
    console.log("Step 1: Updating scene status...");
    try {
      await Promise.race([
        convex.mutation(api.scenes.updateStatus, {
          sceneId: sceneId as Id<"scenes">,
          status: "analyzing",
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Status update timeout")), 15000)
        )
      ]);
      console.log("✓ Status updated successfully");
    } catch (error) {
      console.warn("⚠ Failed to update status (non-critical):", error);
    }

    // Execute the scene creation workflow
    console.log("Step 2: Executing scene creation workflow...");
    let result;
    try {
      result = await executeSceneCreation({
        photoUrl,
        sceneId,
      });
      console.log("✓ Scene creation complete");
    } catch (workflowError) {
      console.error("✗ Scene creation failed:", workflowError);
      throw workflowError;
    }

    // Update Convex in background (non-blocking)
    console.log("Step 3: Starting Convex updates in background...");

    // Fire-and-forget Convex updates (don't wait for them)
    convex.mutation(api.scenes.updateAnalysis, {
      sceneId: sceneId as Id<"scenes">,
      analysis: result.analysis,
    })
      .then(() => console.log("✓ Analysis updated in Convex (background)"))
      .catch((error) => console.error("⚠ Failed to update analysis (background):", error));

    convex.mutation(api.scenes.updateEnvironment, {
      sceneId: sceneId as Id<"scenes">,
      environmentTextureUrl: result.environmentTextureUrl,
      environmentStoragePath: result.environmentStoragePath,
      environmentType: result.environmentType,
    })
      .then(() => console.log("✓ Environment updated in Convex (background)"))
      .catch((error) => console.error("⚠ Failed to update environment (background):", error));

    convex.mutation(api.scenes.updateStatus, {
      sceneId: sceneId as Id<"scenes">,
      status: "ready",
    })
      .then(() => console.log("✓ Status set to ready (background)"))
      .catch((error) => console.error("⚠ Failed to update status (background):", error));

    console.log("Step 4: Convex updates queued (will complete in background)");

    // Skip music generation for now to speed up testing
    console.log("Step 5: Skipping music generation (test mode)");

    // Log the analysis data for debugging
    console.log("Analysis data:", JSON.stringify(result.analysis, null, 2));

    // Return complete scene data including analysis
    // Since Convex updates may be slow, include all data in the response
    return NextResponse.json({
      success: true,
      sceneId,
      scene: {
        _id: sceneId,
        photoUrl: result.analysis ? undefined : undefined, // Will be set by Convex eventually
        status: "ready",
        analysis: result.analysis || {
          environmentType: "Unknown",
          mood: "Unknown",
          keyObjects: [],
        },
        environmentTextureUrl: result.environmentTextureUrl,
        environmentStoragePath: result.environmentStoragePath,
        environmentType: result.environmentType,
        objects: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      message: "Scene created successfully! Environment and analysis data available.",
    });
  } catch (error) {
    console.error("Scene creation workflow error:", error);

    // Update scene status to error if we have a sceneId
    if (body.sceneId) {
      try {
        await Promise.race([
          convex.mutation(api.scenes.updateStatus, {
            sceneId: body.sceneId as Id<"scenes">,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Error status update timeout")), 10000)
          )
        ]);
      } catch (updateError) {
        console.error("Failed to update error status:", updateError);
      }
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
