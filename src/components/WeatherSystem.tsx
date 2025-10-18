"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * WeatherSystem Component
 * 
 * Dynamic weather effects:
 * - Clear, Rain, Fog, Snow, Dust Storm
 * - Particle systems for precipitation
 * - Volumetric fog
 * - Wind effects
 */

export type WeatherType = "clear" | "rain" | "fog" | "snow" | "dust";

interface WeatherSystemProps {
  weather: WeatherType;
  intensity?: number; // 0-1
}

export default function WeatherSystem({
  weather,
  intensity = 0.5,
}: WeatherSystemProps) {
  if (weather === "clear") return null;

  return (
    <>
      {weather === "rain" && <RainEffect intensity={intensity} />}
      {weather === "fog" && <FogEffect intensity={intensity} />}
      {weather === "snow" && <SnowEffect intensity={intensity} />}
      {weather === "dust" && <DustEffect intensity={intensity} />}
    </>
  );
}

/**
 * Rain Effect Component
 */
function RainEffect({ intensity }: { intensity: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = Math.floor(1000 * intensity);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i] = -0.5 - Math.random() * 0.5;
    }

    return { positions, velocities };
  }, [particleCount]);

  useFrame(() => {
    if (!particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] += particles.velocities[i];

      // Reset when hitting ground
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 50;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#aaaaff" transparent opacity={0.6} />
    </points>
  );
}

/**
 * Snow Effect Component
 */
function SnowEffect({ intensity }: { intensity: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = Math.floor(500 * intensity);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i * 3] = (Math.random() - 0.5) * 0.1; // Drift
      velocities[i * 3 + 1] = -0.1 - Math.random() * 0.1; // Fall
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1; // Drift
    }

    return { positions, velocities };
  }, [particleCount]);

  useFrame(() => {
    if (!particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += particles.velocities[i * 3];
      positions[i * 3 + 1] += particles.velocities[i * 3 + 1];
      positions[i * 3 + 2] += particles.velocities[i * 3 + 2];

      // Reset when hitting ground
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 50;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.2} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
}

/**
 * Dust Effect Component
 */
function DustEffect({ intensity }: { intensity: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = Math.floor(300 * intensity);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    return positions;
  }, [particleCount]);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;

    const time = clock.getElapsedTime();
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      // Swirling motion
      positions[i * 3] += Math.sin(time + i) * 0.02;
      positions[i * 3 + 2] += Math.cos(time + i) * 0.02;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles}
          itemSize={3}
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#d4a574" transparent opacity={0.4} />
    </points>
  );
}

/**
 * Fog Effect Component
 */
function FogEffect({ intensity }: { intensity: number }) {
  const fogColor = new THREE.Color("#cccccc");

  return <fog attach="fog" args={[fogColor, 10, 50 / intensity]} />;
}

/**
 * Weather Control Panel
 */
interface WeatherControlPanelProps {
  weather: WeatherType;
  onWeatherChange: (weather: WeatherType) => void;
}

export function WeatherControlPanel({
  weather,
  onWeatherChange,
}: WeatherControlPanelProps) {
  const weathers: WeatherType[] = ["clear", "rain", "fog", "snow", "dust"];

  return (
    <div className="absolute top-64 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-4 z-10">
      <p className="text-sm font-semibold text-gray-800 mb-2">Weather</p>
      <div className="flex gap-2">
        {weathers.map((w) => (
          <button
            key={w}
            onClick={() => onWeatherChange(w)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              weather === w
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {w.charAt(0).toUpperCase() + w.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

