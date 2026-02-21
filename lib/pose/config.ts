import type { InjuryArea } from "../types"

// MediaPipe Pose Landmark Indices
export const LANDMARKS = {
  // Upper body
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  // Lower body
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const

export interface PoseConfig {
  // Landmark indices for angle calculation (A -> B -> C)
  pointA: { left: number; right: number }
  pointB: { left: number; right: number } // The vertex of the angle
  pointC: { left: number; right: number }
  // Thresholds for rep counting
  upThreshold: number // Angle when considered "up" position
  downThreshold: number // Angle when considered "down" position
  // Scoring thresholds
  shallowAngle: number // Angle above which is considered shallow
  veryShallowAngle: number // Angle above which is very shallow
  // Feedback labels
  depthLabel: string
  alignmentLabel: string
  // Confidence calculation landmarks
  confidencePoints: number[]
}

export const POSE_CONFIGS: Record<InjuryArea, PoseConfig> = {
  Knee: {
    pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
    pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
    pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
    upThreshold: 165,
    downThreshold: 100,
    shallowAngle: 130,
    veryShallowAngle: 140,
    depthLabel: "Depth",
    alignmentLabel: "Knee alignment",
    confidencePoints: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
  },
  Ankle: {
    pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
    pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
    pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE }, // Track leg angle for ankle loading
    upThreshold: 165,
    downThreshold: 100,
    shallowAngle: 130,
    veryShallowAngle: 140,
    depthLabel: "Range of motion",
    alignmentLabel: "Ankle alignment",
    confidencePoints: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
  },
  Hip: {
    pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
    pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
    pointC: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
    upThreshold: 170,
    downThreshold: 120,
    shallowAngle: 150,
    veryShallowAngle: 160,
    depthLabel: "Hip depth",
    alignmentLabel: "Hip alignment",
    confidencePoints: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  },
  Shoulder: {
    pointA: { left: LANDMARKS.LEFT_ELBOW, right: LANDMARKS.RIGHT_ELBOW },
    pointB: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
    pointC: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
    upThreshold: 160,
    downThreshold: 90,
    shallowAngle: 140,
    veryShallowAngle: 150,
    depthLabel: "Range of motion",
    alignmentLabel: "Shoulder alignment",
    confidencePoints: [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
  },
  Back: {
    pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
    pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
    pointC: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
    upThreshold: 170,
    downThreshold: 130,
    shallowAngle: 160,
    veryShallowAngle: 165,
    depthLabel: "Posture",
    alignmentLabel: "Spine alignment",
    confidencePoints: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  },
}

export function getPoseConfig(injuryArea: InjuryArea): PoseConfig {
  return POSE_CONFIGS[injuryArea]
}

