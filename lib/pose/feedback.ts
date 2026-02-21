import type { PoseConfig } from "./config"

export type Feedback =
  | "Good"
  | "Go lower"
  | "Go higher"
  | "Slow down"
  | "Keep aligned"
  | "Step into frame";

export function getFeedback(bodyAngle: number | null, config: PoseConfig): Feedback {
  if (bodyAngle == null) return "Step into frame";
  
  if (config.measurementType === 'elevation') {
    // For elevation: lower value = shallow movement
    if (bodyAngle < config.shallowAngle) return "Go higher";
    return "Good";
  } else {
    // For angles: higher angle = shallow movement
    if (bodyAngle > config.shallowAngle) return "Go lower";
    return "Good";
  }
}

export function scoreRep(minBodyAngle: number, config: PoseConfig) {
  let score = 100;
  
  if (config.measurementType === 'elevation') {
    // For elevation: lower value = shallow movement (need higher elevation)
    if (minBodyAngle < config.shallowAngle) score -= 35; // too shallow
    if (minBodyAngle < config.veryShallowAngle) score -= 30; // very shallow
  } else {
    // For angles: minBodyAngle lower = deeper movement
    if (minBodyAngle > config.shallowAngle) score -= 35; // too shallow
    if (minBodyAngle > config.veryShallowAngle) score -= 30; // very shallow
  }
  
  return Math.max(0, Math.min(100, score));
}