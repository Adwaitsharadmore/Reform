import type { PoseConfig } from "./config"

export type Feedback =
  | "Good"
  | "Go lower"
  | "Slow down"
  | "Keep aligned"
  | "Step into frame";

export function getFeedback(bodyAngle: number | null, config: PoseConfig): Feedback {
  if (bodyAngle == null) return "Step into frame";
  if (bodyAngle > config.shallowAngle) return "Go lower";
  return "Good";
}

export function scoreRep(minBodyAngle: number, config: PoseConfig) {
  // minBodyAngle lower = deeper movement
  let score = 100;
  if (minBodyAngle > config.shallowAngle) score -= 35; // too shallow
  if (minBodyAngle > config.veryShallowAngle) score -= 30; // very shallow
  return Math.max(0, Math.min(100, score));
}