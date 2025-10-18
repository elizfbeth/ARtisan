import { NextRequest, NextResponse } from "next/server";
import {
  executeObjectSynthesis,
  validateObjectInput,
} from "@/lib/workflows/synthesizeObject";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Object Synthesis Workflow API Route (Doodle to Life)
 * 
 * Transforms user input into a 3D object in the AR scene:
 * - Accepts sketch, text, or photo input
 * - Processes with Gemini and fal.ai
 * - Adds object to scene in Convex
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneId, inputType, inputData, inputName } = body;

    // Validate input
    const validation = validateObjectInput({
      sceneId,
      inputType,
      inputData,
      inputName,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    console.log("Starting object synthesis workflow:", { sceneId, inputType });

    // Execute the object synthesis workflow
    const result = await executeObjectSynthesis({
      sceneId,
      inputType,
      inputData,
      inputName,
    });

    console.log("Object synthesis complete:", result);

    // Add object to scene in Convex
    await convex.mutation(api.scenes.addObject, {
      sceneId,
      object: {
        id: result.objectId,
        name: result.name,
        modelUrl: result.modelUrl,
        storagePath: result.storagePath,
        position: result.position,
        rotation: result.rotation,
        scale: result.scale,
        createdAt: Date.now(),
      },
    });

    // Check if we should regenerate music
    const scene = await convex.query(api.scenes.getScene, {
      sceneId,
    });

    if (scene && scene.objects.length % 3 === 0 && scene.objects.length > 0) {
      // Regenerate music after every 3 objects
      console.log("Triggering music regeneration...");
      try {
        await convex.action(api.workflows.composeMusicWorkflow, {
          sceneId,
        });
      } catch (error) {
        console.error("Music regeneration failed (non-critical):", error);
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Object synthesis workflow error:", error);

    // Provide user-friendly error messages based on the error type
    const errorMessage = error instanceof Error ? error.message : "Workflow failed";
    let userMessage = errorMessage;
    let statusCode = 500;

    // Check for specific error types
    if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
      userMessage = "The AI service is temporarily overloaded. Please try again in a few moments.";
      statusCode = 503;
    } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      userMessage = "Rate limit exceeded. Please wait a moment before trying again.";
      statusCode = 429;
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      userMessage = "The request timed out. Please check your connection and try again.";
      statusCode = 504;
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch failed")) {
      userMessage = "Network error. Please check your connection and try again.";
      statusCode = 503;
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: errorMessage, // Include technical details for debugging
      },
      { status: statusCode }
    );
  }
}

