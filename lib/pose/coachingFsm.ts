import type { PoseConfig } from "./config"
import type { RepTelemetry } from "../types"

export type CoachStep = "UP" | "HOLD_TOP" | "DOWN" | "HOLD_BOTTOM" | "REST"

interface CoachingFSMState {
  stepIndex: number
  currentStep: CoachStep
  stepEnteredAtMs: number
  lastPhaseSeen: "UP" | "DOWN" | "REST" | null
  stablePhaseMs: number
  lastInstruction: string | null
  lastRepCount: number
}

interface UpdateInput {
  telemetry?: RepTelemetry
  repJustCounted: boolean
  feedback: { status: "Good form" | "Needs work" | "Watch form"; checks: { label: string; ok: boolean }[] }
  bodyAngle: number | null
  repState: "up" | "down" | "rest"
  repCount: number
}

const DEBUG = false // Set to true for debug logging

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log("[CoachingFSM]", ...args)
  }
}

/**
 * Creates a coaching finite state machine that tracks rep steps
 * and only advances when movement conditions are met.
 */
export function createCoachingFSM(config: PoseConfig) {
  const coaching = config.coaching
  if (!coaching?.repScript) {
    // Fallback: return a simple FSM that always returns null
    return {
      update: () => {},
      getPrimaryInstruction: () => null,
      getSecondaryCorrection: () => null,
      reset: () => {},
    }
  }

  const repScript = coaching.repScript
  const holdTopTargetMs = repScript.holdTopTargetMs ?? 1000
  const holdBottomTargetMs = repScript.holdBottomTargetMs ?? 800
  const restTargetMs = repScript.restTargetMs ?? 500

  // Determine step sequence based on available repScript fields
  const steps: CoachStep[] = []
  if (repScript.up) steps.push("UP")
  if (repScript.holdTop) steps.push("HOLD_TOP")
  if (repScript.down) steps.push("DOWN")
  if (repScript.holdBottom) steps.push("HOLD_BOTTOM")
  if (repScript.rest) steps.push("REST")
  // If no rest, we'll cycle back to UP after DOWN

  let state: CoachingFSMState = {
    stepIndex: 0,
    currentStep: steps[0] ?? "UP",
    stepEnteredAtMs: performance.now(),
    lastPhaseSeen: null,
    stablePhaseMs: 0,
    lastInstruction: null,
    lastRepCount: 0,
  }

  // Stability thresholds
  const STABLE_PHASE_MS = 200 // Require phase to be stable for 200ms
  const HOLD_STABILITY_MS = 200 // Require hold for 200ms before accepting

  function reset() {
    state = {
      stepIndex: 0,
      currentStep: steps[0] ?? "UP",
      stepEnteredAtMs: performance.now(),
      lastPhaseSeen: null,
      stablePhaseMs: 0,
      lastInstruction: null,
      lastRepCount: 0,
    }
    debugLog("FSM reset")
  }

  function advanceStep() {
    const oldStep = state.currentStep
    state.stepIndex = (state.stepIndex + 1) % steps.length
    state.currentStep = steps[state.stepIndex]
    state.stepEnteredAtMs = performance.now()
    state.stablePhaseMs = 0
    debugLog(`Step advanced: ${oldStep} -> ${state.currentStep}`)
  }

  function update(input: UpdateInput) {
    const { telemetry, repJustCounted, repCount } = input

    // Reset FSM when rep count changes (new rep started)
    if (repJustCounted || repCount !== state.lastRepCount) {
      reset()
      state.lastRepCount = repCount
      return
    }

    // If no telemetry, don't advance (keep last instruction)
    if (!telemetry) {
      return
    }

    const currentPhase = telemetry.phase
    const now = performance.now()
    const timeInStep = now - state.stepEnteredAtMs

    // Track phase stability using telemetry.phaseMs (more accurate)
    if (currentPhase === state.lastPhaseSeen) {
      // Phase hasn't changed, use telemetry.phaseMs as the stable duration
      state.stablePhaseMs = telemetry.phaseMs
    } else {
      // Phase changed, reset stability counter
      state.stablePhaseMs = 0
      state.lastPhaseSeen = currentPhase
    }

    // State machine transitions based on current step
    switch (state.currentStep) {
      case "UP": {
        // Advance to HOLD_TOP when:
        // - Phase is UP and stable for >= STABLE_PHASE_MS
        // - OR holdTopMs >= HOLD_STABILITY_MS (proves we reached top)
        if (
          (currentPhase === "UP" && state.stablePhaseMs >= STABLE_PHASE_MS) ||
          (telemetry.holdTopMs !== null && telemetry.holdTopMs >= HOLD_STABILITY_MS)
        ) {
          // Only advance if HOLD_TOP step exists
          if (steps.includes("HOLD_TOP")) {
            advanceStep()
          } else {
            // Skip to DOWN if no HOLD_TOP step
            const downIndex = steps.indexOf("DOWN")
            if (downIndex !== -1) {
              state.stepIndex = downIndex
              state.currentStep = "DOWN"
              state.stepEnteredAtMs = now
              state.stablePhaseMs = 0
              debugLog(`Step advanced: UP -> DOWN (no HOLD_TOP step)`)
            }
          }
        }
        break
      }

      case "HOLD_TOP": {
        // Advance to DOWN when holdTopMs >= target
        if (telemetry.holdTopMs !== null && telemetry.holdTopMs >= holdTopTargetMs) {
          const downIndex = steps.indexOf("DOWN")
          if (downIndex !== -1) {
            state.stepIndex = downIndex
            state.currentStep = "DOWN"
            state.stepEnteredAtMs = now
            state.stablePhaseMs = 0
            debugLog(`Step advanced: HOLD_TOP -> DOWN (holdTopMs: ${telemetry.holdTopMs}ms >= ${holdTopTargetMs}ms)`)
          } else {
            // No DOWN step, go to REST or cycle
            advanceStep()
          }
        }
        break
      }

      case "DOWN": {
        // Advance to HOLD_BOTTOM or REST when:
        // - Phase is DOWN and stable for >= STABLE_PHASE_MS
        // - OR holdBottomMs >= HOLD_STABILITY_MS (proves we reached bottom)
        if (
          (currentPhase === "DOWN" && state.stablePhaseMs >= STABLE_PHASE_MS) ||
          (telemetry.holdBottomMs !== null && telemetry.holdBottomMs >= HOLD_STABILITY_MS)
        ) {
          // Check if HOLD_BOTTOM step exists
          if (steps.includes("HOLD_BOTTOM")) {
            const holdBottomIndex = steps.indexOf("HOLD_BOTTOM")
            state.stepIndex = holdBottomIndex
            state.currentStep = "HOLD_BOTTOM"
            state.stepEnteredAtMs = now
            state.stablePhaseMs = 0
            debugLog(`Step advanced: DOWN -> HOLD_BOTTOM`)
          } else {
            // No HOLD_BOTTOM, go to REST or cycle to UP
            const restIndex = steps.indexOf("REST")
            if (restIndex !== -1) {
              state.stepIndex = restIndex
              state.currentStep = "REST"
              state.stepEnteredAtMs = now
              state.stablePhaseMs = 0
              debugLog(`Step advanced: DOWN -> REST`)
            } else {
              // No REST step, cycle back to UP
              const upIndex = steps.indexOf("UP")
              if (upIndex !== -1) {
                state.stepIndex = upIndex
                state.currentStep = "UP"
                state.stepEnteredAtMs = now
                state.stablePhaseMs = 0
                debugLog(`Step advanced: DOWN -> UP (cycle)`)
              }
            }
          }
        }
        break
      }

      case "HOLD_BOTTOM": {
        // Advance to REST or UP when holdBottomMs >= target
        if (telemetry.holdBottomMs !== null && telemetry.holdBottomMs >= holdBottomTargetMs) {
          const restIndex = steps.indexOf("REST")
          if (restIndex !== -1) {
            state.stepIndex = restIndex
            state.currentStep = "REST"
            state.stepEnteredAtMs = now
            state.stablePhaseMs = 0
            debugLog(`Step advanced: HOLD_BOTTOM -> REST (holdBottomMs: ${telemetry.holdBottomMs}ms >= ${holdBottomTargetMs}ms)`)
          } else {
            // No REST step, cycle to UP
            const upIndex = steps.indexOf("UP")
            if (upIndex !== -1) {
              state.stepIndex = upIndex
              state.currentStep = "UP"
              state.stepEnteredAtMs = now
              state.stablePhaseMs = 0
              debugLog(`Step advanced: HOLD_BOTTOM -> UP (cycle)`)
            }
          }
        }
        break
      }

      case "REST": {
        // Advance to UP when phase changes away from REST (movement starts)
        if (currentPhase !== "REST" && state.stablePhaseMs >= STABLE_PHASE_MS) {
          const upIndex = steps.indexOf("UP")
          if (upIndex !== -1) {
            state.stepIndex = upIndex
            state.currentStep = "UP"
            state.stepEnteredAtMs = now
            state.stablePhaseMs = 0
            debugLog(`Step advanced: REST -> UP (movement detected)`)
          }
        }
        break
      }
    }
  }

  function getPrimaryInstruction(): string | null {
    const repScript = coaching?.repScript
    if (!repScript) return null

    switch (state.currentStep) {
      case "UP":
        return repScript.up ?? null
      case "HOLD_TOP":
        return repScript.holdTop ?? null
      case "DOWN":
        return repScript.down ?? null
      case "HOLD_BOTTOM":
        return repScript.holdBottom ?? null
      case "REST":
        return repScript.rest ?? null
      default:
        return null
    }
  }

  function getSecondaryCorrection(
    feedback: { status: "Good form" | "Needs work" | "Watch form"; checks: { label: string; ok: boolean }[] },
    telemetry?: RepTelemetry
  ): string | null {
    const checks = feedback.checks

    // Priority 1: Form corrections (depth > alignment)
    if (feedback.status !== "Good form" && coaching?.formCorrections) {
      const depthCheck = checks.find(c => c.label === config.depthLabel)
      if (depthCheck && !depthCheck.ok && coaching.formCorrections.depth) {
        return coaching.formCorrections.depth[0]
      }

      const alignmentCheck = checks.find(c => c.label === config.alignmentLabel)
      if (alignmentCheck && !alignmentCheck.ok && coaching.formCorrections.alignment) {
        return coaching.formCorrections.alignment[0]
      }
    }

    // Priority 2: Tempo corrections
    if (telemetry) {
      const currentPhase = telemetry.phase
      let tempoIssue: string | undefined = undefined

      if (currentPhase === "DOWN" && telemetry.tempoStatusDown && telemetry.tempoStatusDown !== "good") {
        if (telemetry.tempoStatusDown === "fast") {
          tempoIssue = coaching?.qualityRules?.tooFastMsg ?? "Too fast—slow down."
        } else if (telemetry.tempoStatusDown === "slow") {
          tempoIssue = coaching?.qualityRules?.tooSlowMsg ?? "Too slow—keep it smooth."
        }
      } else if (currentPhase === "UP" && telemetry.tempoStatusUp && telemetry.tempoStatusUp !== "good") {
        if (telemetry.tempoStatusUp === "fast") {
          tempoIssue = coaching?.qualityRules?.tooFastMsg ?? "Too fast—slow down."
        } else if (telemetry.tempoStatusUp === "slow") {
          tempoIssue = coaching?.qualityRules?.tooSlowMsg ?? "Too slow—keep it smooth."
        }
      }

      if (tempoIssue) {
        return tempoIssue
      }
    }

    return null
  }

  return {
    update,
    getPrimaryInstruction,
    getSecondaryCorrection,
    reset,
    // Expose state for debugging
    getState: () => ({ ...state }),
  }
}

