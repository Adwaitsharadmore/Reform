export type Feedback =
  | "Good"
  | "Go lower"
  | "Slow down"
  | "Keep knees aligned"
  | "Step into frame";

export function getFeedback(kneeAngle: number | null): Feedback {
  if (kneeAngle == null) return "Step into frame";
  if (kneeAngle > 120) return "Go lower";
  return "Good";
}

export function scoreRep(kneeMinAngle: number) {
  // kneeMinAngle lower = deeper squat
  let score = 100;
  if (kneeMinAngle > 120) score -= 35; // too shallow
  if (kneeMinAngle > 140) score -= 30; // very shallow
  return Math.max(0, Math.min(100, score));
}