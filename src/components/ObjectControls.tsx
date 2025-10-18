"use client";

import { useRef, useState, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ObjectControls Component
 * 
 * Provides interactive transform controls for 3D objects:
 * - Drag to move (translate)
 * - Rotate objects
 * - Scale objects
 * - Keyboard shortcuts: G=move, R=rotate, S=scale, X=delete
 */

interface ObjectControlsProps {
  objectRef: React.RefObject<THREE.Mesh | null>;
  isSelected: boolean;
  onTransformChange?: (transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) => void;
  onDelete?: () => void;
}

export default function ObjectControls({
  objectRef,
  isSelected,
  onTransformChange,
  onDelete,
}: ObjectControlsProps) {
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");
  const transformRef = useRef(null);
  const { gl: _gl } = useThree();

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "g":
          setMode("translate");
          e.preventDefault();
          break;
        case "r":
          setMode("rotate");
          e.preventDefault();
          break;
        case "s":
          setMode("scale");
          e.preventDefault();
          break;
        case "x":
        case "delete":
          if (onDelete) {
            onDelete();
          }
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, onDelete]);

  /**
   * Handle transform end - persist changes
   */
  const handleTransformEnd = () => {
    if (!objectRef.current || !onTransformChange) return;

    const mesh = objectRef.current;
    onTransformChange({
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      rotation: {
        x: mesh.rotation.x,
        y: mesh.rotation.y,
        z: mesh.rotation.z,
      },
      scale: {
        x: mesh.scale.x,
        y: mesh.scale.y,
        z: mesh.scale.z,
      },
    });
  };

  if (!isSelected || !objectRef.current) return null;

  return (
    <TransformControls
      ref={transformRef}
      object={objectRef.current}
      mode={mode}
      onMouseUp={handleTransformEnd}
      size={0.75}
      showX={true}
      showY={true}
      showZ={true}
    />
  );
}

