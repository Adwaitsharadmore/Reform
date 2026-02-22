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
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
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

export interface CoachingInstructions {
  title: string                 // e.g. "Squat coaching"
  setup: string[]               // setup cues shown before/at start
  // Deterministic rep script (primary instruction system)
  repScript?: {
    rest?: string               // instruction during rest/between reps (optional)
    up: string                 // instruction while moving up (at rep state up)
    down: string               // instruction while going back to rest (moving down)
  }
  // Phase-specific cues for dynamic coaching (kept for future use)
  cuesDown?: string[]           // cues shown when going down (eccentric)
  cuesUp?: string[]             // cues shown when going up (concentric)
  cuesHoldBottom?: string[]     // cues shown when holding at bottom
  cuesHoldTop?: string[]        // cues shown when holding at top
  cuesRest?: string[]           // cues shown during rest
  // Form correction cues (shown when form issues detected)
  formCorrections?: {
    depth?: string[]            // when depth is insufficient
    alignment?: string[]       // when alignment is off
    tempo?: string[]          // when tempo is off
    [key: string]: string[] | undefined // allow custom correction keys
  }
  tempo?: { 
    downSec?: { min: number; max: number }
    upSec?: { min: number; max: number }
    holdBottomSec?: { min: number; max: number }
    holdTopSec?: { min: number; max: number }
  }
  breathing?: {
    down?: string               // breathing cue for going down
    up?: string                // breathing cue for going up
    hold?: string              // breathing cue for holding
  }
  commonMistakes?: string[]     // optional
  qualityRules?: {
    tooFastMsg?: string         // what to say when rep is too fast
    tooSlowMsg?: string         // what to say when rep is too slow
    holdMsg?: string            // what to say to hold
  }
  // Legacy support - will be used as fallback
  execution?: string[]           // live cues shown during movement (fallback)
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
  // Tempo targets for phase-specific timing
  tempo?: {
    downSec?: { min: number; max: number }
    upSec?: { min: number; max: number }
    holdBottomSec?: { min: number; max: number }
    holdTopSec?: { min: number; max: number }
  }
  // Measurement type: 'angle' or 'elevation'
  // If 'elevation', measures vertical distance from rest position instead of angle
  measurementType?: 'angle' | 'elevation'
  // For elevation-based exercises, landmark to track (ankle for calf raises)
  elevationLandmark?: { left: number; right: number }
  // Depth direction: 'lowerBetter' means lower angle = better depth (default)
  // 'higherBetter' means higher angle = better depth (e.g., shoulder raises)
  depthDirection?: 'lowerBetter' | 'higherBetter'
  // Coaching instructions for real-time guidance
  coaching?: CoachingInstructions
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
    tempo: {
      downSec: { min: 2.0, max: 3.0 },
      upSec: { min: 1.0, max: 2.0 },
      holdBottomSec: { min: 0.5, max: 1.5 }
    },
    coaching: {
      title: "Squat coaching",
      setup: [
        "Feet shoulder-width apart",
        "Toes slightly turned out",
        "Brace your core",
        "Keep chest up"
      ],
      repScript: {
        rest: "Reset your posture. Feet shoulder-width, core engaged.",
        up: "Drive through your heels and rise up.",
        down: "Hips back and down—sit into your heels."
      },
      cuesDown: [
        "Hips back and down",
        "Sit back into your heels",
        "Keep your chest up as you lower",
        "Control the descent"
      ],
      cuesUp: [
        "Drive through your heels",
        "Push the floor away",
        "Keep knees tracking over toes",
        "Rise with control"
      ],
      cuesHoldBottom: [
        "Hold here for a moment",
        "Feel the stretch in your hips",
        "Keep your core tight"
      ],
      cuesRest: [
        "Take a breath",
        "Reset your position",
        "Prepare for the next rep"
      ],
      formCorrections: {
        depth: [
          "Go deeper - aim for thighs parallel to floor",
          "You're not low enough - push your hips back more",
          "Sink lower to get full range of motion"
        ],
        alignment: [
          "Keep your knees tracking over your toes",
          "Don't let your knees cave in",
          "Push your knees out slightly"
        ],
        tempo: [
          "Slow down - control is key",
          "Take your time with each rep"
        ]
      },
      tempo: {
        downSec: { min: 2.0, max: 3.0 },
        upSec: { min: 1.0, max: 2.0 },
        holdBottomSec: { min: 0.5, max: 1.5 }
      },
      breathing: {
        down: "Inhale as you lower",
        up: "Exhale as you rise",
        hold: "Breathe naturally while holding"
      },
      qualityRules: {
        tooFastMsg: "Slow down and control the movement",
        tooSlowMsg: "Keep it smooth, don't stall",
        holdMsg: "Hold at the bottom for a moment"
      }
    },
  },
  "Hip Hinge": {
    // Hip Hinge: Measures shoulder-hip-knee angle
    // Standing upright: ~175° (straight line)
    // Good hinge depth: 115-120° (deeper = smaller angle)
    // Rep counting: UP = near standing (175°), DOWN = hinge position (115-120°)
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
      pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      pointC: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      label: "Hip flexion",
      minAngle: 115, // Minimum acceptable hinge depth (bottom of range)
      maxAngle: 120, // Maximum acceptable hinge depth at bottom (too deep might indicate rounding)
      upThreshold: 175, // Near standing position (UP state)
      downThreshold: 120, // Hinge position threshold (DOWN state)
    },
    additionalAngles: [
      {
        // Knee angle: Should stay relatively straight (>150°) to avoid squatting
        pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
        pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
        pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
        label: "Knee angle",
        minAngle: 150, // >150° = knees mostly straight (avoid squatting)
      },
      {
        // Trunk neutrality: shoulder-hip-ankle alignment to detect rounding
        // When neutral, this angle should be relatively large (>140°)
        pointA: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
        pointB: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
        pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
        label: "Trunk neutrality",
        minAngle: 140, // >140° = neutral spine (lower = rounding)
      },
    ],
    // For hip hinge: smaller angle = deeper hinge (good)
    // Good form range: 115-120° (hinge) to 175° (standing)
    // shallowAngle = maximum acceptable angle for good depth (120°)
    // veryShallowAngle = maximum acceptable angle for acceptable depth (125°)
    shallowAngle: 120, // Good hinge depth: angle <= 120°
    veryShallowAngle: 125, // Acceptable hinge depth: angle <= 125°
    depthLabel: "Hip flexion",
    alignmentLabel: "Knee angle",
    additionalLabels: ["Knee angle", "Trunk neutrality"],
    confidencePoints: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
    trackBothSides: false,
    tempo: {
      downSec: { min: 2.0, max: 3.0 },
      upSec: { min: 1.0, max: 2.0 },
      holdBottomSec: { min: 0.5, max: 1.5 }
    },
    coaching: {
      title: "Hip Hinge coaching",
      setup: [
        "Soft knees, not locked",
        "Neutral spine",
        "Brace your core",
        "Weight on mid-foot or heel"
      ],
      repScript: {
        rest: "Reset your posture. Neutral spine, core engaged.",
        up: "Squeeze your glutes and drive your hips forward.",
        down: "Push your hips back—hinge at the hips, not the knees."
      },
      cuesDown: [
        "Push your hips back",
        "Keep your spine neutral",
        "Feel the stretch in your hamstrings",
        "Don't squat - hinge at the hips"
      ],
      cuesUp: [
        "Squeeze your glutes",
        "Drive your hips forward",
        "Return to standing",
        "Keep your core engaged"
      ],
      cuesHoldBottom: [
        "Hold at the end range",
        "Feel the stretch",
        "Keep your back straight"
      ],
      cuesRest: [
        "Reset your position",
        "Take a breath",
        "Prepare for the next rep"
      ],
      formCorrections: {
        depth: [
          "Go deeper - push your hips back more to reach 115-120°",
          "You're not hinging deep enough - aim for 115-120° at the bottom",
          "Hinge at the hips, not the knees - feel the stretch in your hamstrings"
        ],
        alignment: [
          "Keep your back straight - don't round",
          "Maintain neutral spine - don't let your back curve",
          "Push your hips back, not down - you're squatting"
        ],
        "Trunk neutrality": [
          "Keep your spine neutral - don't round your back",
          "Maintain a straight line from shoulders to hips",
          "Hinge at the hips, not by rounding your spine"
        ],
        "Knee angle": [
          "Keep knees soft but not bent - push your hips back, not down",
          "You're squatting instead of hinging - straighten your knees slightly",
          "Bend at the hips, not the knees - keep knee angle above 150°"
        ],
        "Hip flexion": [
          "Push your hips further back to reach the 115-120° target",
          "You're not hinging deep enough - feel the hamstring stretch",
          "Hinge at the hips more - aim for a deeper position"
        ],
        tempo: [
          "Control the movement",
          "Slow and steady"
        ]
      },
      tempo: {
        downSec: { min: 2.0, max: 3.0 },
        upSec: { min: 1.0, max: 2.0 },
        holdBottomSec: { min: 0.5, max: 1.5 }
      },
      breathing: {
        down: "Inhale as you hinge back",
        up: "Exhale as you return",
        hold: "Breathe naturally"
      },
      qualityRules: {
        tooFastMsg: "Slow down and control the movement",
        tooSlowMsg: "Keep it smooth, don't stall",
        holdMsg: "Hold at the end range for a moment"
      }
    },
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
    tempo: {
      downSec: { min: 1.5, max: 2.5 },
      upSec: { min: 1.0, max: 2.0 },
      holdTopSec: { min: 0.5, max: 1.5 }
    },
    coaching: {
      title: "Shoulder Press coaching",
      setup: [
        "Ribs down, core engaged",
        "Glutes lightly on",
        "Wrists stacked over elbows"
      ],
      repScript: {
        rest: "Reset your position. Core engaged, wrists over elbows.",
        up: "Press straight up—drive through your shoulders.",
        down: "Lower with control—keep your core tight."
      },
      cuesDown: [
        "Lower with control",
        "Keep your core tight",
        "Don't let your elbows flare out",
        "Control the weight down"
      ],
      cuesUp: [
        "Press straight up",
        "Drive through your shoulders",
        "Keep your core braced",
        "Avoid leaning back"
      ],
      cuesHoldTop: [
        "Hold at the top",
        "Keep your core engaged",
        "Don't lock out completely"
      ],
      cuesRest: [
        "Reset your position",
        "Take a breath",
        "Prepare for the next rep"
      ],
      formCorrections: {
        alignment: [
          "Don't lean back - keep your core tight",
          "Press straight up, not forward",
          "Keep your shoulders down"
        ],
        tempo: [
          "Control the movement",
          "Slow and steady"
        ]
      },
      tempo: {
        downSec: { min: 1.5, max: 2.5 },
        upSec: { min: 1.0, max: 2.0 },
        holdTopSec: { min: 0.5, max: 1.5 }
      },
      breathing: {
        down: "Inhale as you lower",
        up: "Exhale as you press up",
        hold: "Breathe naturally"
      },
      qualityRules: {
        tooFastMsg: "Slow down and control the movement",
        tooSlowMsg: "Keep it smooth, don't stall",
        holdMsg: "Hold at the top for a moment"
      }
    },
  },
  "Calf Raise": {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
      pointB: { left: LANDMARKS.LEFT_HEEL, right: LANDMARKS.RIGHT_HEEL },
      pointC: { left: LANDMARKS.LEFT_FOOT_INDEX, right: LANDMARKS.RIGHT_FOOT_INDEX },
      label: "Heel elevation",
      // For elevation: upThreshold = minimum elevation difference to be considered "up" (on toes)
      // downThreshold = maximum elevation difference to be considered "down" (flat-footed)
      // Values in normalized coordinates (difference between rest and top positions)
      upThreshold: 0.02, // Minimum elevation difference to count as "up" position
      downThreshold: 0.005, // Maximum elevation difference to count as "down" position (rest)
    },
    additionalAngles: [
      {
        pointA: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
        pointB: { left: LANDMARKS.LEFT_KNEE, right: LANDMARKS.RIGHT_KNEE },
        pointC: { left: LANDMARKS.LEFT_ANKLE, right: LANDMARKS.RIGHT_ANKLE },
        label: "Knee angle",
        minAngle: 155, // ≥155° for straight knees
      },
    ],
    // For elevation: shallowAngle = minimum good elevation difference, veryShallowAngle = minimum acceptable elevation difference
    shallowAngle: 0.015, // Minimum elevation difference for good form
    veryShallowAngle: 0.01, // Minimum elevation difference for acceptable form
    depthLabel: "Heel elevation",
    alignmentLabel: "Knee alignment",
    additionalLabels: ["Knee angle"],
    confidencePoints: [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL, LANDMARKS.LEFT_FOOT_INDEX, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL, LANDMARKS.RIGHT_FOOT_INDEX],
    trackBothSides: false,
    measurementType: 'elevation',
    elevationLandmark: { left: LANDMARKS.LEFT_HEEL, right: LANDMARKS.RIGHT_HEEL },
    tempo: {
      downSec: { min: 2.0, max: 3.0 },
      upSec: { min: 1.5, max: 2.5 },
      holdTopSec: { min: 1.0, max: 2.0 }
    },
    coaching: {
      title: "Calf Raise coaching",
      setup: [
        "Stand tall",
        "Knees straight but not locked",
        "Hold onto support if needed"
      ],
      repScript: {
        up: "Rise up onto your toes—squeeze your calves.",
        down: "Lower slowly—feel the stretch in your calves."
      },
      cuesDown: [
        "Lower with control",
        "Feel the stretch in your calves",
        "Go all the way down",
        "Keep your balance"
      ],
      cuesUp: [
        "Rise up onto your toes",
        "Squeeze your calves",
        "Push through the balls of your feet",
        "Rise straight up"
      ],
      cuesHoldTop: [
        "Hold at the top",
        "Feel the contraction",
        "Don't bounce",
        "Keep your balance"
      ],
      cuesRest: [
        "Return to flat feet",
        "Take a breath",
        "Prepare for the next rep"
      ],
      formCorrections: {
        depth: [
          "Get full range - go all the way up",
          "Rise higher on your toes",
          "Push through your calves more"
        ],
        alignment: [
          "Keep your ankles aligned",
          "Don't let your ankles roll",
          "Rise straight up"
        ],
        tempo: [
          "Control the movement",
          "No bouncing"
        ]
      },
      tempo: {
        downSec: { min: 2.0, max: 3.0 },
        upSec: { min: 1.5, max: 2.5 },
        holdTopSec: { min: 1.0, max: 2.0 }
      },
      breathing: {
        down: "Inhale as you lower",
        up: "Exhale as you rise up",
        hold: "Breathe naturally at the top"
      },
      qualityRules: {
        tooFastMsg: "Slow down and control the movement",
        tooSlowMsg: "Keep it smooth, don't stall",
        holdMsg: "Hold at the top for a moment"
      }
    },
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
    tempo: {
      downSec: { min: 2.0, max: 3.0 },
      upSec: { min: 1.0, max: 2.0 },
      holdBottomSec: { min: 0.5, max: 1.5 }
    },
    coaching: {
      title: "Lunge coaching",
      setup: [
        "Tall posture",
        "Step length so front knee stays over mid-foot",
        "Core engaged"
      ],
      repScript: {
        rest: "Reset your position. Tall posture, core engaged.",
        up: "Push through your front heel and drive back up.",
        down: "Lower your back knee down—keep your front knee over your ankle."
      },
      cuesDown: [
        "Lower your back knee down",
        "Keep your front knee over your ankle",
        "Keep your torso upright",
        "Control the descent"
      ],
      cuesUp: [
        "Push through your front heel",
        "Drive back up",
        "Keep your core tight",
        "Return to starting position"
      ],
      cuesHoldBottom: [
        "Hold at the bottom",
        "Feel the stretch",
        "Keep your front knee aligned"
      ],
      cuesRest: [
        "Reset your position",
        "Take a breath",
        "Prepare for the next rep"
      ],
      formCorrections: {
        depth: [
          "Go deeper - lower your back knee more",
          "Get full range of motion",
          "Sink lower into the lunge"
        ],
        alignment: [
          "Keep your front knee over your toes",
          "Don't let your knee cave in",
          "Keep your torso upright"
        ],
        tempo: [
          "Control the movement",
          "Slow and steady"
        ]
      },
      tempo: {
        downSec: { min: 2.0, max: 3.0 },
        upSec: { min: 1.0, max: 2.0 },
        holdBottomSec: { min: 0.5, max: 1.5 }
      },
      breathing: {
        down: "Inhale as you lower",
        up: "Exhale as you rise",
        hold: "Breathe naturally"
      },
      qualityRules: {
        tooFastMsg: "Slow down and control the movement",
        tooSlowMsg: "Keep it smooth, don't stall",
        holdMsg: "Hold at the bottom for a moment"
      }
    },
  },
  "Shoulder Raise": {
    primaryAngle: {
      pointA: { left: LANDMARKS.LEFT_ELBOW, right: LANDMARKS.RIGHT_ELBOW },
      pointB: { left: LANDMARKS.LEFT_SHOULDER, right: LANDMARKS.RIGHT_SHOULDER },
      pointC: { left: LANDMARKS.LEFT_HIP, right: LANDMARKS.RIGHT_HIP },
      label: "Shoulder elevation",
      minAngle: 85, // Minimum acceptable top angle for form validation
      maxAngle: 90, // Maximum acceptable top angle (should not go above shoulder height)
      upThreshold: 90, // Target angle at top position
      downThreshold: 20, // Angle at bottom position
    },
    shallowAngle: 85, // Minimum acceptable top angle (higher = better ROM)
    veryShallowAngle: 75, // Minimum acceptable top angle for very shallow reps
    depthLabel: "Range of motion",
    alignmentLabel: "Shoulder alignment",
    confidencePoints: [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
    trackBothSides: true,
    depthDirection: 'higherBetter', // Higher angle indicates greater ROM
    tempo: {
      downSec: { min: 2.0, max: 3.0 },
      upSec: { min: 1.5, max: 2.5 },
      holdTopSec: { min: 0.5, max: 1.5 }
    },
    coaching: {
      title: "Shoulder Raise coaching",
      setup: [
        "Slight bend in elbows",
        "Shoulders down away from ears",
        "Core engaged"
      ],
      repScript: {
        rest: "Reset your posture. Shoulders down, core engaged.",
        up: "Raise your arms out to the side to shoulder height.",
        down: "Lower slowly—stay in control."
      },
      cuesDown: [
        "Lower with control",
        "Keep your shoulders down",
        "Control the descent",
        "Feel the stretch"
      ],
      cuesUp: [
        "Lift your arms up",
        "Keep your shoulders relaxed",
        "Don't shrug your shoulders",
        "Lift to shoulder height"
      ],
      cuesHoldTop: [
        "Hold at the top",
        "Keep your shoulders down",
        "Feel the contraction",
        "Don't raise too high"
      ],
      cuesRest: [
        "Return to starting position",
        "Relax your shoulders",
        "Prepare for the next rep"
      ],
      formCorrections: {
        depth: [
          "Don't raise above shoulder height - keep arms at 90°",
          "Lower your arms slightly - you're going too high",
          "Stop at shoulder height to avoid shrugging"
        ],
        alignment: [
          "Keep your shoulders down - don't shrug",
          "Relax your neck",
          "Don't raise above shoulder height"
        ],
        tempo: [
          "Control the movement",
          "Slow and steady"
        ]
      },
      tempo: {
        downSec: { min: 2.0, max: 3.0 },
        upSec: { min: 1.5, max: 2.5 },
        holdTopSec: { min: 0.5, max: 1.5 }
      },
      breathing: {
        down: "Inhale as you lower",
        up: "Exhale as you raise",
        hold: "Breathe naturally"
      },
      qualityRules: {
        tooFastMsg: "Slow down and control the movement",
        tooSlowMsg: "Keep it smooth, don't stall",
        holdMsg: "Hold at the top for a moment"
      }
    },
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

/**
 * Generates deterministic coaching messages based on current exercise state
 * Returns an array where:
 *   - messages[0] is ALWAYS the primary next-action instruction from repScript
 *   - messages[1..] are OPTIONAL corrections (only if form/tempo issues exist)
 * Driven by telemetry + holds for deterministic, exercise-driven coaching
 */
export function getCoachingMessages(
  config: PoseConfig,
  repState: "up" | "down" | "rest",
  feedback: { status: "Good form" | "Needs work" | "Watch form"; checks: { label: string; ok: boolean }[] },
  telemetry?: import("@/lib/types").RepTelemetry
): string[] {
  const coaching = config.coaching
  if (!coaching) return []

  const messages: string[] = []
  const checks = feedback.checks

  // PRIMARY: Determine primary instruction from repScript using telemetry
  let primaryMessage: string | undefined = undefined
  
  if (coaching.repScript) {
    if (telemetry) {
      if (telemetry.phase === "UP") {
        primaryMessage = coaching.repScript.up
      } else if (telemetry.phase === "DOWN") {
        primaryMessage = coaching.repScript.down
      } else {
        // REST phase - use rest instruction if available, otherwise use down
        primaryMessage = coaching.repScript.rest ?? coaching.repScript.down
      }
    } else {
      // Fallback to repState if no telemetry
      if (repState === "up") {
        primaryMessage = coaching.repScript.up
      } else if (repState === "down") {
        primaryMessage = coaching.repScript.down
      } else {
        // REST state - use rest instruction if available, otherwise use down
        primaryMessage = coaching.repScript.rest ?? coaching.repScript.down
      }
    }
  }

  // If no repScript, fallback to legacy cues (for backward compatibility)
  if (!primaryMessage) {
    if (repState === "down" && coaching.cuesDown && coaching.cuesDown.length > 0) {
      primaryMessage = coaching.cuesDown[0]
    } else if (repState === "up" && coaching.cuesUp && coaching.cuesUp.length > 0) {
      primaryMessage = coaching.cuesUp[0]
    } else if (repState === "rest" && coaching.cuesRest && coaching.cuesRest.length > 0) {
      primaryMessage = coaching.cuesRest[0]
    } else if (coaching.execution && coaching.execution.length > 0) {
      primaryMessage = coaching.execution[0]
    }
  }

  // Add primary message as first message
  if (primaryMessage) {
    messages.push(primaryMessage)
  }

  // SECONDARY: Add at most ONE correction (form or tempo)
  // Priority: Form corrections > Tempo corrections

  // 1. Form correction (highest priority secondary)
  if (feedback.status !== "Good form" && coaching.formCorrections) {
    // Check for depth issues first
    const depthCheck = checks.find(c => c.label === config.depthLabel)
    if (depthCheck && !depthCheck.ok && coaching.formCorrections.depth) {
      messages.push(coaching.formCorrections.depth[0])
      return messages // Return early - only one secondary correction
    }

    // Check for alignment issues
    const alignmentCheck = checks.find(c => c.label === config.alignmentLabel)
    if (alignmentCheck && !alignmentCheck.ok && coaching.formCorrections.alignment) {
      messages.push(coaching.formCorrections.alignment[0])
      return messages // Return early - only one secondary correction
    }
  }

  // 2. Tempo correction (only if no form correction was added)
  if (telemetry && messages.length === 1) {
    // Check tempo status for current phase
    const currentPhase = telemetry.phase
    let tempoIssue: string | undefined = undefined

    if (currentPhase === "DOWN" && telemetry.tempoStatusDown && telemetry.tempoStatusDown !== "good") {
      if (telemetry.tempoStatusDown === "fast") {
        tempoIssue = coaching.qualityRules?.tooFastMsg ?? "Too fast—slow down."
      } else if (telemetry.tempoStatusDown === "slow") {
        tempoIssue = coaching.qualityRules?.tooSlowMsg ?? "Too slow—keep it smooth."
      }
    } else if (currentPhase === "UP" && telemetry.tempoStatusUp && telemetry.tempoStatusUp !== "good") {
      if (telemetry.tempoStatusUp === "fast") {
        tempoIssue = coaching.qualityRules?.tooFastMsg ?? "Too fast—slow down."
      } else if (telemetry.tempoStatusUp === "slow") {
        tempoIssue = coaching.qualityRules?.tooSlowMsg ?? "Too slow—keep it smooth."
      }
    }

    if (tempoIssue) {
      messages.push(tempoIssue)
    }
  }

  return messages
}

