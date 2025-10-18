"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  PointerLockControls,
  Html,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import AnimatedObject from "./AnimatedObject";
import ObjectInspector from "./ObjectInspector";
import CameraController, { CameraModeHUD, CameraMode } from "./CameraController";
import { AmbientAudioManager } from "./SpatialAudio";
import EnvironmentController, { TimeOfDay, TimeControlPanel } from "./EnvironmentController";
import WeatherSystem, { WeatherType, WeatherControlPanel } from "./WeatherSystem";
import Waypoints, { Minimap } from "./Waypoints";
import FeedbackEffects from "./FeedbackEffects";
import PhysicsWorld from "./PhysicsWorld";
import SceneChat from "./SceneChat";
import { useHaptics } from "@/hooks/useHaptics";
import WorldLabsPanoramaRenderer from "./WorldLabsPanoramaRenderer";
import { fetchWorldDetails, getPanoramaUrls } from "@/lib/worldlabs";

/**
 * Enhanced ARViewer Component
 * 
 * Comprehensive immersive AR experience with:
 * - Interactive object manipulation (drag, rotate, scale)
 * - Multi-camera system (first-person, orbit, bird's eye, cinematic)
 * - Physics simulation
 * - Dynamic lighting and time-of-day
 * - Weather effects
 * - Spatial audio
 * - AI-powered chat assistant
 * - Waypoint teleportation
 * - Visual feedback effects
 */

interface SceneObject {
  id: string;
  name: string;
  modelUrl: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  createdAt: number;
}

interface ARViewerProps {
  environmentTextureUrl?: string;
  worldLabsWorldId?: string;
  objects: SceneObject[];
  audioUrl?: string;
  waypoints?: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    label: string;
  }>;
  sceneContext?: {
    environmentType?: string;
    mood?: string;
    locationName?: string;
  };
  onObjectUpdate?: (
    objectId: string,
    transform: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
    }
  ) => void;
  onObjectDelete?: (objectId: string) => void;
}

/**
 * Environment sphere component that displays the generated background
 */
function EnvironmentSphere({ textureUrl }: { textureUrl: string }) {
  const texture = useTexture(textureUrl);

  useEffect(() => {
    // Configure texture for spherical mapping
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

/**
 * PointerLockControls wrapper with state tracking
 */
function TrackedPointerLockControls({
  onLock,
  onUnlock,
}: {
  onLock?: () => void;
  onUnlock?: () => void;
}) {
  useEffect(() => {
    const handlePointerLockChange = () => {
      if (document.pointerLockElement) {
        if (onLock) onLock();
      } else {
        if (onUnlock) onUnlock();
      }
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [onLock, onUnlock]);

  return <PointerLockControls />;
}

/**
 * Enhanced First-person navigation controller with WASD + mouse look
 */
function FirstPersonController({
  enabled,
  onPositionChange,
}: {
  enabled: boolean;
  onPositionChange?: (pos: { x: number; z: number }) => void;
}) {
  const { camera } = useThree();
  const keysPressed = useRef<Set<string>>(new Set());
  const worldBounds = 50; // Boundary limit
  const { vibrate } = useHaptics();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame((state) => {
    if (!enabled) return;

    const keys = keysPressed.current;
    const direction = new THREE.Vector3();

    // Get camera forward and right vectors (only XZ plane for ground movement)
    camera.getWorldDirection(direction);
    direction.y = 0; // Lock to horizontal plane
    direction.normalize();

    const forward = direction.clone();
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize();

    const velocity = new THREE.Vector3();

    // Sprint multiplier
    const isSprinting = keys.has("shift");
    const moveSpeed = isSprinting ? 0.4 : 0.2;

    // WASD movement
    if (keys.has("w")) velocity.add(forward);
    if (keys.has("s")) velocity.sub(forward);
    if (keys.has("a")) velocity.add(right);
    if (keys.has("d")) velocity.sub(right);

    // Normalize diagonal movement
    if (velocity.length() > 0) {
      velocity.normalize().multiplyScalar(moveSpeed);
    }

    // Jump (simple vertical boost)
    if (keys.has(" ") && camera.position.y <= 1.6) {
      camera.position.y += 0.1;
      vibrate("light");
    }

    // Apply gravity
    if (camera.position.y > 1.6) {
      camera.position.y -= 0.05;
    } else {
      camera.position.y = 1.6;
    }

    // Apply movement with boundary collision
    const newPos = camera.position.clone().add(velocity);

    // Keep within world bounds
    newPos.x = Math.max(-worldBounds, Math.min(worldBounds, newPos.x));
    newPos.z = Math.max(-worldBounds, Math.min(worldBounds, newPos.z));

    camera.position.copy(newPos);

    // Camera bob while walking
    if (velocity.length() > 0) {
      const bobAmount = Math.sin(state.clock.getElapsedTime() * 10) * 0.02;
      camera.position.y += bobAmount;
    }

    // Notify position change for minimap
    if (onPositionChange) {
      onPositionChange({ x: camera.position.x, z: camera.position.z });
    }
  });

  return null;
}

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <Html center>
      <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded">
        Loading scene...
      </div>
    </Html>
  );
}

/**
 * World Labs environment component
 */
function WorldLabsEnvironment({ worldLabsWorldId }: { worldLabsWorldId: string }) {
  const [panoramas, setPanoramas] = useState<Array<{
    url: string;
    position: [number, number, number];
    quaternion: [number, number, number, number];
  }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorldLabs = async () => {
      try {
        setLoading(true);
        const worldData = await fetchWorldDetails(worldLabsWorldId);
        const panos = await getPanoramaUrls(worldData);
        setPanoramas(panos);
        setError(null);
      } catch (err) {
        console.error("Failed to load World Labs environment:", err);
        setError("Failed to load World Labs environment");
      } finally {
        setLoading(false);
      }
    };

    loadWorldLabs();
  }, [worldLabsWorldId]);

  if (loading) {
    return (
      <Html center>
        <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded">
          Loading World Labs environment...
        </div>
      </Html>
    );
  }

  if (error || !panoramas) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
    );
  }

  return <WorldLabsPanoramaRenderer panoramas={panoramas} />;
}

