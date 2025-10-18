"use client";

import { useState, useEffect } from "react";
import { X, Move, RotateCw, Maximize2, Trash2, Copy } from "lucide-react";

/**
 * ObjectInspector Component
 * 
 * Detailed inspector panel for selected 3D objects:
 * - Shows object metadata (name, creation time)
 * - Precise position/rotation/scale controls
 * - AI-generated object description
 * - Actions: duplicate, delete, export
 */

interface ObjectInspectorProps {
  object: {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    createdAt: number;
  } | null;
  onClose: () => void;
  onUpdate: (
    objectId: string,
    transform: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
    }
  ) => void;
  onDelete: (objectId: string) => void;
  onDuplicate?: (objectId: string) => void;
}

export default function ObjectInspector({
  object,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
}: ObjectInspectorProps) {
  const [aiDescription, setAiDescription] = useState<string>("");
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  
  // Local state for smooth slider updates
  const [localPos, setLocalPos] = useState(object?.position || { x: 0, y: 0, z: 0 });
  const [localRot, setLocalRot] = useState(object?.rotation || { x: 0, y: 0, z: 0 });
  const [localScale, setLocalScale] = useState(object?.scale || { x: 1, y: 1, z: 1 });

  /**
   * Sync local state when object changes
   */
  useEffect(() => {
    if (object) {
      setLocalPos(object.position);
      setLocalRot(object.rotation);
      setLocalScale(object.scale);
    }
  }, [object]);

  /**
   * Generate AI description for object
   */
  useEffect(() => {
    if (!object) return;

    const generateDescription = async () => {
      setIsLoadingDescription(true);
      try {
        // TODO: Call Groq API to generate description
        // For now, use a placeholder
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setAiDescription(
          `This ${object.name} appears in your scene with dynamic positioning. It was created ${formatTimestamp(object.createdAt)} and can be freely manipulated in 3D space.`
        );
      } catch (error) {
        console.error("Failed to generate description:", error);
        setAiDescription("Unable to generate description at this time.");
      } finally {
        setIsLoadingDescription(false);
      }
    };

    generateDescription();
  }, [object?.id]);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  /**
   * Handle slider change with debounced update
   */
  const handleSliderChange = (
    type: "position" | "rotation" | "scale",
    axis: "x" | "y" | "z",
    value: number
  ) => {
    if (!object) return;

    if (type === "position") {
      const newPos = { ...localPos, [axis]: value };
      setLocalPos(newPos);
      onUpdate(object.id, { position: newPos });
    } else if (type === "rotation") {
      const newRot = { ...localRot, [axis]: value };
      setLocalRot(newRot);
      onUpdate(object.id, { rotation: newRot });
    } else if (type === "scale") {
      const newScale = { ...localScale, [axis]: value };
      setLocalScale(newScale);
      onUpdate(object.id, { scale: newScale });
    }
  };

  if (!object) return null;

  return (
    <div className="absolute right-4 top-20 w-80 bg-white rounded-lg shadow-2xl z-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Object Inspector</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Close Inspector"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm opacity-90 mt-1">{object.name}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Object Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Created</p>
          <p className="text-sm font-medium text-gray-800">
            {formatTimestamp(object.createdAt)}
          </p>
        </div>

        {/* AI Description */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-semibold mb-2">AI Description</p>
          {isLoadingDescription ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Generating...</p>
            </div>
          ) : (
            <p className="text-sm text-gray-700">{aiDescription}</p>
          )}
        </div>

        {/* Position Controls */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Move size={16} className="text-gray-600" />
            <p className="text-sm font-semibold text-gray-800">Position</p>
          </div>
          <div className="space-y-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-600 w-4">{axis.toUpperCase()}</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="0.1"
                  value={localPos[axis]}
                  onChange={(e) =>
                    handleSliderChange("position", axis, parseFloat(e.target.value))
                  }
                  className="flex-1"
                />
                <input
                  type="number"
                  value={localPos[axis].toFixed(1)}
                  onChange={(e) =>
                    handleSliderChange("position", axis, parseFloat(e.target.value))
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                  step="0.1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rotation Controls */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <RotateCw size={16} className="text-gray-600" />
            <p className="text-sm font-semibold text-gray-800">Rotation</p>
          </div>
          <div className="space-y-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-600 w-4">{axis.toUpperCase()}</span>
                <input
                  type="range"
                  min="0"
                  max={Math.PI * 2}
                  step="0.01"
                  value={localRot[axis]}
                  onChange={(e) =>
                    handleSliderChange("rotation", axis, parseFloat(e.target.value))
                  }
                  className="flex-1"
                />
                <input
                  type="number"
                  value={((localRot[axis] * 180) / Math.PI).toFixed(0)}
                  onChange={(e) =>
                    handleSliderChange(
                      "rotation",
                      axis,
                      (parseFloat(e.target.value) * Math.PI) / 180
                    )
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                  step="1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scale Controls */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Maximize2 size={16} className="text-gray-600" />
            <p className="text-sm font-semibold text-gray-800">Scale</p>
          </div>
          <div className="space-y-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-600 w-4">{axis.toUpperCase()}</span>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={localScale[axis]}
                  onChange={(e) =>
                    handleSliderChange("scale", axis, parseFloat(e.target.value))
                  }
                  className="flex-1"
                />
                <input
                  type="number"
                  value={localScale[axis].toFixed(1)}
                  onChange={(e) =>
                    handleSliderChange("scale", axis, parseFloat(e.target.value))
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                  step="0.1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <p className="text-xs font-semibold text-gray-600 mb-2">Actions</p>
          
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(object.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              <Copy size={16} />
              Duplicate Object
            </button>
          )}
          
          <button
            onClick={() => {
              if (confirm(`Delete ${object.name}?`)) {
                onDelete(object.id);
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete Object
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p className="font-semibold mb-1">Keyboard Shortcuts:</p>
          <ul className="space-y-1">
            <li><kbd className="font-mono bg-white px-1 rounded">G</kbd> - Move</li>
            <li><kbd className="font-mono bg-white px-1 rounded">R</kbd> - Rotate</li>
            <li><kbd className="font-mono bg-white px-1 rounded">S</kbd> - Scale</li>
            <li><kbd className="font-mono bg-white px-1 rounded">X</kbd> - Delete</li>
          </ul>
        </div>
      </div>
    </div>
  );
}





