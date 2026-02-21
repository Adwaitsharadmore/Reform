"use client"

import { useState, useEffect, type ReactNode } from "react"
import type { Plan, SessionMetrics, SessionResult } from "@/lib/types"
import {
  AppContext,
  DEFAULT_PLAN,
  DEFAULT_METRICS,
  DEFAULT_RESULT,
} from "@/lib/store"

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN)
  const [metrics, setMetrics] = useState<SessionMetrics>(DEFAULT_METRICS)
  const [sessionResult, setSessionResult] = useState<SessionResult>(DEFAULT_RESULT)
  const [sessionActive, setSessionActive] = useState(false)

  // Sync metrics with plan when plan changes (update current exercise from plan)
  useEffect(() => {
    if (plan.exercises.length > 0) {
      const firstExercise = plan.exercises[0]
      setMetrics((prev) => ({
        ...prev,
        currentExercise: firstExercise.exercise,
        targetReps: firstExercise.reps,
        totalSets: firstExercise.sets,
        currentSet: 1,
      }))
    }
  }, [plan])

  return (
    <AppContext.Provider
      value={{
        plan,
        setPlan,
        metrics,
        setMetrics,
        sessionResult,
        setSessionResult,
        sessionActive,
        setSessionActive,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
