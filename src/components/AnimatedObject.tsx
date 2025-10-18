"use client";

import { useRef, useState, useEffect } from "react";
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
  const [hovered, setHovered] = useState(false);
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

  // Load texture
  const texture = useTexture(object.modelUrl);

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
    if (!meshRef.current) return;

    // Apply animations only if not selected (to avoid fighting with transform controls)
    if (!isSelected) {
      // Check if this is a dragon (by name)
      if (object.name.toLowerCase().includes("dragon")) {
        updateDragonAnimation(
          meshRef.current,
          animationState,
          delta,
          basePosition.current,
          baseScale.current
        );

        // Make dragon look at camera
        makeDragonLookAt(meshRef.current, camera.position, 0.02);
      } else {
        // Generic bob animation for other objects
        const time = state.clock.getElapsedTime();
        const bobAmount = Math.sin(time * 2) * 0.05;
        meshRef.current.position.y = basePosition.current.y + bobAmount;

        // Gentle rotation
        meshRef.current.rotation.y += delta * 0.2;
      }
    }
  });

  return (
    <group>
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
        {/* Using a plane with texture for now, replace with GLTFLoader for actual models */}
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          emissive={isSelected ? "#4444ff" : hovered ? "#222222" : "#000000"}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.2 : 0}
        />

        {/* Label */}
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

      {/* Transform controls when selected */}
      {isSelected && (
        <ObjectControls
          objectRef={meshRef}
          isSelected={isSelected}
          onTransformChange={onTransformChange}
          onDelete={onDelete}
        />
      )}
    </group>
  );
}

