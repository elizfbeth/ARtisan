"use client";

import { useEffect, Suspense } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/**
 * GalleryPanoramaRenderer Component
 * 
 * Renders panoramic environments using multi-plane images:
 * - Loads multiple panorama layers at different depths
 * - Creates parallax effect as camera moves
 * - Uses equirectangular mapping for 360° view
 */

interface PanoramaLayer {
  url: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

interface GalleryPanoramaRendererProps {
  panoramas: PanoramaLayer[];
  scale?: number;
}

/**
 * Single panorama sphere layer
 */
function PanoramaLayer({ url, position, quaternion, scale = 100 }: {
  url: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale?: number;
}) {
  const texture = useTexture(url);

  useEffect(() => {
    // Configure texture for equirectangular mapping
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // Fix upside-down panoramas by flipping vertically
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, -1); // Flip vertically
    texture.offset.set(0, 1); // Adjust offset after flip
    
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[scale, 60, 40]} />
        <meshBasicMaterial
          map={texture}
          side={THREE.BackSide}
          transparent={true}
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Loading fallback for panorama layers
 */
function PanoramaLoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[50, 32, 32]} />
      <meshBasicMaterial color="#cccccc" wireframe />
    </mesh>
  );
}

/**
 * Main panorama renderer component
 */
export default function GalleryPanoramaRenderer({
  panoramas,
  scale = 100,
}: GalleryPanoramaRendererProps) {
  if (!panoramas || panoramas.length === 0) {
    console.warn("No panoramas provided to GalleryPanoramaRenderer");
    return null;
  }

  return (
    <group>
      {panoramas.map((pano, index) => {
        // Calculate layer scale based on depth (z position)
        // Layers further back should be slightly larger
        const layerScale = scale + Math.abs(pano.position[2]) * 10;
        
        return (
          <Suspense key={index} fallback={<PanoramaLoadingFallback />}>
            <PanoramaLayer
              url={pano.url}
              position={pano.position}
              quaternion={pano.quaternion}
              scale={layerScale}
            />
          </Suspense>
        );
      })}
    </group>
  );
}

