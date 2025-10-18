"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { 
  OrbitControls, 
  Environment, 
  Sky,
  Html,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * ARViewer Component
 * 
 * Renders the 3D AR scene with:
 * - Environment/skybox from generated texture
 * - User-created objects from Doodle to Life
 * - Camera controls (WASD + mouse)
 * - AI-generated audio
 */

interface SceneObject {
  id: string;
  name: string;
  modelUrl: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

interface ARViewerProps {
  environmentTextureUrl?: string;
  objects: SceneObject[];
  audioUrl?: string;
  onObjectMove?: (objectId: string, position: { x: number; y: number; z: number }) => void;
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
 * Scene object component - renders individual 3D objects with drag and delete functionality
 */
function SceneObject3D({ 
  object, 
  onDelete, 
  onMove,
  onDragStart,
  onDragEnd,
}: { 
  object: SceneObject; 
  onDelete?: (objectId: string) => void;
  onMove?: (objectId: string, position: { x: number; y: number; z: number }) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const justFinishedDraggingRef = useRef(false);
  const { camera, raycaster } = useThree();
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ 
    x: 0, 
    y: 0, 
    position: { x: 0, y: 0, z: 0 },
    worldPosition: new THREE.Vector3()
  });
  const [localPosition, setLocalPosition] = useState(object.position);
  // Load texture (for now we're using images as textures on planes)
  // In production, this would load actual .glb models
  const texture = useTexture(object.modelUrl);

  useEffect(() => {
    // Only update local position if we're not currently dragging
    // This prevents the object from snapping back to the old position while dragging
    if (!isDragging && !justFinishedDraggingRef.current) {
      setLocalPosition(object.position);
      // Also update the mesh position to match
      if (meshRef.current) {
        meshRef.current.position.set(object.position.x, object.position.y, object.position.z);
      }
    }
  }, [object.position, isDragging]);

  useEffect(() => {
    document.body.style.cursor = hovered ? (isDragging ? "grabbing" : "grab") : "auto";
  }, [hovered, isDragging]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(object.id);
    }
  };

  const handlePointerDown = (event: any) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    // Get the world position of the object
    const worldPosition = new THREE.Vector3();
    meshRef.current?.getWorldPosition(worldPosition);

    setIsDragging(true);
    setDragStart({ 
      x: event.clientX, 
      y: event.clientY, 
      position: {...object.position},
      worldPosition: worldPosition.clone()
    });
    
