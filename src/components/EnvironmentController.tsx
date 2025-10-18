"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";

/**
 * EnvironmentController Component
 * 
 * Dynamic time-of-day lighting system:
 * - Dawn, Morning, Noon, Sunset, Night
 * - Animated sun/moon position
 * - Dynamic lighting and colors
 * - Atmospheric scattering
 */

export type TimeOfDay = "dawn" | "morning" | "noon" | "sunset" | "night";

interface EnvironmentControllerProps {
  timeOfDay: TimeOfDay;
  animated?: boolean;
}

export default function EnvironmentController({
  timeOfDay,
  animated: _animated = false,
}: EnvironmentControllerProps) {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  /**
   * Time-of-day configurations
   */
  const timeConfigs: Record<
    TimeOfDay,
    {
      sunPosition: [number, number, number];
      sunIntensity: number;
      ambientIntensity: number;
      ambientColor: string;
      sunColor: string;
    }
  > = {
    dawn: {
      sunPosition: [100, 10, 100],
      sunIntensity: 0.4,
      ambientIntensity: 0.3,
      ambientColor: "#c9d4e8",
      sunColor: "#ffb380",
    },
    morning: {
      sunPosition: [100, 50, 50],
      sunIntensity: 0.7,
      ambientIntensity: 0.5,
      ambientColor: "#e6f0ff",
      sunColor: "#fff5e6",
    },
    noon: {
      sunPosition: [0, 100, 0],
      sunIntensity: 1.0,
      ambientIntensity: 0.6,
      ambientColor: "#ffffff",
      sunColor: "#ffffff",
    },
    sunset: {
      sunPosition: [-100, 10, -100],
      sunIntensity: 0.5,
      ambientIntensity: 0.4,
      ambientColor: "#ff9966",
      sunColor: "#ff6b35",
    },
    night: {
      sunPosition: [-100, -50, -100],
      sunIntensity: 0.05,
      ambientIntensity: 0.2,
      ambientColor: "#1a1a3e",
      sunColor: "#9999ff",
    },
  };

  const config = timeConfigs[timeOfDay];

  /**
   * Smooth lighting transitions
   */
  useFrame(() => {
    if (!sunRef.current || !ambientRef.current) return;

    // Smoothly interpolate to target values
    const lerpSpeed = 0.02;

    // Sun position
    const targetSunPos = new THREE.Vector3(...config.sunPosition);
    sunRef.current.position.lerp(targetSunPos, lerpSpeed);

    // Sun intensity
    sunRef.current.intensity = THREE.MathUtils.lerp(
      sunRef.current.intensity,
      config.sunIntensity,
      lerpSpeed
    );

    // Ambient intensity
    ambientRef.current.intensity = THREE.MathUtils.lerp(
      ambientRef.current.intensity,
      config.ambientIntensity,
      lerpSpeed
    );

    // Colors
    sunRef.current.color.lerp(new THREE.Color(config.sunColor), lerpSpeed);
    ambientRef.current.color.lerp(new THREE.Color(config.ambientColor), lerpSpeed);
  });

  return (
    <>
      {/* Dynamic Sky */}
      <Sky
        distance={450000}
        sunPosition={config.sunPosition}
        inclination={0}
        azimuth={0.25}
      />

      {/* Directional Light (Sun) */}
      <directionalLight
        ref={sunRef}
        position={config.sunPosition}
        intensity={config.sunIntensity}
        color={config.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Ambient Light */}
      <ambientLight
        ref={ambientRef}
        intensity={config.ambientIntensity}
        color={config.ambientColor}
      />

      {/* Hemisphere Light for natural sky/ground lighting */}
      <hemisphereLight
        args={[config.ambientColor, "#443333", config.ambientIntensity * 0.5]}
      />

      {/* Night-specific elements */}
      {timeOfDay === "night" && (
        <>
          {/* Moon light */}
          <pointLight position={[50, 50, 50]} intensity={0.3} color="#9999ff" />
          
          {/* Stars (using point lights as simple representation) */}
          {Array.from({ length: 20 }).map((_, i) => (
            <pointLight
              key={i}
              position={[
                (Math.random() - 0.5) * 200,
                Math.random() * 100 + 50,
                (Math.random() - 0.5) * 200,
              ]}
              intensity={0.1}
              color="#ffffff"
            />
          ))}
        </>
      )}
    </>
  );
}

/**
 * Time of Day Control Panel
 */
interface TimeControlPanelProps {
  timeOfDay: TimeOfDay;
  onTimeChange: (time: TimeOfDay) => void;
}

export function TimeControlPanel({ timeOfDay, onTimeChange }: TimeControlPanelProps) {
  const times: TimeOfDay[] = ["dawn", "morning", "noon", "sunset", "night"];

  return (
    <div className="absolute top-40 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-4 z-10">
      <p className="text-sm font-semibold text-gray-800 mb-2">Time of Day</p>
      <div className="flex gap-2">
        {times.map((time) => (
          <button
            key={time}
            onClick={() => onTimeChange(time)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              timeOfDay === time
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {time.charAt(0).toUpperCase() + time.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

