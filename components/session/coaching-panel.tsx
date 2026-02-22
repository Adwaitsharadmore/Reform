"use client"

import { useAppState } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  Dumbbell,
  Zap,
  Target,
  Gauge,
  Plus,
} from "lucide-react"
import type { SessionMetrics } from "@/lib/types"
import { getPoseConfig, getExerciseConfig } from "@/lib/pose/config"

function simulateRep(
  metrics: SessionMetrics,
  type: "good" | "shallow" | "fast" | "knee-cave"
): Partial<SessionMetrics> {
  const repCount = metrics.repCount + 1
  const scoreMap = { good: 92, shallow: 65, fast: 70, "knee-cave": 58 }
  const lastScore = scoreMap[type] + Math.floor(Math.random() * 8)

  const checks = [...metrics.feedback.checks]
  if (type === "good") {
    checks.forEach((c) => (c.ok = true))
  } else if (type === "shallow") {
    checks.forEach((c) => (c.ok = c.label !== "Depth"))
  } else if (type === "fast") {
    checks.forEach((c) => (c.ok = c.label !== "Control"))
  } else {
    checks.forEach((c) => (c.ok = c.label !== "Knee alignment"))
  }

  const statusMap: Record<string, SessionMetrics["feedback"]["status"]> = {
    good: "Good form",
    shallow: "Needs work",
    fast: "Watch form",
    "knee-cave": "Needs work",
  }

  return {
    repCount,
    lastScore,
    bodyAngle: type === "shallow" ? 120 : type === "knee-cave" ? 85 : 90,
    repState: "down",
    poseConfidence: type === "good" ? 0.97 : 0.88,
    feedback: { status: statusMap[type], checks },
  }
}

export function CoachingPanel() {
  const { metrics, setMetrics, sessionActive, plan } = useAppState()
  // Use exercise-specific config if available, otherwise fall back to injury area
  const exerciseConfig = getExerciseConfig(metrics.currentExercise)
  const poseConfig = exerciseConfig || getPoseConfig(plan.injuryArea)

  function applySimulation(type: "good" | "shallow" | "fast" | "knee-cave") {
    const updates = simulateRep(metrics, type)
    const newMetrics = { ...metrics, ...updates } as SessionMetrics
    setMetrics(newMetrics)
    // Reset repState after a short delay
    setTimeout(() => {
      setMetrics({ ...newMetrics, repState: "rest" })
    }, 500)
  }

  function incrementRep() {
    setMetrics({ ...metrics, repCount: metrics.repCount + 1 })
  }

  const repProgress = metrics.targetReps > 0
    ? Math.min((metrics.repCount / metrics.targetReps) * 100, 100)
    : 0

  const statusColor =
    metrics.feedback.status === "Good form"
      ? "bg-success text-success-foreground"
      : metrics.feedback.status === "Needs work"
        ? "bg-destructive text-primary-foreground"
        : "bg-warning text-warning-foreground"

  return (
    <div className="flex flex-col gap-4">
      {/* Current exercise */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4 text-primary" />
            {metrics.currentExercise}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Set {metrics.currentSet} of {metrics.totalSets}
            </span>
          </div>

          <Separator />

          {/* Rep counter */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Reps: {metrics.repCount} / {metrics.targetReps}
              </span>
              <span className="text-xs text-muted-foreground">
                Score: {metrics.lastScore}/100
              </span>
            </div>
            <Progress value={repProgress} className="h-2" />
          </div>

          <Separator />

          {/* Feedback */}
          <div className="flex flex-col gap-3">
            <Badge
              className={`w-fit ${statusColor}`}
            >
              {metrics.feedback.status}
            </Badge>
            <div className="flex flex-col gap-1.5">
              {metrics.feedback.checks.map((check, index) => {
                // Look up correction message for failed checks
                const fc = poseConfig.coaching?.formCorrections
                let correctionMsg: string | null = null
                if (!check.ok && fc) {
                  // Try direct label key first (e.g. "Hip flexion", "Knee angle", "Trunk neutrality")
                  correctionMsg = fc[check.label]?.[0] ?? null
                  // Fall back to canonical depth/alignment keys
                  if (!correctionMsg && check.label === poseConfig.depthLabel) correctionMsg = fc.depth?.[0] ?? null
                  if (!correctionMsg && check.label === poseConfig.alignmentLabel) correctionMsg = fc.alignment?.[0] ?? null
                }
                return (
                  <div
                    key={`${check.label}-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    {check.ok ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={
                          check.ok ? "text-foreground" : "font-medium text-destructive"
                        }
                      >
                        {check.label}
                      </span>
                      {correctionMsg && (
                        <span className="text-xs text-muted-foreground leading-snug">
                          {correctionMsg}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Metrics */}
          {poseConfig.trackBothSides && (metrics.leftBodyAngle != null || metrics.rightBodyAngle != null) ? (
            // Show both shoulder angles separately for shoulder exercises
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-2">
                <Target className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Left</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {metrics.leftBodyAngle != null ? `${metrics.leftBodyAngle}°` : '--'}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-2">
                <Target className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Right</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {metrics.rightBodyAngle != null ? `${metrics.rightBodyAngle}°` : '--'}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-2">
                <Zap className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">State</span>
                <span className="font-mono text-sm font-semibold capitalize text-foreground">
                  {metrics.repState}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-2">
                <Gauge className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Conf</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {(metrics.poseConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ) : (
            // Standard single angle display
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-2">
                <Target className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{poseConfig.primaryAngle.label || "Angle"}</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {metrics.bodyAngle}&deg;
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-2">
                <Zap className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Rep State</span>
                <span className="font-mono text-sm font-semibold capitalize text-foreground">
                  {metrics.repState}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-2">
                <Gauge className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Confidence</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {(metrics.poseConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Plan sidebar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{"Today's Plan"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {plan.exercises.map((ex, i) => (
            <div
              key={`${ex.exercise}-${i}`}
              className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
                ex.exercise === metrics.currentExercise
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span>{ex.exercise}</span>
              <span className="text-xs">
                {ex.sets}x{ex.reps}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Demo Controls */}
      <Card className="border-dashed border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Demo Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => applySimulation("good")}
            disabled={!sessionActive}
          >
            Good rep
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applySimulation("shallow")}
            disabled={!sessionActive}
          >
            Shallow rep
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applySimulation("fast")}
            disabled={!sessionActive}
          >
            Fast rep
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applySimulation("knee-cave")}
            disabled={!sessionActive}
          >
            Knee cave
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={incrementRep}
            disabled={!sessionActive}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            1 rep
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
