import * as THREE from "three";

/**
 * Dragon Animation System
 * 
 * Procedural animations for dragon objects:
 * - Breathing (scale pulse)
 * - Wing flapping (rotation cycles)
 * - Hovering (sine wave motion)
 * - Looking at player (head tracking)
 */

export interface DragonAnimationState {
  time: number;
  breathingPhase: number;
  wingFlapPhase: number;
  hoverPhase: number;
}

/**
 * Initialize animation state
 */
export function createDragonAnimationState(): DragonAnimationState {
  return {
    time: 0,
    breathingPhase: 0,
    wingFlapPhase: 0,
    hoverPhase: 0,
  };
}

/**
 * Update dragon animation
 */
export function updateDragonAnimation(
  mesh: THREE.Mesh,
  state: DragonAnimationState,
  delta: number,
  basePosition: THREE.Vector3,
  baseScale: THREE.Vector3
): void {
  state.time += delta;

  // Breathing animation (subtle scale pulse)
  state.breathingPhase = Math.sin(state.time * 2) * 0.03 + 1;
  mesh.scale.set(
    baseScale.x * state.breathingPhase,
    baseScale.y * state.breathingPhase,
    baseScale.z * state.breathingPhase
  );

  // Hovering motion (vertical sine wave)
  state.hoverPhase = Math.sin(state.time * 1.5) * 0.2;
  mesh.position.set(
    basePosition.x,
    basePosition.y + state.hoverPhase,
    basePosition.z
  );

  // Gentle rotation (makes dragon seem alive)
  state.wingFlapPhase = Math.sin(state.time * 3) * 0.1;
  mesh.rotation.z = state.wingFlapPhase;
}

/**
 * Make dragon look at target position
 */
export function makeDragonLookAt(
  mesh: THREE.Mesh,
  targetPosition: THREE.Vector3,
  smoothing: number = 0.05
): void {
  // Calculate direction to target
  const direction = new THREE.Vector3()
    .subVectors(targetPosition, mesh.position)
    .normalize();

  // Calculate target rotation
  const targetRotation = Math.atan2(direction.x, direction.z);

  // Smoothly interpolate rotation
  const currentRotation = mesh.rotation.y;
  const angleDiff = targetRotation - currentRotation;

  // Normalize angle difference to [-PI, PI]
  const normalizedDiff =
    Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * smoothing;

  mesh.rotation.y += normalizedDiff;
}





