"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PositionalAudio } from "@react-three/drei";
import * as THREE from "three";

/**
 * SpatialAudio Component
 * 
 * 3D positional audio system with Web Audio API:
 * - Ambient scene audio attached to camera
 * - Object-specific sounds at 3D positions
 * - Distance-based volume falloff
 * - Stereo panning based on listener position
 */

interface SpatialAudioProps {
  audioUrl?: string;
  position?: [number, number, number];
  isAmbient?: boolean;
  distance?: number;
  volume?: number;
  loop?: boolean;
  autoplay?: boolean;
}

export function SpatialAudioSource({
  audioUrl,
  position = [0, 0, 0],
  isAmbient = false,
  distance = 20,
  volume: _volume = 1,
  loop = true,
  autoplay = false,
}: SpatialAudioProps) {
  const audioRef = useRef<THREE.PositionalAudio | null>(null);
  const { camera } = useThree();

  /**
   * Update audio position if attached to camera (ambient)
   */
  useFrame(() => {
    if (isAmbient && audioRef.current) {
      audioRef.current.position.copy(camera.position);
    }
  });

  useEffect(() => {
    if (audioRef.current && autoplay) {
      // Delay autoplay slightly to ensure audio context is ready
      const timer = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoplay]);

  if (!audioUrl) return null;

  return (
    <group position={isAmbient ? [0, 0, 0] : position}>
      <PositionalAudio
        ref={audioRef}
        url={audioUrl}
        distance={distance}
        loop={loop}
        autoplay={autoplay}
      />
    </group>
  );
}

/**
 * Object Audio Component
 * Attaches spatial audio to a specific 3D object
 */
interface ObjectAudioProps {
  objectPosition: THREE.Vector3;
  audioUrl?: string;
  distance?: number;
  volume?: number;
}

export function ObjectAudio({
  objectPosition,
  audioUrl,
  distance = 15,
  volume = 0.7,
}: ObjectAudioProps) {
  if (!audioUrl) return null;

  return (
    <SpatialAudioSource
      audioUrl={audioUrl}
      position={[objectPosition.x, objectPosition.y, objectPosition.z]}
      distance={distance}
      volume={volume}
      loop={true}
      autoplay={false}
    />
  );
}

/**
 * Ambient Audio Manager
 * Manages overall scene ambient audio with smooth fading
 */
interface AmbientAudioManagerProps {
  audioUrl?: string;
  volume?: number;
  isPlaying?: boolean;
}

export function AmbientAudioManager({
  audioUrl,
  volume = 0.5,
  isPlaying = false,
}: AmbientAudioManagerProps) {
  const audioRef = useRef<THREE.Audio | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play();
      // Fade in
      fadeVolume(audioRef.current, 0, volume, 1000);
    } else {
      // Fade out then pause
      fadeVolume(audioRef.current, audioRef.current.getVolume(), 0, 500).then(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });
    }
  }, [isPlaying, volume]);

  if (!audioUrl) return null;

  return (
    <SpatialAudioSource
      audioUrl={audioUrl}
      isAmbient={true}
      distance={100}
      volume={volume}
      loop={true}
      autoplay={isPlaying}
    />
  );
}

/**
 * Utility: Fade audio volume smoothly
 */
function fadeVolume(
  audio: THREE.Audio | null,
  startVolume: number,
  targetVolume: number,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    if (!audio || typeof (audio as { setVolume?: (v: number) => void }).setVolume !== "function") {
      resolve();
      return;
    }

    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = (targetVolume - startVolume) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newVolume = startVolume + volumeStep * currentStep;
      (audio as { setVolume: (v: number) => void }).setVolume(newVolume);

      if (currentStep >= steps) {
        clearInterval(interval);
        resolve();
      }
    }, stepDuration);
  });
}

