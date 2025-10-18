import { useCallback } from "react";

/**
 * useHaptics Hook
 * 
 * Provides haptic feedback using the Vibration API
 * - Light, medium, heavy vibrations
 * - Custom patterns
 * - Gracefully degrades if not supported
 */

export type HapticIntensity = "light" | "medium" | "heavy";

export function useHaptics() {
  /**
   * Check if haptics are supported
   */
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  /**
   * Trigger vibration with specified intensity
   */
  const vibrate = useCallback(
    (intensity: HapticIntensity = "medium") => {
      if (!isSupported) return;

      const patterns: Record<HapticIntensity, number[]> = {
        light: [10],
        medium: [20],
        heavy: [50],
      };

      navigator.vibrate(patterns[intensity]);
    },
    [isSupported]
  );

  /**
   * Trigger custom vibration pattern
   */
  const vibratePattern = useCallback(
    (pattern: number[]) => {
      if (!isSupported) return;
      navigator.vibrate(pattern);
    },
    [isSupported]
  );

  /**
   * Stop any ongoing vibration
   */
  const stopVibration = useCallback(() => {
    if (!isSupported) return;
    navigator.vibrate(0);
  }, [isSupported]);

  /**
   * Predefined haptic patterns
   */
  const patterns = {
    success: () => vibratePattern([10, 50, 10]),
    error: () => vibratePattern([50, 100, 50]),
    notification: () => vibratePattern([20]),
    collision: () => vibratePattern([30, 10, 30]),
    pickup: () => vibratePattern([10, 20]),
  };

  return {
    isSupported,
    vibrate,
    vibratePattern,
    stopVibration,
    patterns,
  };
}





