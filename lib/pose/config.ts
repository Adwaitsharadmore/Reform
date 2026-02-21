import type { InjuryArea, ExerciseType } from "../types"

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
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export interface AngleCheck {
  // Landmark indices for angle calculation (A -> B -> C)
  pointA: { left: number; right: number }
  pointB: { left: number; right: number } // The vertex of the angle
  pointC: { left: number; right: number }
  label: string // Label for this angle check (e.g., "Knee angle", "Trunk lean")
  // Validation thresholds
  minAngle?: number // Minimum acceptable angle (for >= checks)
  maxAngle?: number // Maximum acceptable angle (for <= checks)
  // For rep counting
  upThreshold?: number // Angle when considered "up" position
  downThreshold?: number // Angle when considered "down" position
}

export interface PoseConfig {
  // Primary angle check (used for rep counting)
  primaryAngle: AngleCheck
  // Additional angle checks for form validation
  additionalAngles?: AngleCheck[]
  // Scoring thresholds (based on primary angle or elevation)
  shallowAngle: number // Angle above which is considered shallow, or elevation below which is shallow
  veryShallowAngle: number // Angle above which is very shallow, or elevation below which is very shallow
  // Feedback labels
  depthLabel: string
  alignmentLabel: string
  // Additional check labels (beyond depth and alignment)
  additionalLabels?: string[]
  // Confidence calculation landmarks
  confidencePoints: number[]
  // For exercises where both sides may move independently (e.g., shoulder raises)
  // If true, track both sides and use the one with more movement
  trackBothSides: boolean
  // Rep time validation (in seconds)
  minRepTime?: number
  maxRepTime?: number
  // Measurement type: 'angle' or 'elevation'
  // If 'elevation', measures vertical distance from rest position instead of angle
  measurementType?: 'angle' | 'elevation'
  // For elevation-based exercises, landmark to track (ankle for calf raises)
  elevationLandmark?: { left: number; right: number }
}

