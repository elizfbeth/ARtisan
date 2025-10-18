import { NextRequest, NextResponse } from "next/server";
import { executeEnhancedSceneCreation } from "@/lib/workflows/enhancedSceneCreation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import "@/lib/http-init"; // initialize IPv4-first DNS order
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Enhanced Scene Creation Workflow API Route
 *
 * This route handles landmark-aware 3D world generation:
 * - Detects if the photo contains a landmark
 * - Uses JigsawStack and Exa AI to gather additional context
 * - Caches landmark data in Convex for faster future processing
 * - Generates immersive 3D environments with accurate details
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

    console.log("Starting enhanced scene creation workflow:", sceneId);

    // Check if this is a temp ID (from timeout fallback)
    const isTempId = sceneId.startsWith("temp_");

    if (isTempId) {
      console.log("⚠️  Using temporary ID - skipping Convex updates until scene is created");
    }

    // Update scene status to analyzing (only if not temp ID)
    if (!isTempId) {
      try {
        await Promise.race([
          convex.mutation(api.scenes.updateStatus, {
            sceneId: sceneId as Id<"scenes">,
            status: "analyzing",
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Convex mutation timeout")), 20000)
          )
        ]);
      } catch (error) {
        console.warn("Failed to update status to analyzing:", error);
        // Continue anyway - status update is non-critical
      }
    }

    // Execute the enhanced scene creation workflow
    console.log("Executing enhanced scene creation...");
    let result;
    try {
      result = await executeEnhancedSceneCreation({
        photoUrl,
        sceneId,
      });
      console.log("Enhanced scene creation complete:", result);
    } catch (workflowError) {
      console.error("Enhanced scene creation failed:", workflowError);
      throw workflowError;
    }

    // If landmark data was gathered, cache it in Convex
    if (result.landmarkData) {
      try {
        await convex.mutation(api.landmarkCache.cacheLandmark, {
          name: result.landmarkData.name,
          location: result.landmarkData.location,
          additionalImages: result.landmarkData.additionalImages,
          historicalInfo: result.landmarkData.historicalInfo,
          architecturalDetails: result.landmarkData.architecturalDetails,
          relatedPlaces: result.landmarkData.relatedPlaces,
          sources: result.landmarkData.sources,
        });
        console.log("Landmark data cached in Convex");
      } catch (cacheError) {
        console.error("Failed to cache landmark data:", cacheError);
        // Don't fail the whole workflow if caching fails
      }
    }

    // Update Convex with analysis results (only if not temp ID)
    if (!isTempId) {
      try {
        await Promise.race([
          convex.mutation(api.scenes.updateAnalysis, {
            sceneId: sceneId as Id<"scenes">,
            analysis: result.analysis,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Convex mutation timeout")), 20000)
          )
        ]);
        console.log("Analysis updated in Convex");
      } catch (error) {
        console.error("Failed to update analysis:", error);
        // Continue anyway - we'll retry environment update
      }

      // Update Convex with environment texture (with timeout and retry)
      try {
        await Promise.race([
          convex.mutation(api.scenes.updateEnvironment, {
            sceneId: sceneId as Id<"scenes">,
            environmentTextureUrl: result.environmentTextureUrl,
            environmentStoragePath: result.environmentStoragePath,
            environmentType: result.environmentType,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Convex mutation timeout")), 20000)
          )
        ]);
        console.log("Environment updated in Convex");
      } catch (error) {
        console.error("Failed to update environment, retrying...", error);

        // Retry once with longer timeout
        try {
          await Promise.race([
            convex.mutation(api.scenes.updateEnvironment, {
              sceneId: sceneId as Id<"scenes">,
              environmentTextureUrl: result.environmentTextureUrl,
              environmentStoragePath: result.environmentStoragePath,
              environmentType: result.environmentType,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Convex mutation timeout on retry")), 40000)
            )
          ]);
          console.log("Environment updated in Convex on retry");
        } catch (retryError) {
          console.error("Failed to update environment after retry:", retryError);
          // At this point, we've generated the scene but failed to save it to Convex
          // This is a critical error
          throw new Error("Failed to save scene to database after multiple attempts");
        }
      }
    } else {
      console.log("⚠️  Skipping Convex updates (temp ID) - upload route will handle creation");
    }

    // Optionally trigger music generation for the scene
    // We call the API route directly instead of going through Convex to avoid
    // environment variable issues with Convex actions
    try {
      const musicResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workflows/compose-music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: sceneId,
          environmentType: result.analysis.environmentType,
          mood: result.analysis.mood,
          objectCount: 0, // No objects yet
        }),
      });

      if (!musicResponse.ok) {
        console.error("Music generation failed:", musicResponse.statusText);
      } else {
        console.log("Music generation triggered successfully");
      }
    } catch (error) {
      console.error("Music generation failed (non-critical):", error);
      // Don't fail the whole workflow if music generation fails
    }

    // Debug logging for analysis data
    console.log("\n" + "=".repeat(80));
    console.log("📊 SCENE ANALYSIS DATA BEING RETURNED:");
    console.log("=".repeat(80));
    console.log("Environment Type:", result.analysis.environmentType);
    console.log("Mood:", result.analysis.mood);
    console.log("Key Objects:", result.analysis.keyObjects?.length || 0, "items");
    console.log("Is Landmark:", result.analysis.isLandmark);
    console.log("Landmark Name:", result.analysis.landmarkName);
    console.log("Has Architecture Details:", !!result.analysis.architecture);
    console.log("Has Lighting Details:", !!result.analysis.lightingConditions);
    console.log("=".repeat(80) + "\n");

    // Return in the format expected by the upload route
    return NextResponse.json({
      success: true,
      sceneId,
      scene: {
        _id: sceneId,
        status: "ready",
        analysis: result.analysis,
        environmentTextureUrl: result.environmentTextureUrl,
        environmentStoragePath: result.environmentStoragePath,
        environmentType: result.environmentType,
        objects: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Additional enhanced data
        isLandmark: result.analysis.isLandmark,
        landmarkName: result.analysis.landmarkName,
        hasEnhancedData: !!result.landmarkData,
        locationData: result.locationData,
      },
      result: {
        ...result,
        isLandmark: result.analysis.isLandmark,
        landmarkName: result.analysis.landmarkName,
        hasEnhancedData: !!result.landmarkData,
      },
    });
  } catch (error) {
    console.error("Enhanced scene creation workflow error:", error);

    // Update scene status to error if we have a sceneId (and it's not a temp ID)
    try {
      if (body.sceneId && !body.sceneId.startsWith("temp_")) {
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
