export type RepState = "UP" | "DOWN" | "UNKNOWN";

export function createRepCounter() {
  let state: RepState = "UP";
  let downReached = false;
  let repCount = 0;

  const UP_THRESH = 165;
  const DOWN_THRESH = 100;

  return {
    update(kneeAngle: number | null) {
      let repJustCounted = false;
      if (kneeAngle == null) return { repCount, state, repJustCounted };

      if (kneeAngle > UP_THRESH) {
        state = "UP";
        if (downReached) {
          repCount += 1;
          repJustCounted = true;
          downReached = false;
        }
      } else if (kneeAngle < DOWN_THRESH) {
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