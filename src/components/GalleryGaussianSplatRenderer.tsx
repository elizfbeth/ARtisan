"use client";

import { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GalleryGaussianSplatRenderer Component
 * 
 * Renders 3D environments using Gaussian Splatting (SPZ format):
 * - Loads SPZ splat files
 * - Creates navigable 3D space
 * - Supports first-person WASD navigation
 * 
 * Note: This uses a simplified point cloud approach.
 * For full Gaussian Splat rendering, consider using:
 * - @react-three/drei GaussianSplat (if available)
 * - Or integrate with gsplat.js / luma-web libraries
 */

interface GalleryGaussianSplatRendererProps {
  spzUrl: string;
  colliderUrl?: string;
}

/**
 * Load and render Gaussian Splat as point cloud
 * This is a simplified approach - proper Gaussian Splat requires specialized shaders
 */
export default function GalleryGaussianSplatRenderer({
  spzUrl,
  colliderUrl,
}: GalleryGaussianSplatRendererProps) {
  const { scene } = useThree();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const loadSplat = async () => {
      try {
        setLoading(true);
        console.log("Loading Gaussian Splat from:", spzUrl);
        
        // For now, load the collision mesh for navigation
        // This provides a 3D structure to navigate through
        if (colliderUrl) {
          console.log("Loading collision mesh for navigation:", colliderUrl);
          
          const loader = new THREE.GLTFLoader();
          const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(
              colliderUrl,
              resolve,
              undefined,
              reject
            );
          });
          
          // Add the collision mesh to the scene (invisible but provides structure)
          const collisionMesh = gltf.scene;
          collisionMesh.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
              // Make mesh invisible but keep for collision detection
              child.material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: false,
                transparent: true,
                opacity: 0.0,
              });
              child.visible = false; // Hide collision mesh
            }
          });
          
          scene.add(collisionMesh);
          console.log("Collision mesh loaded and added to scene");
        }
        
        // TODO: Implement proper Gaussian Splat rendering
        // For now, we'll rely on the panoramas for visuals
        // and use the collision mesh for navigation
        
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Failed to load Gaussian Splat:", err);
        setError("Failed to load 3D environment");
        setLoading(false);
      }
    };

    loadSplat();

    return () => {
      // Cleanup
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
    };
  }, [spzUrl, colliderUrl, scene]);

  useFrame(() => {
    // Animation frame for any dynamic updates
  });

  if (loading) {
    return null; // Loading handled by parent
  }

  if (error) {
    return null; // Error handled by parent
  }

  return (
    <group>
      {/* Placeholder - actual Gaussian Splat rendering would go here */}
      {/* The collision mesh is added directly to the scene above */}
    </group>
  );
}

/**
 * Helper: Add GLTFLoader to THREE namespace if not present
 */
declare global {
  interface Window {
    THREE: typeof THREE;
  }
}

// Extend THREE with GLTFLoader
if (typeof window !== "undefined") {
  window.THREE = THREE;
  
  // Import GLTFLoader dynamically
  import("three/examples/jsm/loaders/GLTFLoader.js").then((module) => {
    (THREE as any).GLTFLoader = module.GLTFLoader;
  });
}

