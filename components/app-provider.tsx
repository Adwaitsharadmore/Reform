"use client"

import { useState, useEffect, type ReactNode } from "react"
import type { Plan, SessionMetrics, SessionResult } from "@/lib/types"
import {
  AppContext,
  DEFAULT_PLAN,
  DEFAULT_METRICS,
  DEFAULT_RESULT,
} from "@/lib/store"

const DEMO_WATCHED_STORAGE_KEY = "pt_demo_watched"

function loadDemoWatched(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(DEMO_WATCHED_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveDemoWatched(watched: Record<string, boolean>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DEMO_WATCHED_STORAGE_KEY, JSON.stringify(watched))
  } catch {
    // Ignore storage errors
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN)
  const [metrics, setMetrics] = useState<SessionMetrics>(DEFAULT_METRICS)
  const [sessionResult, setSessionResult] = useState<SessionResult>(DEFAULT_RESULT)
  const [sessionActive, setSessionActive] = useState(false)
  const [demoWatched, setDemoWatchedState] = useState<Record<string, boolean>>(loadDemoWatched)

  // Load demo watched state from localStorage on mount
  useEffect(() => {
    setDemoWatchedState(loadDemoWatched())
  }, [])

  // Save demo watched state to localStorage whenever it changes
  useEffect(() => {
    saveDemoWatched(demoWatched)
  }, [demoWatched])

  const setDemoWatched = (exercise: string, watched: boolean) => {
    setDemoWatchedState((prev) => ({
      ...prev,
      [exercise]: watched,
    }))
  }

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
        demoWatched,
        setDemoWatched,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