// Exercise-specific pose configurations
export const EXERCISE_CONFIGS: Record<ExerciseType, PoseConfig> = {
  Squat: {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
      label: "Knee angle",
      maxAngle: 115, // ≤115° for good depth
      upThreshold: 165,
      downThreshold: 100,
    },
    additionalAngles: [
      {
        pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
        pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
        pointC: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
        label: "Trunk lean",
        maxAngle: 35, // ≤35°
      },
    ],
    shallowAngle: 130,
    veryShallowAngle: 140,
    depthLabel: "Depth",
    alignmentLabel: "Knee alignment",
    additionalLabels: ["Trunk lean"],
    confidencePoints: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
    trackBothSides: false,
    minRepTime: 1.5,
    maxRepTime: 3.0,
  },
  "Hip Hinge": {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
      pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      pointC: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      label: "Hip flexion",
      minAngle: 70,
      maxAngle: 90, // 70-90°
      upThreshold: 170,
      downThreshold: 120,
    },
    additionalAngles: [
      {
        pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
        pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
        pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
        label: "Knee angle",
        minAngle: 150, // >150°
      },
    ],
    shallowAngle: 150,
    veryShallowAngle: 160,
    depthLabel: "Hip flexion",
    alignmentLabel: "Knee angle",
    additionalLabels: ["Knee angle"],
    confidencePoints: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
    trackBothSides: false,
  },
  "Shoulder Press": {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_ELBOW, right: LANDMARKS.RIGHT_ELBOW },
      pointB: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
      pointC: { left: LANDMARKS.LEFT_WRIST, right: LANDMARKS.RIGHT_WRIST },
      label: "Elbow extension",
      minAngle: 165, // ≥165°
      upThreshold: 160,
      downThreshold: 90,
    },
    additionalAngles: [
      {
        pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
        pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
        pointC: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
        label: "Trunk lean",
        maxAngle: 10, // ≤10°
      },
      {
        pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
        pointB: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
        pointC: { left: LANDMARKS.LEFT_WRIST, right: LANDMARKS.RIGHT_WRIST },
        label: "Shoulder elevation",
        minAngle: 150, // ≥150°
      },
    ],
    shallowAngle: 140,
    veryShallowAngle: 150,
    depthLabel: "Elbow extension",
    alignmentLabel: "Shoulder alignment",
    additionalLabels: ["Trunk lean", "Shoulder elevation"],
    confidencePoints: [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_WRIST, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_WRIST],
    trackBothSides: true,
  },
  "Calf Raise": {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      pointB: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
      pointC: { left: LANDMARKS.LEFT_FOOT_INDEX, right: LANDMARKS.RIGHT_FOOT_INDEX },
      label: "Ankle elevation",
      // For elevation: upThreshold = minimum elevation to be considered "up" (on toes)
      // downThreshold = maximum elevation to be considered "down" (flat-footed)
      // Values in normalized coordinates (0.02 = 2% of frame height)
      upThreshold: 0.02, // Minimum elevation to count as "up" position
      downThreshold: 0.005, // Maximum elevation to count as "down" position (rest)
    },
    additionalAngles: [
      {
        pointA: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
        pointB: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
        pointC: { left: LANDMARKS.LEFT_FOOT_INDEX, right: LANDMARKS.RIGHT_FOOT_INDEX },
        label: "Ankle angle",
        minAngle: 160, // >160°
      },
    ],
    // For elevation: shallowAngle = minimum good elevation, veryShallowAngle = minimum acceptable elevation
    shallowAngle: 0.015, // Minimum elevation for good form (1.5% of frame height)
    veryShallowAngle: 0.01, // Minimum elevation for acceptable form (1% of frame height)
    depthLabel: "Heel elevation",
    alignmentLabel: "Ankle alignment",
    additionalLabels: ["Knee angle"],
    confidencePoints: [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_FOOT_INDEX, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_FOOT_INDEX],
    trackBothSides: false,
    measurementType: 'elevation',
    elevationLandmark: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
  },
  Lunge: {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
      label: "Knee angle",
      upThreshold: 165,
      downThreshold: 100,
    },
    shallowAngle: 130,
    veryShallowAngle: 140,
    depthLabel: "Depth",
    alignmentLabel: "Knee alignment",
    confidencePoints: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
    trackBothSides: false,
  },
  "Shoulder Raise": {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_ELBOW, right: LANDMARKS.RIGHT_ELBOW },
      pointB: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
      pointC: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      label: "Shoulder elevation",
      upThreshold: 160,
      downThreshold: 90,
    },
    shallowAngle: 140,
    veryShallowAngle: 150,
    depthLabel: "Range of motion",
    alignmentLabel: "Shoulder alignment",
    confidencePoints: [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
    trackBothSides: true,
  },
}

// Legacy injury-area based configs (for backward compatibility)
export const POSE_CONFIGS: Record<InjuryArea, PoseConfig> = {
  Knee: EXERCISE_CONFIGS.Squat,
  Ankle: {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
      label: "Leg angle",
      upThreshold: 165,
      downThreshold: 100,
    },
    shallowAngle: 130,
    veryShallowAngle: 140,
    depthLabel: "Range of motion",
    alignmentLabel: "Ankle alignment",
    confidencePoints: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
    trackBothSides: false,
  },
  Hip: EXERCISE_CONFIGS["Hip Hinge"],
  Shoulder: EXERCISE_CONFIGS["Shoulder Raise"],
  Back: {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
      pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      pointC: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      label: "Trunk angle",
      upThreshold: 170,
      downThreshold: 130,
    },
    shallowAngle: 160,
    veryShallowAngle: 165,
    depthLabel: "Posture",
    alignmentLabel: "Spine alignment",
    confidencePoints: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
    trackBothSides: false,
  },
}

export function getPoseConfig(injuryArea: InjuryArea): PoseConfig {
  return POSE_CONFIGS[injuryArea]
}

export function getExerciseConfig(exercise: ExerciseType): PoseConfig {
  return EXERCISE_CONFIGS[exercise]
}

