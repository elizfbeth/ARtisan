"use client";

import { useState, useEffect } from "react";
import {
  fetchWorldTemplates,
  WorldTemplate,
  MOCK_WORLD,
  worldToTemplate,
} from "@/lib/worldlabs";

/**
 * WorldLabsTemplateBrowser Component
 * 
 * Gallery browser for World Labs world templates:
 * - Grid view of available worlds with thumbnails
 * - Search and filter by tags
 * - Click to select and use a world as environment
 * - Pagination support
 */

interface WorldLabsTemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorld: (worldId: string) => void;
}

export default function WorldLabsTemplateBrowser({
  isOpen,
  onClose,
  onSelectWorld,
}: WorldLabsTemplateBrowserProps) {
  const [templates, setTemplates] = useState<WorldTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /**
   * Load templates on mount or when filters change
   */
  useEffect(() => {
    if (!isOpen) return;

    const loadTemplates = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to fetch from API
        const fetchedTemplates = await fetchWorldTemplates({
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          search: searchQuery || undefined,
          limit: 50,
        });
        setTemplates(fetchedTemplates);
      } catch (err) {
        console.error("Failed to load World Labs templates:", err);
        
        // Fallback to mock data for development
        console.log("Using mock World Labs data for development");
        setTemplates([worldToTemplate(MOCK_WORLD)]);
        setError("Using demo data (API connection pending)");
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [isOpen, selectedTags, searchQuery]);

  /**
   * Handle world selection
   */
  const handleSelectWorld = (worldId: string) => {
    onSelectWorld(worldId);
    onClose();
  };

  /**
   * Toggle tag filter
   */
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Available tag filters
  const availableTags = ["curated", "realism", "fantasy", "architectural", "nature"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">World Labs Gallery</h2>
              <p className="text-sm opacity-90 mt-1">
                Choose a world template or generate a new one
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search worlds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Tag Filters */}
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading worlds...</p>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-500 text-lg">No worlds found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                  onClick={() => handleSelectWorld(template.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-200 overflow-hidden">
                    <img
                      src={template.thumbnailUrl}
                      alt={template.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                        Use This World
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {template.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                        </svg>
                        <span>{template.stats.like_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{template.stats.view_count}</span>
                      </div>
                    </div>

                    {/* Owner */}
                    <p className="text-xs text-gray-400 mt-2">
                      by {template.ownerName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {templates.length} {templates.length === 1 ? "world" : "worlds"} available
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

