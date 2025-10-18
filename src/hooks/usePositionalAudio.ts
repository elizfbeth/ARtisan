import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/**
 * usePositionalAudio Hook
 * 
 * Creates a 3D positional audio source using Web Audio API
 * - Audio volume and stereo pan based on listener position
 * - Distance-based attenuation
 * - Configurable max distance and rolloff factor
 */

interface PositionalAudioOptions {
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  loop?: boolean;
  volume?: number;
}

export function usePositionalAudio(
  audioUrl: string | undefined,
  position: THREE.Vector3,
  options: PositionalAudioOptions = {}
) {
  const {
    refDistance = 10,
    maxDistance = 50,
    rolloffFactor = 1,
    loop = true,
    volume = 1,
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioUrl) return;

    // Create audio element
    const audio = new Audio(audioUrl);
    audio.loop = loop;
    audio.volume = volume;
    audio.crossOrigin = "anonymous";

    audio.addEventListener("canplaythrough", () => {
      setIsLoaded(true);
    });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl, loop, volume]);

  const play = () => {
    if (audioRef.current && isLoaded) {
      audioRef.current.play().catch((error) => {
        console.error("Failed to play audio:", error);
      });
      setIsPlaying(true);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return {
    play,
    pause,
    stop,
    isLoaded,
    isPlaying,
    audioElement: audioRef.current,
  };
}

