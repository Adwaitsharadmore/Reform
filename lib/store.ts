"use client"

import { createContext, useContext } from "react"
import type { Plan, SessionMetrics, SessionResult } from "./types"

export const DEFAULT_PLAN: Plan = {
  name: "My PT Plan",
  injuryArea: "Knee",
  exercises: [
    { exercise: "Squat", sets: 3, reps: 10, tempo: "Normal", notes: "" },
    { exercise: "Lunge", sets: 2, reps: 12, tempo: "Slow", notes: "Keep torso upright" },
  ],
  daysPerWeek: 3,
  preferredDays: ["Mon", "Wed", "Fri"],
  reminderTime: "09:00",
  painThreshold: 5,
}

export const DEFAULT_METRICS: SessionMetrics = {
  currentExercise: "Squat",
  currentSet: 1,
  totalSets: 3,
  repCount: 0,
  targetReps: 10,
  lastScore: 0,
  kneeAngle: 90,
  repState: "rest",
  poseConfidence: 0.95,
  feedback: {
    status: "Good form",
    checks: [
      { label: "Depth", ok: true },
      { label: "Control", ok: true },
      { label: "Knee alignment", ok: true },
    ],
  },
}

export const DEFAULT_RESULT: SessionResult = {
  sessionId: "default",
  startedAt: Date.now() - 1245,
  endedAt: Date.now(),
  totalReps: 34,
  avgScore: 82,
  bestScore: 96,
  mainTip: "Focus on knee alignment during squats. Try to keep your knees tracking over your toes.",
  exercises: [
    { exercise: "Squat", reps: 22, avgScore: 80, bestScore: 96, issues: ["Shallow depth on 3 reps", "Knee cave on 2 reps"] },
    { exercise: "Lunge", reps: 12, avgScore: 85, bestScore: 92, issues: ["Slight forward lean"] },
  ],
  duration: 1245,
}

export interface AppState {
  plan: Plan
  setPlan: (plan: Plan) => void
  metrics: SessionMetrics
  setMetrics: (metrics: SessionMetrics | ((prev: SessionMetrics) => SessionMetrics)) => void
  sessionResult: SessionResult
  setSessionResult: (result: SessionResult) => void
  sessionActive: boolean
  setSessionActive: (active: boolean) => void
}

export const AppContext = createContext<AppState | null>(null)

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useAppState must be used within AppProvider")
  return ctx
}


export const db = {
  plan: null as Plan | null,
  session: {
    id: null as string | null,
    planId: null as string | null,
    status: "idle" as "idle" | "running" | "paused" | "ended",
    startedAt: 0,
    repCount: 0,
    lastRepScore: null as number | null,
    scores: [] as number[],
    lastMetrics: null as SessionMetrics | null,
    result: null as SessionResult | null,
  },
};