/**
 * Main AR scene component
 */
function ARScene({
  environmentTextureUrl,
  worldLabsWorldId,
  objects,
  waypoints,
  selectedObjectId,
  onObjectSelect,
  onObjectTransformChange,
  onObjectDelete,
  cameraMode: _cameraMode,
  timeOfDay,
  weather,
  enablePhysics,
}: {
  environmentTextureUrl?: string;
  worldLabsWorldId?: string;
  objects: SceneObject[];
  waypoints?: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    label: string;
  }>;
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  onObjectTransformChange?: (
    objectId: string,
    transform: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
    }
  ) => void;
  onObjectDelete?: (objectId: string) => void;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  enablePhysics: boolean;
}) {
  const sceneContent = (
    <>
      {/* Environment Controller (Time of Day) */}
      <EnvironmentController timeOfDay={timeOfDay} animated />

      {/* Weather System */}
      <WeatherSystem weather={weather} intensity={0.5} />

      {/* Environment - World Labs or Standard */}
      {worldLabsWorldId ? (
        <Suspense fallback={null}>
          <WorldLabsEnvironment worldLabsWorldId={worldLabsWorldId} />
        </Suspense>
      ) : environmentTextureUrl ? (
        <Suspense fallback={null}>
          <EnvironmentSphere textureUrl={environmentTextureUrl} />
        </Suspense>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#90EE90" />
        </mesh>
      )}

      {/* Scene objects */}
      {objects.map((obj) => (
        <Suspense key={obj.id} fallback={<LoadingFallback />}>
          <AnimatedObject
            object={obj}
            isSelected={selectedObjectId === obj.id}
            onSelect={() => onObjectSelect(obj.id)}
            onTransformChange={(transform) => {
              if (onObjectTransformChange) {
                onObjectTransformChange(obj.id, transform);
              }
            }}
            onDelete={() => {
              if (onObjectDelete) {
                onObjectDelete(obj.id);
              }
            }}
            enablePhysics={enablePhysics}
          />
        </Suspense>
      ))}

      {/* Waypoints */}
      {waypoints && <Waypoints waypoints={waypoints} />}

      {/* Visual Feedback Effects */}
      <FeedbackEffects enableBloom enableVignette enableChromaticAberration={false} />
    </>
  );

  // Wrap in physics if enabled
  if (enablePhysics) {
    return <PhysicsWorld>{sceneContent}</PhysicsWorld>;
  }

  return sceneContent;
}

/**
 * Audio player component
 */
function AudioPlayer({ audioUrl, isPlaying }: { audioUrl?: string; isPlaying: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playing, setPlaying] = useState(isPlaying);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      setIsLoading(true);
      audioRef.current.src = audioUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      
      const handleCanPlay = () => setIsLoading(false);
      audioRef.current.addEventListener("canplay", handleCanPlay);
      
      return () => {
        audioRef.current?.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current && audioUrl && !isLoading) {
      if (isPlaying) {
        audioRef.current.play();
        setPlaying(true);
      } else {
        audioRef.current.pause();
        setPlaying(false);
      }
    }
  }, [isPlaying, audioUrl, isLoading]);

  const togglePlay = () => {
    if (!audioUrl || isLoading) return;
    
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <audio ref={audioRef} />
      <button
        onClick={togglePlay}
        disabled={!audioUrl || isLoading}
        className={`text-white p-3 rounded-full transition-all ${
          !audioUrl || isLoading
            ? "bg-gray-500 bg-opacity-50 cursor-not-allowed"
            : "bg-black bg-opacity-50 hover:bg-opacity-75 cursor-pointer"
        }`}
        title={playing ? "Pause Scene Audio" : "Play Scene Audio"}
      >
        {playing ? "⏸" : "▶"}
      </button>
    </div>
  );
}

