import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Convex Workflow Actions
 * 
 * These actions orchestrate the AI services through HTTP calls
 * to our workflow endpoints (which will call Manus AI, Gemini, fal.ai, etc.)
 */

/**
 * Trigger scene generation workflow
 * This orchestrates: Gemini analysis → fal.ai environment generation
 */
export const generateSceneWorkflow = action({
  args: {
    sceneId: v.id("scenes"),
    photoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Update status to analyzing
      await ctx.runMutation(api.scenes.updateStatus, {
        sceneId: args.sceneId,
        status: "analyzing",
      });

      // Call the scene creation workflow endpoint
      // This will be handled by our Next.js API route which calls Manus AI
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/create-scene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: args.sceneId,
          photoUrl: args.photoUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Workflow failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // Update scene status to error
      await ctx.runMutation(api.scenes.updateStatus, {
        sceneId: args.sceneId,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      
      throw error;
    }
  },
});

/**
 * Trigger object synthesis workflow (Doodle to Life)
 * This orchestrates: Input processing → Gemini interpretation → fal.ai 3D generation
 */
export const synthesizeObjectWorkflow = action({
  args: {
    sceneId: v.id("scenes"),
    inputType: v.union(v.literal("sketch"), v.literal("text"), v.literal("photo")),
    inputData: v.string(), // Base64 image or text prompt
    inputName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Call the object synthesis workflow endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/synthesize-object`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: args.sceneId,
          inputType: args.inputType,
          inputData: args.inputData,
          inputName: args.inputName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Object synthesis failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Object synthesis error:", error);
      throw error;
    }
  },
});

/**
 * Trigger scene audio generation workflow
 * This orchestrates: Scene analysis → Ambient sound prompt generation → ElevenLabs generation
 */
export const generateSceneAudioWorkflow = action({
  args: {
    sceneId: v.id("scenes"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; result?: unknown }> => {
    try {
      // Get current scene state
      const scene: unknown = await ctx.runQuery(api.scenes.getScene, {
        sceneId: args.sceneId,
      });

      if (!scene) {
        throw new Error("Scene not found");
      }

      // Call the scene audio generation workflow endpoint
      const response: Response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/generate-scene-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: args.sceneId,
          environmentType: (scene as { analysis?: { environmentType?: string } }).analysis?.environmentType,
          mood: (scene as { analysis?: { mood?: string } }).analysis?.mood,
          objectCount: (scene as { objects: unknown[] }).objects.length,
          objects: (scene as { objects: unknown[] }).objects,
        }),
      });

      if (!response.ok) {
        throw new Error(`Scene audio generation failed: ${response.statusText}`);
      }

      const result: unknown = await response.json();
      return { success: true, result };
    } catch (error) {
      console.error("Scene audio generation error:", error);
      throw error;
    }
  },
});

