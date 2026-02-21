"use client"

import { useState, type ReactNode } from "react"
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