/**
 * Main ARViewer component
 */
export default function ARViewer({
  environmentTextureUrl,
  worldLabsWorldId,
  objects,
  audioUrl,
  waypoints,
  sceneContext,
  onObjectUpdate,
  onObjectDelete,
}: ARViewerProps) {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("first-person");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("noon");
  const [weather, setWeather] = useState<WeatherType>("clear");
  const [enablePhysics, setEnablePhysics] = useState(false);
  const [isAudioPlaying] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  /**
   * Deselect object when clicking empty space
   */
  const handleCanvasClick = () => {
    if (selectedObjectId) {
      setSelectedObjectId(null);
    }
  };

  /**
   * Get selected object
   */
  const selectedObject = objects.find((obj) => obj.id === selectedObjectId);

  return (
    <div className="relative w-full h-screen">
      {/* Click to start prompt - only show when not in pointer lock */}
      {!isPointerLocked && cameraMode === "first-person" && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg text-center">
            <p className="text-lg font-semibold">Click to Enter 3D World</p>
            <p className="text-sm mt-2">WASD - Move | Mouse - Look Around | Shift - Sprint</p>
            <p className="text-xs mt-1 opacity-75">Press ESC to exit | Tab to switch camera</p>
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-4 py-2 rounded">
        <p className="font-semibold mb-1">Navigation:</p>
        <p className="text-sm">WASD - Move | Shift - Sprint | Space - Jump</p>
        <p className="text-sm">Mouse - Look | Tab - Camera Mode | ESC - Exit</p>
      </div>

      {/* Camera Mode HUD */}
      <CameraModeHUD mode={cameraMode} />

      {/* Time of Day Control */}
      <TimeControlPanel timeOfDay={timeOfDay} onTimeChange={setTimeOfDay} />

      {/* Weather Control */}
      <WeatherControlPanel weather={weather} onWeatherChange={setWeather} />

      {/* Physics Toggle */}
      <div className="absolute top-[360px] left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-4 z-10">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
          <input
            type="checkbox"
            checked={enablePhysics}
            onChange={(e) => setEnablePhysics(e.target.checked)}
            className="w-4 h-4"
          />
          Enable Physics
        </label>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 75 }}
        gl={{ antialias: true }}
        shadows
        onClick={handleCanvasClick}
      >
        <Suspense fallback={<LoadingFallback />}>
          <ARScene
            environmentTextureUrl={environmentTextureUrl}
            worldLabsWorldId={worldLabsWorldId}
            objects={objects}
            waypoints={waypoints}
            selectedObjectId={selectedObjectId}
            onObjectSelect={setSelectedObjectId}
            onObjectTransformChange={onObjectUpdate}
            onObjectDelete={onObjectDelete}
            cameraMode={cameraMode}
            timeOfDay={timeOfDay}
            weather={weather}
            enablePhysics={enablePhysics}
          />
        </Suspense>

        {/* Camera Controller */}
        <CameraController mode={cameraMode} onModeChange={setCameraMode} />

        {/* First Person Controls */}
        {cameraMode === "first-person" && (
          <>
            <TrackedPointerLockControls
              onLock={() => setIsPointerLocked(true)}
              onUnlock={() => setIsPointerLocked(false)}
            />
            <FirstPersonController
              enabled={cameraMode === "first-person"}
              onPositionChange={setPlayerPosition}
            />
          </>
        )}

        {/* Spatial Audio (3D positioned) */}
        <AmbientAudioManager audioUrl={audioUrl} isPlaying={isAudioPlaying} volume={0.5} />
      </Canvas>

      {/* Object Inspector Panel */}
      {selectedObject && (
        <ObjectInspector
          object={selectedObject}
          onClose={() => setSelectedObjectId(null)}
          onUpdate={(objectId, transform) => {
            if (onObjectUpdate) {
              onObjectUpdate(objectId, transform);
            }
          }}
          onDelete={(objectId) => {
            if (onObjectDelete) {
              onObjectDelete(objectId);
              setSelectedObjectId(null);
            }
          }}
        />
      )}

      {/* Minimap */}
      {waypoints && waypoints.length > 0 && (
        <Minimap waypoints={waypoints} playerPosition={playerPosition} />
      )}

      {/* Audio player - always visible */}
      <AudioPlayer audioUrl={audioUrl} isPlaying={isAudioPlaying} />

      {/* AI Chat Assistant */}
      <SceneChat
        sceneContext={{
          environmentType: sceneContext?.environmentType,
          mood: sceneContext?.mood,
          locationName: sceneContext?.locationName,
          objects: objects.map((obj) => ({ name: obj.name })),
        }}
      />
    </div>
  );
}
