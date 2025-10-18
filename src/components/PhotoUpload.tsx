"use client";

import { useState, useCallback, DragEvent, ChangeEvent } from "react";

/**
 * PhotoUpload Component
 * 
 * Provides drag-and-drop and click-to-upload functionality
 * for user photos that will be transformed into AR scenes
 */

interface PhotoUploadProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

export default function PhotoUpload({ onUpload, isUploading = false }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /**
   * Handle file selection and create preview
   */
  const handleFile = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  /**
   * Handle upload button click
   */
  const handleUploadClick = useCallback(() => {
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
    }
  }, [selectedFile, isUploading, onUpload]);

  /**
   * Reset upload state
   */
  const handleReset = useCallback(() => {
    setPreview(null);
    setSelectedFile(null);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {!preview ? (
        <div
          className={`border-4 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div>
              <p className="text-lg font-semibold font-caveat-brush text-gray-700 mb-2">
                Upload a photo to create your AR scene
              </p>
              <p className="text-sm font-serif text-gray-500">
                Drag and drop an image here, or click to select
              </p>
            </div>

            <label className="inline-block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <span className="px-6 py-3 bg-blue-600 text-white rounded-lg font-serif font-medium cursor-pointer hover:bg-blue-700 transition-colors inline-block">
                Select Photo
              </span>
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReset}
              disabled={isUploading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-caveat-brush font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose Different Photo
            </button>
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-caveat-brush font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating AR Scene...
                </>
              ) : (
                "Create AR Scene"
              )}
            </button>
          </div>

          {isUploading && (
            <div className="text-center">
              <p className="text-sm text-gray-600 animate-pulse">
                Analyzing your photo and generating the AR environment...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

