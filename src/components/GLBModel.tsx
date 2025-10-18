"use client";

import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * GLBModel Component
 * 
 * Loads and renders GLB/GLTF 3D models in the scene
 * - Automatically enables shadows on all meshes
 * - Applies position, rotation, and scale transforms
 * - Handles loading errors gracefully
 */

interface GLBModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onError?: () => void;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export default function GLBModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  onError,
  castShadow = true,
  receiveShadow = true,
}: GLBModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const errorReportedRef = useRef(false);
  
  // Load the GLB model - useGLTF must be called unconditionally
  // Errors are handled by Suspense boundaries and error callbacks
  const gltf = useGLTF(url);
  const { scene } = gltf;

  /**
   * Handle loading errors after render (to avoid setState during render)
   */
  useEffect(() => {
    if (!scene && onError && !errorReportedRef.current) {
      errorReportedRef.current = true;
      console.error("Failed to load GLB model:", url);
      // Defer error callback to next tick to avoid setState during render
      setTimeout(() => {
        onError();
      }, 0);
    }
  }, [scene, onError, url]);

  /**
   * Configure shadows and materials for all meshes in the model
   */
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Enable shadows
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;

        // Ensure materials are properly configured
        if (child.material) {
          // Handle both single materials and material arrays
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((material) => {
            // Enable proper lighting for standard materials
            if (material instanceof THREE.MeshStandardMaterial) {
              material.needsUpdate = true;
            }
          });
        }
      }
    });
  }, [scene, castShadow, receiveShadow]);

  /**
   * Apply transforms to the model group
   */
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
      groupRef.current.rotation.set(...rotation);
      groupRef.current.scale.set(...scale);
    }
  }, [position, rotation, scale]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

/**
 * Preload GLB models to improve performance
 * Usage: GLBModel.preload('/path/to/model.glb')
 */
GLBModel.preload = (url: string) => {
  useGLTF.preload(url);
};



