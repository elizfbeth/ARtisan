import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Convex Scene Operations
 *
 * Provides CRUD operations for AR scenes with real-time updates
 */

/**
 * Create a new scene (from photo upload or gallery template)
 */
export const create = mutation({
  args: {
    photoUrl: v.string(),
    photoStoragePath: v.string(),
    userId: v.optional(v.string()),
    galleryWorldId: v.optional(v.string()),
    gallerySource: v.optional(v.union(v.literal("template"), v.literal("generated"))),
  },
  handler: async (ctx, args) => {
    const sceneId = await ctx.db.insert("scenes", {
      userId: args.userId,
      photoUrl: args.photoUrl,
      photoStoragePath: args.photoStoragePath,
      galleryWorldId: args.galleryWorldId,
      gallerySource: args.gallerySource,
      status: args.galleryWorldId ? "generating" : "analyzing",
      objects: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sceneId;
  },
});

/**
 * Legacy alias for backward compatibility
 */
export const createScene = create;

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
 * Update scene analysis results from Gemini (enhanced with 25+ fields)
 */
export const updateAnalysis = mutation({
  args: {
    sceneId: v.id("scenes"),
    analysis: v.object({
      // Basic fields (always required)
      environmentType: v.string(),
      keyObjects: v.array(v.string()),
      depthPerspective: v.string(),
      colorPalette: v.array(v.string()),
      mood: v.string(),
      // Landmark detection
      isLandmark: v.optional(v.boolean()),
      landmarkName: v.optional(v.union(v.string(), v.null())),
      landmarkConfidence: v.optional(v.number()),
      // Extended detailed analysis (optional, for enhanced workflow)
      lightingConditions: v.optional(v.string()),
      weatherConditions: v.optional(v.string()),
      architecture: v.optional(v.string()),
      vegetation: v.optional(v.string()),
      surfaceMaterials: v.optional(v.string()),
      signage: v.optional(v.string()),
      people: v.optional(v.string()),
      vehicles: v.optional(v.string()),
      streetFurniture: v.optional(v.string()),
      spatialLayout: v.optional(v.string()),
      foregroundDetails: v.optional(v.string()),
      midgroundDetails: v.optional(v.string()),
      backgroundDetails: v.optional(v.string()),
      uniqueFeatures: v.optional(v.string()),
      textureDetails: v.optional(v.string()),
      scaleIndicators: v.optional(v.string()),
      shadowPatterns: v.optional(v.string()),
      reflections: v.optional(v.string()),
      materialAging: v.optional(v.string()),
      culturalElements: v.optional(v.string()),
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
    galleryWorldId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sceneId, {
      environmentTextureUrl: args.environmentTextureUrl,
      environmentStoragePath: args.environmentStoragePath,
      environmentType: args.environmentType,
      galleryWorldId: args.galleryWorldId,
      status: "ready",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update scene waypoints
 */
export const updateWaypoints = mutation({
  args: {
    sceneId: v.id("scenes"),
    waypoints: v.array(
      v.object({
        id: v.string(),
        position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        label: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sceneId, {
      waypoints: args.waypoints,
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
 * Delete an object from the scene
 */
export const deleteObject = mutation({
  args: {
    sceneId: v.id("scenes"),
    objectId: v.string(),
  },
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) {
      throw new Error("Scene not found");
    }
    
    const updatedObjects = scene.objects.filter((obj) => obj.id !== args.objectId);
    await ctx.db.patch(args.sceneId, {
      objects: updatedObjects,
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
