"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  createDragonAnimationState,
  updateDragonAnimation,
  makeDragonLookAt,
  DragonAnimationState,
} from "@/animations/dragonAnimation";
import ObjectControls from "./ObjectControls";
import GLBModel from "./GLBModel";

/**
 * AnimatedObject Component
 * 
 * Renders a 3D object with animations:
 * - Dragon-specific animations (breathing, hovering, looking)
 * - Generic animations (rotation, bobbing)
 * - Interactive transform controls when selected
 * - Physics integration (optional)
 */

interface SceneObject {
  id: string;
  name: string;
  modelUrl: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

interface AnimatedObjectProps {
  object: SceneObject;
  isSelected?: boolean;
  onSelect?: () => void;
  onTransformChange?: (transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) => void;
  onDelete?: () => void;
  enablePhysics?: boolean;
}

export default function AnimatedObject({
  object,
  isSelected = false,
  onSelect,
  onTransformChange,
  onDelete,
  enablePhysics: _enablePhysics = false,
}: AnimatedObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [animationState] = useState<DragonAnimationState>(
    createDragonAnimationState()
  );
  const { camera } = useThree();

  // Base transform values (for animation reference)
  const basePosition = useRef(
    new THREE.Vector3(object.position.x, object.position.y, object.position.z)
  );
  const baseScale = useRef(
    new THREE.Vector3(object.scale.x, object.scale.y, object.scale.z)
  );

  // Determine if this is a GLB model or 2D image
  const isGLB = object.modelUrl.endsWith(".glb") || 
                object.modelUrl.includes("model/gltf") ||
                object.modelUrl.includes(".gltf");

  // Determine texture URL - for GLB models, provide a data URL placeholder to satisfy hook requirements
  // This ensures useTexture is always called with a valid URL, maintaining hook order consistency
  // 1x1 transparent PNG data URL
  const placeholderDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const textureUrl = (!isGLB || useFallback) ? object.modelUrl : placeholderDataUrl;
  
  // Always call useTexture unconditionally (Rules of Hooks requirement)
  // This satisfies React's hook ordering rules
  const texture = useTexture(textureUrl);

  /**
   * Update base position when object changes
   */
  useEffect(() => {
    basePosition.current.set(object.position.x, object.position.y, object.position.z);
    baseScale.current.set(object.scale.x, object.scale.y, object.scale.z);
  }, [object.position, object.scale]);

  /**
   * Cursor style based on hover state
   */
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
  }, [hovered]);

  /**
   * Animation loop
   */
  useFrame((state, delta) => {
    // For GLB models, animate the group
    const targetRef = isGLB && !useFallback ? groupRef.current : meshRef.current;
    if (!targetRef) return;

    // Apply animations only if not selected (to avoid fighting with transform controls)
    if (!isSelected) {
      // Check if this is a dragon (by name)
      if (object.name.toLowerCase().includes("dragon")) {
        updateDragonAnimation(
          targetRef as THREE.Mesh,
          animationState,
          delta,
          basePosition.current,
          baseScale.current
        );

        // Make dragon look at camera
        makeDragonLookAt(targetRef as THREE.Mesh, camera.position, 0.02);
      } else {
        // Generic bob animation for other objects
        const time = state.clock.getElapsedTime();
        const bobAmount = Math.sin(time * 2) * 0.05;
        targetRef.position.y = basePosition.current.y + bobAmount;

        // Gentle rotation for 2D sprites only
        if (!isGLB || useFallback) {
          targetRef.rotation.y += delta * 0.2;
        }
      }
    }
  });

  /**
   * Loading fallback component for GLB models
   */
  const LoadingBox = () => (
    <mesh position={[object.position.x, object.position.y, object.position.z]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#cccccc" wireframe />
    </mesh>
  );

  return (
    <group>
      {/* Render GLB model or fallback to 2D sprite */}
      {isGLB && !useFallback ? (
        <group
          ref={groupRef}
          position={[object.position.x, object.position.y, object.position.z]}
          rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
          scale={[object.scale.x, object.scale.y, object.scale.z]}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect();
          }}
        >
          <Suspense fallback={<LoadingBox />}>
            <GLBModel
              url={object.modelUrl}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              onError={() => {
                console.error("Failed to load GLB model, falling back to 2D");
                setUseFallback(true);
              }}
              castShadow
              receiveShadow
            />
          </Suspense>

          {/* Label for GLB models */}
          {(hovered || isSelected) && (
            <Html distanceFactor={10} position={[0, 2, 0]}>
              <div
                className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-black bg-opacity-75 text-white"
                }`}
              >
                {object.name}
                {isSelected && (
                  <span className="ml-2 text-xs opacity-75">(Selected)</span>
                )}
              </div>
            </Html>
          )}
        </group>
      ) : (
        // Fallback: 2D sprite rendering
        <mesh
          ref={meshRef}
          position={[object.position.x, object.position.y, object.position.z]}
          rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
          scale={[object.scale.x, object.scale.y, object.scale.z]}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect();
          }}
          castShadow
          receiveShadow
        >
          <planeGeometry args={[2, 2]} />
          <meshStandardMaterial
            map={texture}
            transparent
            side={THREE.DoubleSide}
            emissive={isSelected ? "#4444ff" : hovered ? "#222222" : "#000000"}
            emissiveIntensity={isSelected ? 0.5 : hovered ? 0.2 : 0}
          />

          {/* Label for 2D sprites */}
          {(hovered || isSelected) && (
            <Html distanceFactor={10} position={[0, 1.5, 0]}>
              <div
                className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-black bg-opacity-75 text-white"
                }`}
              >
                {object.name}
                {isSelected && (
                  <span className="ml-2 text-xs opacity-75">(Selected)</span>
                )}
              </div>
            </Html>
          )}
        </mesh>
      )}

      {/* Transform controls when selected */}
      {isSelected && (
        <ObjectControls
          objectRef={isGLB && !useFallback ? groupRef : meshRef}
          isSelected={isSelected}
          onTransformChange={onTransformChange}
          onDelete={onDelete}
        />
      )}
    </group>
  );
}

