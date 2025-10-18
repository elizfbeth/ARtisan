import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Convex Scene Operations
 *
 * Provides CRUD operations for AR scenes with real-time updates
 */

/**
 * Create a new scene from an uploaded photo
 */
export const createScene = mutation({
  args: {
    photoUrl: v.string(),
    photoStoragePath: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sceneId = await ctx.db.insert("scenes", {
      userId: args.userId,
      photoUrl: args.photoUrl,
      photoStoragePath: args.photoStoragePath,
      status: "analyzing",
      objects: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sceneId;
  },
});

/**
 * Get a scene by ID with real-time updates
 */
export const getScene = query({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sceneId);
  },
});

/**
 * Update scene analysis results from Gemini
 */
export const updateAnalysis = mutation({
  args: {
    sceneId: v.id("scenes"),
    analysis: v.object({
      environmentType: v.string(),
      keyObjects: v.array(v.string()),
      depthPerspective: v.string(),
      colorPalette: v.array(v.string()),
      mood: v.string(),
      location: v.optional(
        v.object({
          hasLocation: v.boolean(),
          locationName: v.string(),
          locationType: v.string(),
          locationKeywords: v.array(v.string()),
        })
      ),
    }),
    locationContext: v.optional(
      v.object({
        description: v.string(),
        facts: v.array(v.string()),
        atmosphere: v.string(),
        historicalContext: v.string(),
      })
    ),
    waypoints: v.optional(
      v.array(
        v.object({
          id: v.string(),
          position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
          label: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sceneId, {
      analysis: args.analysis,
      locationContext: args.locationContext,
      waypoints: args.waypoints,
      status: "generating",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update scene with generated environment
 */
export const updateEnvironment = mutation({
  args: {
    sceneId: v.id("scenes"),
    environmentTextureUrl: v.string(),
    environmentStoragePath: v.string(),
    environmentType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sceneId, {
      environmentTextureUrl: args.environmentTextureUrl,
      environmentStoragePath: args.environmentStoragePath,
      environmentType: args.environmentType,
      status: "ready",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Add an object to the scene (from Doodle to Life)
 */
export const addObject = mutation({
  args: {
    sceneId: v.id("scenes"),
    object: v.object({
      id: v.string(),
      name: v.string(),
      modelUrl: v.string(),
      modelType: v.optional(v.union(v.literal("glb"), v.literal("image"))),
      storagePath: v.string(),
      position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
      rotation: v.object({ x: v.number(), y: v.number(), z: v.number() }),
      scale: v.object({ x: v.number(), y: v.number(), z: v.number() }),
      createdAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) {
      throw new Error("Scene not found");
    }

    const updatedObjects = [...scene.objects, args.object];
    await ctx.db.patch(args.sceneId, {
      objects: updatedObjects,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update object position/rotation/scale (for user interactions)
 */
export const updateObject = mutation({
  args: {
    sceneId: v.id("scenes"),
    objectId: v.string(),
    position: v.optional(
      v.object({ x: v.number(), y: v.number(), z: v.number() })
    ),
    rotation: v.optional(
      v.object({ x: v.number(), y: v.number(), z: v.number() })
    ),
    scale: v.optional(
      v.object({ x: v.number(), y: v.number(), z: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) {
      throw new Error("Scene not found");
    }

    const updatedObjects = scene.objects.map((obj) => {
      if (obj.id === args.objectId) {
        return {
          ...obj,
          position: args.position || obj.position,
          rotation: args.rotation || obj.rotation,
          scale: args.scale || obj.scale,
        };
      }
      return obj;
    });

    await ctx.db.patch(args.sceneId, {
      objects: updatedObjects,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update scene audio (AI-generated soundtrack)
 */
export const updateAudio = mutation({
  args: {
    sceneId: v.id("scenes"),
    audioUrl: v.string(),
    audioStoragePath: v.string(),
    audioMood: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sceneId, {
      audioUrl: args.audioUrl,
      audioStoragePath: args.audioStoragePath,
      audioMood: args.audioMood,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update scene status (for workflow tracking)
 */
export const updateStatus = mutation({
  args: {
    sceneId: v.id("scenes"),
    status: v.union(
      v.literal("uploading"),
      v.literal("analyzing"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sceneId, {
      status: args.status,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

/**
 * List all scenes for a user
 */
export const listScenes = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = args.userId
      ? ctx.db
          .query("scenes")
          .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      : ctx.db.query("scenes");

    const scenes = await query.order("desc").take(args.limit || 20);

    return scenes;
  },
});
