"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Html, useTexture, Sphere } from "@react-three/drei";
import * as THREE from "three";

/**
 * StreetViewNavigator Component
 *
 * Google Maps Street View style navigation:
 * - 360° panoramic view
 * - Click-to-move waypoints
 * - Mouse drag to look around
 * - Smooth transitions between viewpoints
 */

interface Waypoint {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  panoramaUrl?: string;
}

interface StreetViewNavigatorProps {
  environmentTextureUrl: string;
  waypoints?: Waypoint[];
  initialPosition?: { x: number; y: number; z: number };
  locationInfo?: {
    name: string;
    description: string;
    facts: string[];
  };
}

/**
 * 360° Panoramic sphere
 */
function PanoramaSphere({ textureUrl }: { textureUrl: string }) {
  const texture = useTexture(textureUrl);

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <Sphere args={[500, 60, 40]} scale={[-1, 1, 1]}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </Sphere>
  );
}

/**
 * Waypoint marker in 3D space
 */
function WaypointMarker({
  waypoint,
  onClick,
  isActive,
}: {
  waypoint: Waypoint;
  onClick: () => void;
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.position.y =
        waypoint.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "grab";
  }, [hovered]);

  if (isActive) return null;

  return (
    <group
      position={[waypoint.position.x, waypoint.position.y, waypoint.position.z]}
    >
      {/* Waypoint ring */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshBasicMaterial
          color={hovered ? "#4CAF50" : "#2196F3"}
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Center dot */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Label */}
      {hovered && (
        <Html distanceFactor={10} position={[0, 1, 0]}>
          <div className="bg-black bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg">
            <div className="font-semibold">{waypoint.label}</div>
            <div className="text-xs opacity-75 mt-1">Click to move here</div>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Street View camera controller
 */
function StreetViewCamera({
  targetPosition,
  onTransitionComplete,
}: {
  targetPosition: { x: number; y: number; z: number };
  onTransitionComplete: () => void;
}) {
  const { camera } = useThree();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const rotation = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    // Check if we need to transition to new position
    const currentPos = camera.position;
    const distance = Math.sqrt(
      Math.pow(currentPos.x - targetPosition.x, 2) +
        Math.pow(currentPos.y - targetPosition.y, 2) +
        Math.pow(currentPos.z - targetPosition.z, 2)
    );

    if (distance > 0.1) {
      setIsTransitioning(true);
    }
  }, [targetPosition, camera]);

  useFrame(() => {
    if (isTransitioning) {
      // Smooth transition to target position
      camera.position.lerp(
        new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
        0.1
      );

      const distance = camera.position.distanceTo(
        new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)
      );

      if (distance < 0.1) {
        setIsTransitioning(false);
        onTransitionComplete();
      }
    }
  });

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      rotation.current.yaw -= deltaX * 0.003;
      rotation.current.pitch -= deltaY * 0.003;

      // Limit pitch to prevent flipping
      rotation.current.pitch = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, rotation.current.pitch)
      );

      // Apply rotation to camera
      camera.rotation.order = "YXZ";
      camera.rotation.y = rotation.current.yaw;
      camera.rotation.x = rotation.current.pitch;

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "grab";
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [camera]);

  return null;
}

/**
 * Location info panel
 */
function LocationInfoPanel({
  locationInfo,
  onClose,
}: {
  locationInfo: { name: string; description: string; facts: string[] };
  onClose: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-10 bg-black bg-opacity-90 text-white p-4 rounded-lg max-w-md shadow-xl">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold">{locationInfo.name}</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <p className="text-sm mb-3 opacity-90">{locationInfo.description}</p>
      {locationInfo.facts.length > 0 && (
        <div className="text-xs space-y-1">
          <p className="font-semibold opacity-75">Interesting Facts:</p>
          <ul className="list-disc list-inside space-y-1 opacity-75">
            {locationInfo.facts.map((fact, i) => (
              <li key={i}>{fact}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Street View Scene
 */
function StreetViewScene({
  environmentTextureUrl,
  waypoints = [],
  currentPosition,
  onWaypointClick,
  onTransitionComplete,
}: {
  environmentTextureUrl: string;
  waypoints: Waypoint[];
  currentPosition: { x: number; y: number; z: number };
  onWaypointClick: (waypoint: Waypoint) => void;
  onTransitionComplete: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />

      {/* 360° Panorama */}
      <Suspense fallback={null}>
        <PanoramaSphere textureUrl={environmentTextureUrl} />
      </Suspense>

      {/* Waypoint markers */}
      {waypoints.map((waypoint) => (
        <WaypointMarker
          key={waypoint.id}
          waypoint={waypoint}
          onClick={() => onWaypointClick(waypoint)}
          isActive={
            waypoint.position.x === currentPosition.x &&
            waypoint.position.y === currentPosition.y &&
            waypoint.position.z === currentPosition.z
          }
        />
      ))}

      {/* Camera controller */}
      <StreetViewCamera
        targetPosition={currentPosition}
        onTransitionComplete={onTransitionComplete}
      />
    </>
  );
}

/**
 * Main Street View Navigator Component
 */
export default function StreetViewNavigator({
  environmentTextureUrl,
  waypoints = [],
  initialPosition = { x: 0, y: 1.6, z: 0 },
  locationInfo,
}: StreetViewNavigatorProps) {
  const [currentPosition, setCurrentPosition] = useState(initialPosition);
  const [showInfo, setShowInfo] = useState(true);

  const handleWaypointClick = (waypoint: Waypoint) => {
    setCurrentPosition(waypoint.position);
  };

  return (
    <div className="relative w-full h-screen">
      {/* Controls hint */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
        <p className="font-semibold mb-1">Street View Controls:</p>
        <p className="text-sm">Drag Mouse - Look Around</p>
        <p className="text-sm">Click Blue Circles - Move to Location</p>
      </div>

      {/* Location info panel */}
      {locationInfo && showInfo && (
        <LocationInfoPanel
          locationInfo={locationInfo}
          onClose={() => setShowInfo(false)}
        />
      )}

      {/* Info toggle button */}
      {locationInfo && !showInfo && (
        <button
          onClick={() => setShowInfo(true)}
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-75 hover:bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm"
        >
          ℹ️ Show Info
        </button>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [initialPosition.x, initialPosition.y, initialPosition.z],
          fov: 75,
        }}
      >
        <StreetViewScene
          environmentTextureUrl={environmentTextureUrl}
          waypoints={waypoints}
          currentPosition={currentPosition}
          onWaypointClick={handleWaypointClick}
          onTransitionComplete={() => {}}
        />
      </Canvas>
    </div>
  );
}
