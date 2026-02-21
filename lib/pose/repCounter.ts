import type { PoseConfig } from "./config"

export type RepState = "UP" | "DOWN" | "UNKNOWN";

export function createRepCounter(config: PoseConfig) {
  let state: RepState = "UP";
  let downReached = false;
  let repCount = 0;

  const UP_THRESH = config.upThreshold;
  const DOWN_THRESH = config.downThreshold;

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