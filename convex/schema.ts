import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Database Schema for ARtisan
 * 
 * Defines the structure for users, scenes, and assets
 * with real-time synchronization capabilities
 */
export default defineSchema({
  // Users table - stores user information and preferences
  users: defineTable({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    // User preferences stored by Mem0.ai
    preferences: v.optional(v.object({
      favoriteStyles: v.array(v.string()),
      defaultMood: v.optional(v.string()),
    })),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Scenes table - stores AR scene data
  scenes: defineTable({
    userId: v.optional(v.string()),
    
    // Original photo uploaded by user
    photoUrl: v.string(),
    photoStoragePath: v.string(),
    
    // Scene generation status
    status: v.union(
      v.literal("uploading"),
      v.literal("analyzing"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("error")
    ),
    
    // Error information if generation fails
    error: v.optional(v.string()),
    
    // Gemini analysis results (enhanced with 25+ detailed fields)
    analysis: v.optional(v.object({
      // Basic fields
      environmentType: v.string(),
      keyObjects: v.array(v.string()),
      depthPerspective: v.string(),
      colorPalette: v.array(v.string()),
      mood: v.string(),
      // Landmark detection
      isLandmark: v.optional(v.boolean()),
      landmarkName: v.optional(v.union(v.string(), v.null())),
      location: v.optional(v.union(v.string(), v.null())),
      landmarkConfidence: v.optional(v.number()),
      // Extended detailed analysis (25+ fields for enhanced scene creation)
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
    })),
    
    // Generated environment
    environmentTextureUrl: v.optional(v.string()),
    environmentStoragePath: v.optional(v.string()),
    environmentType: v.optional(v.string()), // "skybox" or "panorama"
    
    // Objects in the scene (from Doodle to Life)
    objects: v.array(v.object({
      id: v.string(),
      name: v.string(),
      modelUrl: v.string(),
      storagePath: v.string(),
      position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
      rotation: v.object({ x: v.number(), y: v.number(), z: v.number() }),
      scale: v.object({ x: v.number(), y: v.number(), z: v.number() }),
      createdAt: v.number(),
    })),
    
    // AI-generated soundtrack
    audioUrl: v.optional(v.string()),
    audioStoragePath: v.optional(v.string()),
    audioMood: v.optional(v.string()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Landmark cache - stores scraped landmark data for fast retrieval
  landmarkCache: defineTable({
    name: v.string(), // Normalized landmark name (lowercase)
    location: v.string(),
    additionalImages: v.array(v.string()),
    historicalInfo: v.string(),
    architecturalDetails: v.string(),
    relatedPlaces: v.array(v.string()),
    sources: v.array(v.object({
      title: v.string(),
      url: v.string(),
      excerpt: v.string(),
    })),
    cachedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  // Assets table - tracks all generated assets
  assets: defineTable({
    sceneId: v.id("scenes"),
    type: v.union(
      v.literal("photo"),
      v.literal("environment"),
      v.literal("model"),
      v.literal("audio")
    ),
    url: v.string(),
    storagePath: v.string(),
    
    // Generation metadata
    generatedBy: v.string(), // "gemini", "fal", "elevenlabs", etc.
    generationTime: v.optional(v.number()), // milliseconds
    
    // Asset-specific metadata
    metadata: v.optional(v.object({
      prompt: v.optional(v.string()),
      dimensions: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
      duration: v.optional(v.number()), // for audio
      fileSize: v.optional(v.number()),
    })),
    
    createdAt: v.number(),
  })
    .index("by_sceneId", ["sceneId"])
    .index("by_type", ["type"]),
});

