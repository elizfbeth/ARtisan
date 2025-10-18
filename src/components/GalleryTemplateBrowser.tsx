"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchWorldTemplates,
  WorldTemplate,
  MOCK_WORLDS,
  worldToTemplate,
} from "@/lib/gallery";

/**
 * GalleryTemplateBrowser Component
 * 
 * Gallery browser for world templates:
 * - Grid view of available worlds with thumbnails
 * - Search and filter by tags
 * - Click to select and use a world as environment
 * - Pagination support
 */

interface GalleryTemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorld: (worldId: string) => void;
}

export default function GalleryTemplateBrowser({
  isOpen,
  onClose,
  onSelectWorld,
}: GalleryTemplateBrowserProps) {
  const [templates, setTemplates] = useState<WorldTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /**
   * Load templates on mount or when filters change
   */
  useEffect(() => {
    if (!isOpen) return;

    const loadTemplates = async () => {
      setLoading(true);

      try {
        // Try to fetch from API
        const fetchedTemplates = await fetchWorldTemplates({
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          search: searchQuery || undefined,
          limit: 50,
        });
        setTemplates(fetchedTemplates);
      } catch (err) {
        console.error("Failed to load gallery templates:", err);
        
        // Fallback to mock data for development
        console.log("Using mock gallery data for development");
        setTemplates(MOCK_WORLDS.map(worldToTemplate));
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border-4 border-white"
          >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-caveat-brush font-bold tracking-wide">✨ gallARy</h2>
              <p className="text-sm font-caveat opacity-90 mt-1">
                Choose a world template to start your AR adventure!
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
        <div className="px-6 py-4 border-b bg-gradient-to-br from-orange-50 to-amber-50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search magical worlds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 font-caveat text-lg transition-all"
              />
            </div>

            {/* Tag Filters */}
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-caveat-brush font-bold transition-all transform hover:scale-105 ${
                    selectedTags.includes(tag)
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white bg-opacity-70 text-gray-700 hover:bg-opacity-100 border-2 border-amber-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    ✨
                  </div>
                </div>
                <p className="mt-4 text-gray-700 font-caveat-brush text-xl">Loading magical worlds...</p>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-600 text-2xl font-caveat-brush">🌍 No worlds found</p>
                <p className="text-gray-500 font-caveat text-lg mt-2">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="bg-white bg-opacity-90 backdrop-blur-sm border-3 border-amber-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-blue-400 transition-all duration-300 cursor-pointer group"
                  onClick={() => handleSelectWorld(template.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-white overflow-hidden">
                    <img
                      src={template.thumbnailUrl}
                      alt={template.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                      <button className="bg-white text-blue-600 px-6 py-3 rounded-full font-caveat-brush font-bold text-lg opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
                        ✨ Enter World
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 bg-gradient-to-br from-white to-amber-50">
                    <h3 className="font-caveat-brush text-xl font-bold text-gray-900 truncate">
                      {template.title}
                    </h3>
                    <p className="text-sm font-caveat text-gray-600 mt-1 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-caveat-brush rounded-full border border-blue-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 font-caveat">
                      <div className="flex items-center gap-1">
                        <span className="text-red-500">❤️</span>
                        <span>{template.stats.like_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span>{template.stats.view_count}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-amber-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <p className="text-base font-caveat-brush text-gray-700">
              ✨ {templates.length} magical {templates.length === 1 ? "world" : "worlds"} available
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white border-2 border-amber-200 text-gray-700 rounded-xl hover:bg-amber-50 hover:border-blue-400 transition-all font-caveat-brush transform hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