    if (onDragStart) {
      onDragStart();
    }
  };

  const handlePointerMove = (event: any) => {
    if (!isDragging || !meshRef.current) return;
    
    // Create a raycaster from the camera through the mouse position
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Create a plane at the object's Z position for dragging
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -dragStart.worldPosition.z);
    const intersectionPoint = new THREE.Vector3();
    
    raycaster.ray.intersectPlane(dragPlane, intersectionPoint);
    
    if (intersectionPoint) {
      // Calculate the offset from the initial click point
      const offset = intersectionPoint.clone().sub(dragStart.worldPosition);
      const newPosition = {
        x: dragStart.position.x + offset.x,
        y: dragStart.position.y + offset.y,
        z: dragStart.position.z
      };
      
      setLocalPosition(newPosition);
      meshRef.current.position.set(newPosition.x, newPosition.y, newPosition.z);
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;

    setIsDragging(false);
    justFinishedDraggingRef.current = true;
    
    // Get the current position from the mesh for accurate final position
    const finalPosition = meshRef.current ? {
      x: meshRef.current.position.x,
      y: meshRef.current.position.y,
      z: meshRef.current.position.z
    } : localPosition;
    
    // Update local position to match final position
    setLocalPosition(finalPosition);
    
    // Call the database update with the final position
    if (onMove) {
      onMove(object.id, finalPosition);
    }
    
    if (onDragEnd) {
      onDragEnd();
    }
    
    // Reset the flag after a short delay to allow the database update to complete
    setTimeout(() => {
      justFinishedDraggingRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalPointerMove = (event: PointerEvent) => {
        handlePointerMove(event);
      };
      
      const handleGlobalPointerUp = () => {
        handlePointerUp();
      };

      document.addEventListener('pointermove', handleGlobalPointerMove);
      document.addEventListener('pointerup', handleGlobalPointerUp);

      return () => {
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [isDragging, dragStart, camera, raycaster]);

  return (
    <mesh
      ref={meshRef}
      position={[localPosition.x, localPosition.y, localPosition.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={handlePointerDown}
    >
      {/* Use a proper 3D box instead of a plane for better 3D interaction */}
      <boxGeometry args={[1.5, 1.5, 0.1]} />
      <meshStandardMaterial 
        map={texture} 
        transparent 
        side={THREE.DoubleSide}
        emissive={hovered ? "#333333" : "#000000"}
        opacity={isDragging ? 0.8 : 1.0}
      />
      
      {/* Label and Delete Button */}
      {hovered && (
        <Html distanceFactor={10} position={[0, 1.2, 0]}>
          <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm whitespace-nowrap flex items-center gap-2">
            <span>{object.name}</span>
            {onDelete && (
              <button
                onClick={handleDelete}
                //onMouseEnter={() => setShowDeleteButton(true)}
                //onMouseLeave={() => setShowDeleteButton(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                title="Delete object"
              >
                🗑️
              </button>
            )}
          </div>
          <div className = "text-xs text-gray-500 mt-1 text-center">
            {isDragging ? "Dragging..." : "Drag to move"}
          </div>
        </Html>
      )}
    </mesh>
  );
}

/**
 * Camera controller with WASD + mouse controls
 */
function CameraController() {
  const { camera } = useThree();
  const moveSpeed = 0.15;
  const keysPressed = useRef<Set<string>>(new Set());

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

  useFrame(() => {
    const keys = keysPressed.current;
    const direction = new THREE.Vector3();

    // Get camera forward and right vectors
    camera.getWorldDirection(direction);
    const forward = direction.clone();
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize();

    // WASD movement
    if (keys.has("w")) {
      camera.position.addScaledVector(forward, moveSpeed);
    }
    if (keys.has("s")) {
      camera.position.addScaledVector(forward, -moveSpeed);
    }
    if (keys.has("a")) {
      camera.position.addScaledVector(right, moveSpeed);
    }
    if (keys.has("d")) {
      camera.position.addScaledVector(right, -moveSpeed);
    }
    
    // Up/down movement
    if (keys.has(" ") || keys.has("e")) {
      camera.position.y += moveSpeed;
    }
    if (keys.has("shift") || keys.has("q")) {
      camera.position.y -= moveSpeed;
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
 * Main AR scene component
 */
function ARScene({
  environmentTextureUrl,
  objects,
  onObjectDelete,
  onObjectMove,
}: {
  environmentTextureUrl?: string;
  objects: SceneObject[];
  onObjectDelete?: (objectId: string) => void;
  onObjectMove?: (objectId: string, position: { x: number; y: number; z: number }) => void;
}) {
  const [isAnyObjectDragging, setIsAnyObjectDragging] = useState(false);

  const handleObjectMove = (objectId: string, position: { x: number; y: number; z: number }) => {
    if (onObjectMove) {
      onObjectMove(objectId, position);
    }
  };

  const handleDragStart = () => {
    setIsAnyObjectDragging(true);
  };

  const handleDragEnd = () => {
    setIsAnyObjectDragging(false);
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.4} />

      {/* Environment */}
      {environmentTextureUrl ? (
        <Suspense fallback={null}>
          <EnvironmentSphere textureUrl={environmentTextureUrl} />
        </Suspense>
      ) : (
        <>
          <Sky sunPosition={[100, 20, 100]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[1000, 1000]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
        </>
      )}

      {/* Scene objects */}
      {objects.map((obj) => (
        <Suspense key={obj.id} fallback={<LoadingFallback />}>
          <SceneObject3D 
            object={obj} 
            onDelete={onObjectDelete} 
            onMove={handleObjectMove} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </Suspense>
      ))}

      {/* Controls */}
      <OrbitControls 
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
        enabled={!isAnyObjectDragging} //disable when dragging an object
      />
      <CameraController />
    </>
  );
}

/**
 * Audio player component
 */
function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <audio ref={audioRef} />
      <button
        onClick={togglePlay}
        className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all"
        title={isPlaying ? "Pause Music" : "Play Music"}
      >
        {isPlaying ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * Main ARViewer component
 */
export default function ARViewer({
  environmentTextureUrl,
  objects,
  audioUrl,
  onObjectMove,
  onObjectDelete,
}: ARViewerProps) {
  return (
    <div className="relative w-full h-screen">
      {/* Controls hint */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-4 py-2 rounded">
        <p className="font-semibold mb-1">Controls:</p>
        <p className="text-sm">WASD - Move | Mouse - Look | E/Q - Up/Down</p>
        <p className="text-sm mt-1">Hover over objects to delete them</p>
        <p className="text-sm mt-1">Drag to move objects</p>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 75 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <ARScene
            environmentTextureUrl={environmentTextureUrl}
            objects={objects}
            onObjectDelete={onObjectDelete}
            onObjectMove={onObjectMove}
          />
        </Suspense>
      </Canvas>

      {/* Audio player */}
      {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
    </div>
  );
}

