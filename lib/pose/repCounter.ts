import type { PoseConfig } from "./config"

export type RepState = "UP" | "DOWN" | "UNKNOWN";

export function createRepCounter(config: PoseConfig) {
  let state: RepState = "UP";
  let downReached = false;
  let repCount = 0;

  // Support both old and new config structures
  const UP_THRESH = config.primaryAngle?.upThreshold ?? (config as any).upThreshold ?? 165;
  const DOWN_THRESH = config.primaryAngle?.downThreshold ?? (config as any).downThreshold ?? 100;

  return {
    update(bodyAngle: number | null) {
      let repJustCounted = false;
      if (bodyAngle == null) return { repCount, state, repJustCounted };

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

      return { repCount, state, repJustCounted };
    },
    get() {
      return { repCount, state };
    },
    reset() {
      state = "UP";
      downReached = false;
      repCount = 0;
    },
  };
}