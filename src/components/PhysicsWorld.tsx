"use client";

import { ReactNode } from "react";
import { Physics, RigidBody } from "@react-three/rapier";

/**
 * PhysicsWorld Component
 * 
 * Wraps the 3D scene in a physics simulation:
 * - Realistic object interactions
 * - Collision detection
 * - Gravity and forces
 * - Interactive physics bodies
 */

interface PhysicsWorldProps {
  children: ReactNode;
  gravity?: [number, number, number];
  debug?: boolean;
}

export default function PhysicsWorld({
  children,
  gravity = [0, -9.81, 0],
  debug = false,
}: PhysicsWorldProps) {
  return (
    <Physics gravity={gravity} debug={debug}>
      {children}
    </Physics>
  );
}

/**
 * PhysicsObject Component
 * Makes an object interactive with physics
 */
interface PhysicsObjectProps {
  children: ReactNode;
  type?: "fixed" | "dynamic" | "kinematicPosition";
  mass?: number;
  restitution?: number; // Bounciness
  friction?: number;
}

export function PhysicsObject({
  children,
  type = "dynamic",
  mass = 1,
  restitution = 0.3,
  friction = 0.5,
}: PhysicsObjectProps) {
  return (
    <RigidBody
      type={type}
      mass={mass}
      restitution={restitution}
      friction={friction}
      colliders="cuboid"
    >
      {children}
    </RigidBody>
  );
}

/**
 * Ground Plane with Collision
 */
export function PhysicsGround() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
    </RigidBody>
  );
}

