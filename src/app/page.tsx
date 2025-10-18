"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import PhotoUpload from "@/components/PhotoUpload";
import ARViewer from "@/components/ARViewer";
import DoodlePad from "@/components/DoodlePad";
import GalleryTemplateBrowser from "@/components/GalleryTemplateBrowser";

/**
 * ARtisan Main Application Page
 *
 * Orchestrates the complete AR creative studio experience:
 * 1. Photo upload → AR scene generation
 * 2. Doodle to Life → Object synthesis
 * 3. Real-time 3D viewer with AI soundtrack
 */

type AppState = "upload" | "processing" | "viewing";

interface SceneData {
  _id?: string;
  status?: string;
  analysis?: {
    environmentType?: string;
    mood?: string;
    keyObjects?: string[];
  };
  environmentTextureUrl?: string;
  audioUrl?: string;
  objects?: Array<{
    id: string;
    name: string;
    modelUrl: string;
    position: [number, number, number] | { x: number; y: number; z: number };
    rotation: [number, number, number] | { x: number; y: number; z: number };
    scale: [number, number, number] | { x: number; y: number; z: number };
  }>;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [currentSceneId, setCurrentSceneId] = useState<Id<"scenes"> | string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isGalleryBrowserOpen, setIsGalleryBrowserOpen] = useState(false);
  const [fallbackSceneData, setFallbackSceneData] = useState<SceneData | null>(null);

  // Check if the scene ID is a temporary ID (starts with "temp_")
  const isTempSceneId = currentSceneId?.startsWith("temp_");

  // Subscribe to scene updates in real-time (only if not a temp ID)
  const convexScene = useQuery(
    api.scenes.getScene,
    currentSceneId && !isTempSceneId ? { sceneId: currentSceneId as Id<"scenes"> } : "skip"
  );

  // Use Convex data if available, otherwise use fallback
  const scene = (convexScene || fallbackSceneData) as SceneData | null | undefined;

  // Poll for scene data when using a temp ID
  // Note: Polling is now disabled since the upload endpoint waits for completion
  // when using a temp ID. Keeping this code commented for reference.
  /*
  useEffect(() => {
    if (!isTempSceneId || !currentSceneId || appState !== "processing") return;

    let pollInterval: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 60;

    const pollSceneData = async () => {
      try {
        attempts++;
        const response = await fetch(`/api/upload?sceneId=${currentSceneId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.scene?.status === "ready") {
            setFallbackSceneData(data.scene);
            clearInterval(pollInterval);
          }
        }
        if (attempts >= maxAttempts) clearInterval(pollInterval);
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    pollInterval = setInterval(pollSceneData, 2000);
    pollSceneData();

    return () => clearInterval(pollInterval);
  }, [isTempSceneId, currentSceneId, appState]);
  */

  /**
   * Handle photo upload
   */
  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("photo", file);

      // Upload to API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      console.log("Upload result:", result);

      // Set scene ID and transition to processing state
      setCurrentSceneId(result.sceneId);

      // If the result includes scene data (for temp IDs), store it as fallback
      if (result.scene) {
        console.log("Scene data received:", result.scene);
        console.log("Analysis data:", result.scene.analysis);
        setFallbackSceneData(result.scene);
      }

      setAppState("processing");

    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle object synthesis (Doodle to Life)
   */
  const handleSynthesize = async (
    type: "sketch" | "text" | "photo",
    data: string,
    name?: string
  ) => {
    if (!currentSceneId) return;
    
    setIsSynthesizing(true);
    
    try {
      const response = await fetch("/api/workflows/synthesize-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: currentSceneId,
          inputType: type,
          inputData: data,
          inputName: name,
        }),
      });

      if (!response.ok) {
        throw new Error("Synthesis failed");
      }

      // Object will be added to scene via real-time Convex update
      
    } catch (error) {
      console.error("Synthesis error:", error);
      alert("Failed to create object. Please try again.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  /**
   * Handle regenerating scene audio
   */
  const handleRegenerateAudio = async () => {
    if (!currentSceneId) return;
    
    try {
      await fetch("/api/workflows/generate-scene-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId: currentSceneId }),
      });
    } catch (error) {
      console.error("Audio regeneration error:", error);
    }
  };

  /**
   * Handle gallery template selection
   */
  const handleGallerySelect = async (worldId: string) => {
    try {
      // Create scene via API with gallery template
      const response = await fetch("/api/workflows/create-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environmentSource: "gallery-template",
          galleryWorldId: worldId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create scene with gallery template");
      }

      const result = await response.json();
      
      // Set scene ID and transition to processing state
      setCurrentSceneId(result.sceneId);
      setAppState("processing");
      
    } catch (error) {
      console.error("Gallery template error:", error);
      alert("Failed to load gallery template. Please try again.");
    }
  };

  /**
   * Handle returning to upload
   */
  const handleNewScene = () => {
    setAppState("upload");
    setCurrentSceneId(null);
    setFallbackSceneData(null);
  };

  /**
   * Handle deleting an object from the scene
   */
  const deleteObject = async (objectId: string) => {
    if (!currentSceneId) return;

    try {
      // TODO: Implement object deletion via Convex mutation
      console.log("Deleting object:", objectId);
      // For now, just log - this should call a Convex mutation to delete the object
    } catch (error) {
      console.error("Object deletion error:", error);
    }
  };

  // Automatically transition to viewing when scene is ready
  if (scene && scene.status === "ready" && appState === "processing") {
    setAppState("viewing");
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white bg-opacity-90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/artisanlogo.png" alt="ARtisan" className="w-30 h-30 object-contain" />
            <div>
              <h1 className="text-2xl font-caveat font-bold text-black">
                ARtisan 
              </h1>
              <p className="text-xs text-gray-600 font-serif capitalize">TRANSFORM MEMORIES INTO AR MAGIC</p>
            </div>
          </div>
          
          {appState === "viewing" && (
            <button
              onClick={handleNewScene}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-caveat-brush"
            >
              Create New Scene
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {appState === "upload" && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-caveat-brush font-bold text-gray-800 mb-3">
                Welcome to ARtisan
              </h2>
              <p className="text-lg font-caveat-brush text-gray-700 max-w-2xl">
                Upload a photo and watch as AI transforms it into an immersive AR experience.
                Then bring your imagination to life by adding your own creations!
              </p>
            </div>
            
            {/* Photo upload */}
            <PhotoUpload onUpload={handlePhotoUpload} isUploading={isUploading} />
            
            {/* Divider */}
            <div className="flex items-center gap-4 my-8 w-full max-w-md">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-gray-500 text-sm font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
            
            {/* Gallery template browser button */}
            <button
              onClick={() => setIsGalleryBrowserOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-serif font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Browse our (GROWING) Gallery
            </button>
          </div>
        )}
        
        {/* Gallery Template Browser Modal */}
        <GalleryTemplateBrowser
          isOpen={isGalleryBrowserOpen}
          onClose={() => setIsGalleryBrowserOpen(false)}
          onSelectWorld={handleGallerySelect}
        />

        {appState === "processing" && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="text-center space-y-6 max-w-md">
              {/* Loading animation */}
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 border-8 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  ✨
                </div>
              </div>

              {/* Status messages */}
              <div className="space-y-2">
                <h2 className="text-2xl font-caveat-brush font-bold text-gray-800">
                  Creating Your AR Scene
                </h2>
                
                {scene?.status === "analyzing" && (
                  <p className="text-gray-600 font-caveat-brush animate-pulse">
                    Analyzing your photo with Gemini AI...
                  </p>
                )}
                
                {scene?.status === "generating" && (
                  <p className="text-gray-600 font-caveat-brush animate-pulse">
                    Generating immersive environment with fal.ai...
                  </p>
                )}
                
                {scene?.analysis && (
                  <div className="mt-4 p-4 bg-white bg-opacity-50 rounded-lg text-left">
                    <p className="text-sm font-caveat-brush font-semibold text-gray-700 mb-2">
                      Scene Analysis:
                    </p>
                    <ul className="text-sm font-caveat-brush text-gray-600 space-y-1">
                      <li>• Environment: {scene.analysis.environmentType}</li>
                      <li>• Mood: {scene.analysis.mood}</li>
                      <li>• Objects: {scene.analysis.keyObjects?.join(", ") || "N/A"}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {appState === "viewing" && scene && (
          <div className="space-y-4">
            {/* AR Viewer */}
            <div className="rounded-lg overflow-hidden shadow-2xl">
              <ARViewer
                environmentTextureUrl={scene.environmentTextureUrl}
                galleryWorldId={scene.galleryWorldId || (scene as any).worldLabsWorldId}
                objects={scene.objects.map((obj) => ({
                  id: obj.id,
                  name: obj.name,
                  modelUrl: obj.modelUrl,
                  position: obj.position,
                  rotation: obj.rotation,
                  scale: obj.scale,
                  createdAt: obj.createdAt,
                }))}
                audioUrl={scene.audioUrl}
                waypoints={scene.waypoints}
                sceneContext={{
                  environmentType: scene.analysis?.environmentType,
                  mood: scene.analysis?.mood,
                  locationName: scene.analysis?.location?.locationName,
                }}
                onObjectUpdate={async (objectId, transform) => {
                  // TODO: Implement real-time object update via Convex
                  console.log("Object updated:", objectId, transform);
                }}
                onObjectDelete={async (objectId) => {
                  // TODO: Implement object deletion via Convex
                  console.log("Object deleted:", objectId);
                }}
              />
            </div>

            {/* Doodle to Life Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DoodlePad
                  onSynthesize={handleSynthesize}
                  isSynthesizing={isSynthesizing}
                />
              </div>

              {/* Scene info panel */}
              <div className="space-y-4">
                {/* Scene stats */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-caveat-brush font-bold text-gray-800 mb-4">
                    Scene Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-serif">Environment:</span>
                      <span className="font-caveat-brush font-semibold text-gray-800">
                        {scene.analysis?.environmentType || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-serif">Mood:</span>
                      <span className="font-caveat-brush font-semibold text-gray-800">
                        {scene.analysis?.mood || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-serif">Objects:</span>
                      <span className="font-caveat-brush font-semibold text-gray-800">
                        {scene.objects?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-caveat-brush font-bold text-gray-800 mb-4">
                    Actions
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleRegenerateAudio}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-caveat-brush"
                    >
                      🔊 Regenerate Scene Audio
                    </button>
                  </div>
                </div>

                {/* Objects list */}
                {scene.objects && scene.objects.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-caveat-brush font-bold text-gray-800 mb-4">
                      Created Objects
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {scene.objects.map((obj) => (
                        <div
                          key={obj.id}
                          className="p-2 bg-gray-50 rounded text-sm font-caveat-brush font-bold flex items-center justify-between group"
                        >
                          <span className="truncate">{obj.name}</span>
                          <button
                            onClick={() => deleteObject(obj.id)}
                            className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-all"
                            title="Delete object"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 text-center text-gray-700 text-sm font-serif">
        <p>
          Built with ❤️ using Convex, Supabase, Gemini, Fal.ai, ElevenLabs & more <br />
          <a href="https://www.freepik.com/free-photo/hand-painted-watercolor-background_10264354.htm">Background image by denamorado on Freepik</a>
        </p>
      </footer>
    </main>
  );
}

