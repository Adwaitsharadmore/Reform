import type { PoseConfig } from "./config"

export type RepState = "UP" | "DOWN" | "UNKNOWN";

export function createRepCounter(config: PoseConfig) {
  let state: RepState = "UNKNOWN";
  let downReached = false;
  let repCount = 0;
  let initialized = false;

  // Support both old and new config structures
  const UP_THRESH = config.primaryAngle?.upThreshold ?? (config as any).upThreshold ?? 165;
  const DOWN_THRESH = config.primaryAngle?.downThreshold ?? (config as any).downThreshold ?? 100;
  const isElevation = config.measurementType === 'elevation';

  return {
    update(bodyAngle: number | null) {
      let repJustCounted = false;
      if (bodyAngle == null) return { repCount, state, repJustCounted };

      // Initialize state based on first valid angle
      if (!initialized) {
        if (isElevation) {
          state = bodyAngle >= UP_THRESH ? "UP" : bodyAngle <= DOWN_THRESH ? "DOWN" : "UNKNOWN";
        } else {
          state = bodyAngle > UP_THRESH ? "UP" : bodyAngle < DOWN_THRESH ? "DOWN" : "UNKNOWN";
        }
        // If starting in DOWN state, mark downReached so first rep can be counted
        if (state === "DOWN") {
          downReached = true;
        }
        initialized = true;
      }

      if (isElevation) {
        // For elevation: higher value = up position, lower value = down position
        // UP_THRESH = minimum elevation to be "up", DOWN_THRESH = maximum elevation to be "down"
        if (bodyAngle >= UP_THRESH) {
          state = "UP";
          if (downReached) {
            repCount += 1;
            repJustCounted = true;
            downReached = false;
          }
        } else if (bodyAngle <= DOWN_THRESH) {
          state = "DOWN";
          downReached = true;
        }
      } else {
        // For angles: higher angle = up position, lower angle = down position
        if (bodyAngle > UP_THRESH) {
          state = "UP";
          if (downReached) {
            repCount += 1;
            repJustCounted = true;
            downReached = false;
          }
        } else if (bodyAngle < DOWN_THRESH) {
          state = "DOWN";
          downReached = true;
        }
      }

      return { repCount, state, repJustCounted };
    },
    get() {
      return { repCount, state };
    },
    reset() {
      state = "UNKNOWN";
      downReached = false;
      repCount = 0;
      initialized = false;
    },
  };
}