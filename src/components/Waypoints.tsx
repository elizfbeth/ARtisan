"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * Waypoints Component
 * 
 * Interactive teleportation system:
 * - Glowing waypoint markers at key locations
 * - Click to teleport with smooth camera transition
 * - Hover to show labels
 * - Minimap showing waypoint positions
 */

interface Waypoint {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
}

interface WaypointsProps {
  waypoints: Waypoint[];
  onTeleport?: (waypointId: string) => void;
}

export default function Waypoints({ waypoints, onTeleport }: WaypointsProps) {
  if (!waypoints || waypoints.length === 0) return null;

  return (
    <group>
      {waypoints.map((waypoint) => (
        <WaypointMarker key={waypoint.id} waypoint={waypoint} onTeleport={onTeleport} />
      ))}
    </group>
  );
}

/**
 * Individual Waypoint Marker
 */
interface WaypointMarkerProps {
  waypoint: Waypoint;
  onTeleport?: (waypointId: string) => void;
}

function WaypointMarker({ waypoint, onTeleport }: WaypointMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  /**
   * Pulsing animation
   */
  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime();
    const scale = 1 + Math.sin(time * 2) * 0.2;
    meshRef.current.scale.set(scale, scale, scale);

    // Rotate slowly
    meshRef.current.rotation.y += 0.01;
  });

  /**
   * Handle teleport
   */
  const handleClick = () => {
    if (onTeleport) {
      onTeleport(waypoint.id);
    } else {
      // Default teleport behavior
      camera.position.set(waypoint.position.x, waypoint.position.y, waypoint.position.z);
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[waypoint.position.x, waypoint.position.y, waypoint.position.z]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Outer glow sphere */}
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial
        color={hovered ? "#ffaa00" : "#4488ff"}
        transparent
        opacity={0.6}
      />

      {/* Inner bright core */}
      <mesh scale={[0.5, 0.5, 0.5]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Hovering particles */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>

      {/* Label */}
      {hovered && (
        <Html distanceFactor={10} position={[0, 1.5, 0]}>
          <div className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg">
            <p className="font-semibold">{waypoint.label}</p>
            <p className="text-xs opacity-75 mt-1">Click to teleport</p>
          </div>
        </Html>
      )}
    </mesh>
  );
}

/**
 * Minimap showing waypoints and player position
 */
interface MinimapProps {
  waypoints: Waypoint[];
  playerPosition: { x: number; z: number };
}

export function Minimap({ waypoints, playerPosition }: MinimapProps) {
  const mapSize = 150; // World units represented
  const mapPixels = 150; // Pixels on screen

  const worldToMap = (worldPos: { x: number; z: number }) => {
    return {
      x: (worldPos.x / mapSize) * mapPixels + mapPixels / 2,
      y: (worldPos.z / mapSize) * mapPixels + mapPixels / 2,
    };
  };

  return (
    <div className="absolute bottom-24 right-4 z-10">
      <div
        className="relative bg-black bg-opacity-60 rounded-lg overflow-hidden border-2 border-white border-opacity-30"
        style={{ width: mapPixels, height: mapPixels }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Waypoints */}
        {waypoints.map((waypoint) => {
          const mapPos = worldToMap({ x: waypoint.position.x, z: waypoint.position.z });
          return (
            <div
              key={waypoint.id}
              className="absolute w-2 h-2 bg-blue-400 rounded-full"
              style={{
                left: mapPos.x - 4,
                top: mapPos.y - 4,
              }}
              title={waypoint.label}
            />
          );
        })}

        {/* Player position */}
        <div
          className="absolute w-3 h-3 bg-red-500 rounded-full animate-pulse"
          style={{
            left: worldToMap(playerPosition).x - 6,
            top: worldToMap(playerPosition).y - 6,
          }}
        />

        {/* Center indicator */}
        <div className="absolute w-1 h-1 bg-white rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />

        {/* Label */}
        <div className="absolute bottom-1 left-1 text-xs text-white opacity-75">
          Minimap
        </div>
      </div>
    </div>
  );
}





