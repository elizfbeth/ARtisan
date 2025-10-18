"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * CameraController Component
 * 
 * Multi-mode camera system with smooth transitions:
 * - First-Person: WASD + mouse look
 * - Orbit: Rotate around scene center
 * - Bird's Eye: Top-down view
 * - Cinematic: Automated camera path
 * 
 * Press Tab to cycle between modes
 */

export type CameraMode = "first-person" | "orbit" | "birds-eye" | "cinematic";

interface CameraControllerProps {
  mode: CameraMode;
  onModeChange?: (mode: CameraMode) => void;
  enableTransitions?: boolean;
}

export default function CameraController({
  mode,
  onModeChange,
  enableTransitions = true,
}: CameraControllerProps) {
  const { camera } = useThree();
  const orbitRef = useRef(null);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const isTransitioning = useRef(false);
  const transitionProgress = useRef(0);

  /**
   * Camera mode configurations
   */
  const modeConfigs: Record<
    CameraMode,
    { position: THREE.Vector3; lookAt: THREE.Vector3 }
  > = {
    "first-person": {
      position: new THREE.Vector3(0, 1.6, 5),
      lookAt: new THREE.Vector3(0, 1.6, 0),
    },
    orbit: {
      position: new THREE.Vector3(10, 5, 10),
      lookAt: new THREE.Vector3(0, 0, 0),
    },
    "birds-eye": {
      position: new THREE.Vector3(0, 30, 0),
      lookAt: new THREE.Vector3(0, 0, 0),
    },
    cinematic: {
      position: new THREE.Vector3(15, 5, 15),
      lookAt: new THREE.Vector3(0, 0, 0),
    },
  };

  /**
   * Handle mode transitions
   */
  useEffect(() => {
    if (!enableTransitions) {
      const config = modeConfigs[mode];
      camera.position.copy(config.position);
      camera.lookAt(config.lookAt);
      return;
    }

    const config = modeConfigs[mode];
    targetPosition.current.copy(config.position);
    targetLookAt.current.copy(config.lookAt);
    isTransitioning.current = true;
    transitionProgress.current = 0;
  }, [mode, enableTransitions]);

  /**
   * Smooth camera transition animation
   */
  useFrame((state, delta) => {
    if (isTransitioning.current) {
      transitionProgress.current += delta * 2; // 0.5 second transition

      if (transitionProgress.current >= 1) {
        transitionProgress.current = 1;
        isTransitioning.current = false;
      }

      // Smooth easing function (ease-in-out)
      const t = transitionProgress.current;
      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Lerp camera position
      camera.position.lerp(targetPosition.current, easedT);

      // Smoothly look at target
      const currentLookAt = new THREE.Vector3();
      camera.getWorldDirection(currentLookAt);
      currentLookAt.add(camera.position);
      currentLookAt.lerp(targetLookAt.current, easedT);
      camera.lookAt(currentLookAt);
    }

    // Cinematic mode: auto-rotate camera
    if (mode === "cinematic" && !isTransitioning.current) {
      const time = state.clock.getElapsedTime();
      const radius = 15;
      camera.position.x = Math.sin(time * 0.2) * radius;
      camera.position.z = Math.cos(time * 0.2) * radius;
      camera.position.y = 5 + Math.sin(time * 0.1) * 2;
      camera.lookAt(0, 0, 0);
    }
  });

  /**
   * Keyboard shortcut to cycle modes
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && onModeChange) {
        e.preventDefault();
        const modes: CameraMode[] = ["first-person", "orbit", "birds-eye", "cinematic"];
        const currentIndex = modes.indexOf(mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        onModeChange(modes[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, onModeChange]);

  // Only show OrbitControls in orbit mode
  if (mode === "orbit") {
    return <OrbitControls ref={orbitRef} enableDamping dampingFactor={0.05} />;
  }

  return null;
}

/**
 * Camera Mode HUD
 * Shows current camera mode and instructions
 */
interface CameraModeHUDProps {
  mode: CameraMode;
}

export function CameraModeHUD({ mode }: CameraModeHUDProps) {
  const modeLabels: Record<CameraMode, string> = {
    "first-person": "First Person",
    orbit: "Orbit",
    "birds-eye": "Bird's Eye",
    cinematic: "Cinematic",
  };

  const modeInstructions: Record<CameraMode, string> = {
    "first-person": "WASD to move, Mouse to look",
    orbit: "Drag to rotate, Scroll to zoom",
    "birds-eye": "Top-down view",
    cinematic: "Automated camera path",
  };

  return (
    <div className="absolute top-20 left-4 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
      <p className="text-sm font-semibold">{modeLabels[mode]}</p>
      <p className="text-xs opacity-75">{modeInstructions[mode]}</p>
      <p className="text-xs opacity-50 mt-1">Press Tab to switch mode</p>
    </div>
  );
}

