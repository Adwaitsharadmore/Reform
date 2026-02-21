export type InjuryArea = "Knee" | "Shoulder" | "Back" | "Ankle" | "Hip"
export type ExerciseType = "Squat" | "Lunge" | "Shoulder Raise"
export type Tempo = "Slow" | "Normal" | "Fast"
export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"

export interface ExerciseConfig {
  exercise: ExerciseType
  sets: number
  reps: number
  tempo: Tempo
  notes: string
}

export interface Plan {
  name: string
  injuryArea: InjuryArea
  exercises: ExerciseConfig[]
  daysPerWeek: number
  preferredDays: DayOfWeek[]
  reminderTime: string
  painThreshold: number
}

export interface RepResult {
  score: number
  issue: string | null
}

export interface ExerciseResult {
  exercise: ExerciseType
  reps: number
  avgScore: number
  bestScore: number
  issues: string[]
}

export interface SessionMetrics {
  currentExercise: ExerciseType
  currentSet: number
  totalSets: number
  repCount: number
  targetReps: number
  lastScore: number
  bodyAngle: number // Generic body angle (replaces kneeAngle for different injury areas)
  repState: "up" | "down" | "rest"
  poseConfidence: number
  feedback: {
    status: "Good form" | "Needs work" | "Watch form"
    checks: { label: string; ok: boolean }[]
  }
}

export interface SessionResult {
  sessionId: string
  planId?: string
  startedAt: number
  endedAt: number
  totalReps: number
  avgScore: number
  bestScore: number
  mainTip: string
  exercises?: ExerciseResult[]
  duration: number
}
