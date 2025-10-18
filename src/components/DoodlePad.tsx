"use client";

import { useState, useRef, ChangeEvent } from "react";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";

/**
 * DoodlePad Component (Doodle to Life)
 * 
 * Provides three input methods for creating objects:
 * 1. Sketch - Draw on a canvas
 * 2. Text - Describe what you want
 * 3. Photo - Upload a reference image
 * 
 * User creations are synthesized into 3D objects via AI
 */

interface DoodlePadProps {
  onSynthesize: (type: "sketch" | "text" | "photo", data: string, name?: string) => void;
  isSynthesizing?: boolean;
}

type InputMode = "sketch" | "text" | "photo";

export default function DoodlePad({ onSynthesize, isSynthesizing = false }: DoodlePadProps) {
  const [mode, setMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [objectName, setObjectName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  /**
   * Handle sketch synthesis
   */
  const handleSketchSynthesize = async () => {
    if (!canvasRef.current) return;
    
    try {
      // Export canvas as base64 PNG
      const dataUrl = await canvasRef.current.exportImage("png");
      onSynthesize("sketch", dataUrl, objectName || "Sketch");
    } catch (error) {
      console.error("Error exporting sketch:", error);
      alert("Failed to export sketch");
    }
  };

  /**
   * Handle text synthesis
   */
  const handleTextSynthesize = () => {
    if (textInput.trim().length < 3) {
      alert("Please enter a description (at least 3 characters)");
      return;
    }
    
    onSynthesize("text", textInput.trim(), objectName || textInput.slice(0, 30));
  };

  /**
   * Handle photo synthesis
   */
  const handlePhotoSynthesize = () => {
    if (!photoPreview) {
      alert("Please select a photo first");
      return;
    }
    
    onSynthesize("photo", photoPreview, objectName || "Photo Object");
  };

  /**
   * Handle photo file selection
   */
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      
      setPhotoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Clear canvas
   */
  const handleClearCanvas = () => {
    canvasRef.current?.clearCanvas();
  };

  /**
   * Reset state
   */
  const handleReset = () => {
    setTextInput("");
    setObjectName("");
    setPhotoPreview(null);
    setPhotoFile(null);
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  };

  /**
   * Get synthesis button handler based on mode
   */
  const handleSynthesize = () => {
    if (mode === "sketch") {
      handleSketchSynthesize();
    } else if (mode === "text") {
      handleTextSynthesize();
    } else if (mode === "photo") {
      handlePhotoSynthesize();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-caveat-brush font-bold text-gray-800 mb-2">
          Doodle to Life ✨
        </h2>
        <p className="text-sm font-serif text-gray-600">
          Create objects by sketching, describing, or uploading a photo
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 border-b pb-4">
        <button
          onClick={() => setMode("text")}
          className={`px-4 py-2 rounded-lg font-caveat-brush font-medium transition-colors ${
            mode === "text"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Text
        </button>
        <button
          onClick={() => setMode("sketch")}
          className={`px-4 py-2 rounded-lg font-caveat-brush font-medium transition-colors ${
            mode === "sketch"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Sketch
        </button>
        <button
          onClick={() => setMode("photo")}
          className={`px-4 py-2 rounded-lg font-caveat-brush font-medium transition-colors ${
            mode === "photo"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Photo
        </button>
      </div>

      {/* Optional name input */}
      <div>
        <label className="block text-sm font-serif font-medium text-gray-700 mb-1">
          Object Name (Optional)
        </label>
        <input
          type="text"
          value={objectName}
          onChange={(e) => setObjectName(e.target.value)}
          placeholder="e.g., Flying Dragon, Magic Wand..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-serif focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSynthesizing}
        />
      </div>

      {/* Input area based on mode */}
      <div className="min-h-[300px]">
        {mode === "text" && (
          <div>
            <label className="block text-sm font-serif text-gray-700 mb-1">
              Describe your object
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g., A colorful butterfly with intricate wing patterns..."
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-serif focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSynthesizing}
            />
            <p className="text-xs text-gray-500 mt-1 font-serif">
              {textInput.length}/500 characters
            </p>
          </div>
        )}

        {mode === "sketch" && (
          <div>
            <label className="block text-sm font-serif text-gray-700 mb-1">
              Draw your object
            </label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <ReactSketchCanvas
                ref={canvasRef}
                width="100%"
                height="300px"
                strokeWidth={4}
                strokeColor="#000000"
                canvasColor="#FFFFFF"
              />
            </div>
            <button
              onClick={handleClearCanvas}
              disabled={isSynthesizing}
              className="mt-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded font-caveat-brush hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Clear Canvas
            </button>
          </div>
        )}

        {mode === "photo" && (
          <div>
            <label className="block text-sm font-serif text-gray-700 mb-1">
              Upload a reference photo
            </label>
            {!photoPreview ? (
              <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                <svg
                  className="w-12 h-12 text-gray-400 mb-2"
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
                <span className="text-sm text-gray-600">Click to upload photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={isSynthesizing}
                />
              </label>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-300">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-64 object-contain bg-gray-50"
                  />
                </div>
                <button
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoFile(null);
                  }}
                  disabled={isSynthesizing}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded font-caveat-brush hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Choose Different Photo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-caveat-brush font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSynthesizing ? (
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
              Compiling your imagination...
            </>
          ) : (
            <>
              ✨ Bring to Life
            </>
          )}
        </button>
        
        {!isSynthesizing && (
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-caveat-brush font-semibold hover:bg-gray-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {isSynthesizing && (
        <div className="text-center space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-blue-800 animate-pulse">
            Creating your true 3D model with Meshy AI... ✨
          </p>
          <p className="text-xs text-blue-600">
            This may take 30-60 seconds for high-quality 3D geometry
          </p>
          <p className="text-xs text-gray-500">
            Tip: Grab a coffee while the AI crafts your masterpiece!
          </p>
        </div>
      )}
    </div>
  );
}

