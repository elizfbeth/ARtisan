"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

/**
 * FeedbackEffects Component
 * 
 * Visual feedback and post-processing effects:
 * - Bloom for magical glow
 * - Vignette for focus
 * - Chromatic aberration for drama
 * - Screen shake on impacts
 */

interface FeedbackEffectsProps {
  enableBloom?: boolean;
  enableVignette?: boolean;
  enableChromaticAberration?: boolean;
  screenShake?: number; // 0-1 intensity
}

export default function FeedbackEffects({
  enableBloom = true,
  enableVignette = true,
  enableChromaticAberration = false,
  screenShake = 0,
}: FeedbackEffectsProps) {
  const { camera } = useThree();
  const shakeIntensity = useRef(0);

  /**
   * Apply screen shake
   */
  useFrame(() => {
    if (screenShake > 0) {
      shakeIntensity.current = screenShake;
    }

    // Decay shake over time
    if (shakeIntensity.current > 0) {
      const shake = shakeIntensity.current;
      camera.position.x += (Math.random() - 0.5) * shake * 0.1;
      camera.position.y += (Math.random() - 0.5) * shake * 0.1;
      camera.rotation.z += (Math.random() - 0.5) * shake * 0.01;

      shakeIntensity.current *= 0.9; // Decay
    }
  });

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        intensity={enableBloom ? 0.5 : 0}
        mipmapBlur
      />
      
      <Vignette
        offset={0.3}
        darkness={enableVignette ? 0.5 : 0}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
      
      <ChromaticAberration
        offset={new THREE.Vector2(
          enableChromaticAberration ? 0.001 : 0,
          enableChromaticAberration ? 0.001 : 0
        )}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

/**
 * Visual Feedback Manager Hook
 */
export function useVisualFeedback() {
  const shake = useRef(0);

  const triggerShake = (intensity: number = 0.5) => {
    shake.current = Math.max(shake.current, intensity);
  };

  const getShakeValue = () => shake.current;

  return {
    triggerShake,
    getShakeValue,
  };
}

