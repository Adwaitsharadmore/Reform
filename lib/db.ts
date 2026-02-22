import type { Plan, SessionMetrics, SessionResult, RepEvent } from "./types"

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
    repEvents: [] as RepEvent[], // Per-rep event data for analytics
    // Track exercise-specific data
    exerciseData: {} as Record<string, {
      scores: number[]
      repCount: number
      issues: string[]
      lastRepCount: number // Track when exercise changes to calculate reps per exercise
      lastGlobalRepCount: number // Track global rep count when exercise was last seen
    }>,
  },
}

