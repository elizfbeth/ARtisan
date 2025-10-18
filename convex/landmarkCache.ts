import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Convex Landmark Cache Operations
 *
 * Stores and retrieves landmark data to avoid repeated web scraping
 */

/**
 * Get cached landmark data by name
 */
export const getLandmark = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const normalizedName = args.name.toLowerCase().trim();

    const landmark = await ctx.db
      .query("landmarkCache")
      .withIndex("by_name", (q) => q.eq("name", normalizedName))
      .first();

    if (!landmark) {
      return null;
    }

    // Check if cache is fresh (less than 30 days old)
    const cacheAge = Date.now() - landmark.cachedAt;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (cacheAge > thirtyDays) {
      console.log("Cache expired for landmark:", normalizedName);
      return null;
    }

    return landmark;
  },
});

/**
 * Cache landmark data
 */
export const cacheLandmark = mutation({
  args: {
    name: v.string(),
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
  },
  handler: async (ctx, args) => {
    const normalizedName = args.name.toLowerCase().trim();

    // Check if landmark already exists
    const existing = await ctx.db
      .query("landmarkCache")
      .withIndex("by_name", (q) => q.eq("name", normalizedName))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing cache
      await ctx.db.patch(existing._id, {
        location: args.location,
        additionalImages: args.additionalImages,
        historicalInfo: args.historicalInfo,
        architecturalDetails: args.architecturalDetails,
        relatedPlaces: args.relatedPlaces,
        sources: args.sources,
        updatedAt: now,
      });

      return existing._id;
    } else {
      // Create new cache entry
      const landmarkId = await ctx.db.insert("landmarkCache", {
        name: normalizedName,
        location: args.location,
        additionalImages: args.additionalImages,
        historicalInfo: args.historicalInfo,
        architecturalDetails: args.architecturalDetails,
        relatedPlaces: args.relatedPlaces,
        sources: args.sources,
        cachedAt: now,
        updatedAt: now,
      });

      return landmarkId;
    }
  },
});

/**
 * List all cached landmarks (for debugging/admin)
 */
export const listLandmarks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const landmarks = await ctx.db
      .query("landmarkCache")
      .order("desc")
      .take(args.limit || 50);

    return landmarks.map(landmark => ({
      name: landmark.name,
      location: landmark.location,
      cachedAt: landmark.cachedAt,
      imageCount: landmark.additionalImages.length,
      sourceCount: landmark.sources.length,
    }));
  },
});

/**
 * Clear expired cache entries (can be called periodically)
 */
export const clearExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const expiredLandmarks = await ctx.db
      .query("landmarkCache")
      .collect();

    let deletedCount = 0;

    for (const landmark of expiredLandmarks) {
      if (landmark.cachedAt < thirtyDaysAgo) {
        await ctx.db.delete(landmark._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
