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

    // Get current scene to pass existing objects for positioning
    const scene = await convex.query(api.scenes.getScene, { sceneId });
    const existingObjects = scene?.objects.map(obj => ({
      position: obj.position,
      scale: obj.scale,
    })) || [];

    // Execute the object synthesis workflow
    const result = await executeObjectSynthesis({
      sceneId,
      inputType,
      inputData,
      inputName,
      existingObjects,
    });

    console.log("Object synthesis complete:", result);

    // Add object to scene in Convex
    await convex.mutation(api.scenes.addObject, {
      sceneId,
      object: {
        id: result.objectId,
        name: result.name,
        modelUrl: result.modelUrl,
        modelType: result.modelType,
        storagePath: result.storagePath,
        position: result.position,
        rotation: result.rotation,
        scale: result.scale,
        createdAt: Date.now(),
      },
    });

    // Check if we should regenerate music
    const updatedScene = await convex.query(api.scenes.getScene, {
      sceneId,
    });

    if (updatedScene && updatedScene.objects.length % 3 === 0 && updatedScene.objects.length > 0) {
      // Regenerate scene audio after every 3 objects
      console.log("Triggering scene audio regeneration...");
      try {
        await convex.action(api.workflows.generateSceneAudioWorkflow, {
          sceneId,
        });
      } catch (error) {
        console.error("Scene audio regeneration failed (non-critical):", error);
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Object synthesis workflow error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Workflow failed",
      },
      { status: 500 }
    );
  }
}

