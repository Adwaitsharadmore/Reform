import type { PoseConfig } from "./config"
import type { RepTelemetry } from "../types"

export type CoachStep = "REST" | "UP" | "DOWN"

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

  // Determine step sequence based on available repScript fields
  // If no rest instruction, cycle only between UP and DOWN
  const steps: CoachStep[] = []
  if (repScript.rest) steps.push("REST")
  if (repScript.up) steps.push("UP")
  if (repScript.down) steps.push("DOWN")
  // Default to UP if no steps defined
  if (steps.length === 0) steps.push("UP")

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

      case "UP": {
        // For exercises without REST (like calf raises), hold at top for 1 second before going down
        // Check if we've been holding at the top for at least 1 second
        const holdTopMs = telemetry?.holdTopMs ?? null
        const holdTopTargetMs = 1000 // 1 second hold at top
        
        // Only advance to DOWN after holding at top for 1 second AND phase changes to DOWN
        if (holdTopMs !== null && holdTopMs >= holdTopTargetMs && currentPhase === "DOWN" && state.stablePhaseMs >= STABLE_PHASE_MS) {
          const downIndex = steps.indexOf("DOWN")
          if (downIndex !== -1) {
            state.stepIndex = downIndex
            state.currentStep = "DOWN"
            state.stepEnteredAtMs = now
            state.stablePhaseMs = 0
            debugLog(`Step advanced: UP -> DOWN (after ${holdTopMs}ms hold)`)
          }
        }
        break
      }

      case "DOWN": {
        // If REST step exists, advance to REST when phase changes to REST
        // Otherwise, cycle back to UP when phase changes to UP
        if (steps.includes("REST")) {
          if (currentPhase === "REST" && state.stablePhaseMs >= STABLE_PHASE_MS) {
            const restIndex = steps.indexOf("REST")
            if (restIndex !== -1) {
              state.stepIndex = restIndex
              state.currentStep = "REST"
              state.stepEnteredAtMs = now
              state.stablePhaseMs = 0
              debugLog(`Step advanced: DOWN -> REST`)
            }
          }
        } else {
          // No REST step, cycle back to UP when phase changes to UP or REST (back to baseline)
          // For calf raises: when user returns to baseline (REST phase), show UP instruction
          if ((currentPhase === "UP" || currentPhase === "REST") && state.stablePhaseMs >= STABLE_PHASE_MS) {
            const upIndex = steps.indexOf("UP")
            if (upIndex !== -1) {
              state.stepIndex = upIndex
              state.currentStep = "UP"
              state.stepEnteredAtMs = now
              state.stablePhaseMs = 0
              debugLog(`Step advanced: DOWN -> UP (cycle, phase: ${currentPhase})`)
            }
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
      case "REST":
        return repScript.rest ?? null
      case "UP":
        return repScript.up ?? null
      case "DOWN":
        return repScript.down ?? null
      default:
        return null
    }
  }

  function getSecondaryCorrection(
    feedback: { status: "Good form" | "Needs work" | "Watch form"; checks: { label: string; ok: boolean }[] },
    telemetry?: RepTelemetry
  ): string | null {
    const checks = feedback.checks

    // Priority 1: Form corrections - check all failed checks in priority order
    if (feedback.status !== "Good form" && coaching?.formCorrections) {
      const fc = coaching.formCorrections

      // Helper: look up correction for a given label
      function correctionFor(label: string): string | null {
        // Try direct label key first (e.g. "Hip flexion", "Knee angle", "Trunk neutrality")
        if (fc[label]?.[0]) return fc[label][0]
        // Then try canonical keys for depth/alignment
        if (label === config.depthLabel && fc.depth?.[0]) return fc.depth[0]
        if (label === config.alignmentLabel && fc.alignment?.[0]) return fc.alignment[0]
        return null
      }

      // Priority order: depth label → alignment label → any other failed check
      const depthCheck = checks.find(c => c.label === config.depthLabel)
      if (depthCheck && !depthCheck.ok) {
        const msg = correctionFor(depthCheck.label)
        if (msg) return msg
      }

      const alignmentCheck = checks.find(c => c.label === config.alignmentLabel)
      if (alignmentCheck && !alignmentCheck.ok) {
        const msg = correctionFor(alignmentCheck.label)
        if (msg) return msg
      }

      // Check remaining failed checks (additional angles etc.)
      for (const check of checks) {
        if (!check.ok && check.label !== config.depthLabel && check.label !== config.alignmentLabel) {
          const msg = correctionFor(check.label)
          if (msg) return msg
        }
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

  function setInitialStep(step: CoachStep) {
    const stepIndex = steps.indexOf(step)
    if (stepIndex !== -1) {
      state.stepIndex = stepIndex
      state.currentStep = step
      state.stepEnteredAtMs = performance.now()
      state.stablePhaseMs = 0
      debugLog(`Initial step set to: ${step}`)
    }
  }

  return {
    update,
    getPrimaryInstruction,
    getSecondaryCorrection,
    reset,
    setInitialStep,
    // Expose state for debugging
    getState: () => ({ ...state }),
  }
}

