import type { PoseConfig } from "./config"
import type { RepTelemetry } from "../types"

export type RepState = "UP" | "DOWN" | "UNKNOWN";

// Constants for hold detection
const EPSILON_ELEVATION = 0.01
const EPSILON_ANGLE = 5 // degrees

export function createRepCounter(config: PoseConfig) {
  let state: RepState = "UNKNOWN";
  let downReached = false;
  let repCount = 0;
  let initialized = false;

  // Support both old and new config structures
  const UP_THRESH = config.primaryAngle?.upThreshold ?? (config as any).upThreshold ?? 165;
  const DOWN_THRESH = config.primaryAngle?.downThreshold ?? (config as any).downThreshold ?? 100;
  const isElevation = config.measurementType === 'elevation';
  const epsilon = isElevation ? EPSILON_ELEVATION : EPSILON_ANGLE;

  // Phase tracking
  let currentPhase: "DOWN" | "UP" | "REST" = "REST";
  let phaseStartTime: number | null = null;
  let lastPhaseTransitionTime: number | null = null;

  // Timing tracking
  let lastDownStartTime: number | null = null;
  let lastUpStartTime: number | null = null;
  let lastDownEndTime: number | null = null;
  let lastUpEndTime: number | null = null;
  let lastDownDuration: number | null = null;
  let lastUpDuration: number | null = null;

  // Hold tracking
  let holdBottomStartTime: number | null = null;
  let holdTopStartTime: number | null = null;
  let isHoldingBottom = false;
  let isHoldingTop = false;

  // Helper to classify tempo status
  function classifyTempo(durationMs: number | null, range: { min: number; max: number } | undefined): "good" | "fast" | "slow" | null {
    if (durationMs === null || !range) return null;
    const durationSec = durationMs / 1000;
    if (durationSec < range.min) return "fast";
    if (durationSec > range.max) return "slow";
    return "good";
  }

  return {
    update(bodyAngle: number | null) {
      const now = performance.now();
      let repJustCounted = false;
      
      if (bodyAngle == null) {
        // Return telemetry with current state
        const phaseMs = phaseStartTime ? now - phaseStartTime : 0;
        return {
          repCount,
          state,
          repJustCounted,
          telemetry: {
            phase: currentPhase,
            phaseMs,
            lastDownMs: lastDownDuration,
            lastUpMs: lastUpDuration,
            holdBottomMs: isHoldingBottom && holdBottomStartTime ? now - holdBottomStartTime : null,
            holdTopMs: isHoldingTop && holdTopStartTime ? now - holdTopStartTime : null,
            tempoStatusDown: classifyTempo(lastDownDuration, config.tempo?.downSec),
            tempoStatusUp: classifyTempo(lastUpDuration, config.tempo?.upSec),
            tempoStatusHoldBottom: classifyTempo(
              isHoldingBottom && holdBottomStartTime ? now - holdBottomStartTime : null,
              config.tempo?.holdBottomSec
            ),
            tempoStatusHoldTop: classifyTempo(
              isHoldingTop && holdTopStartTime ? now - holdTopStartTime : null,
              config.tempo?.holdTopSec
            ),
          } as RepTelemetry
        };
      }

      // Initialize state based on first valid angle
      if (!initialized) {
        if (isElevation) {
          state = bodyAngle >= UP_THRESH ? "UP" : bodyAngle <= DOWN_THRESH ? "DOWN" : "UNKNOWN";
        } else {
          state = bodyAngle > UP_THRESH ? "UP" : bodyAngle < DOWN_THRESH ? "DOWN" : "UNKNOWN";
        }
        // If starting in DOWN state, mark downReached so first rep can be counted
        if (state === "DOWN") {
          downReached = true;
        }
        initialized = true;
        phaseStartTime = now;
        lastPhaseTransitionTime = now;
        currentPhase = state === "UP" ? "UP" : state === "DOWN" ? "DOWN" : "REST";
      }

      // Detect holds
      let nearBottom = false;
      let nearTop = false;
      
      if (isElevation) {
        nearBottom = bodyAngle <= DOWN_THRESH + epsilon;
        nearTop = bodyAngle >= UP_THRESH - epsilon;
      } else {
        nearBottom = bodyAngle <= DOWN_THRESH + epsilon;
        nearTop = bodyAngle >= UP_THRESH - epsilon;
      }

      // Update hold states
      if (nearBottom && !isHoldingBottom) {
        isHoldingBottom = true;
        holdBottomStartTime = now;
      } else if (!nearBottom && isHoldingBottom) {
        isHoldingBottom = false;
        holdBottomStartTime = null;
      }

      if (nearTop && !isHoldingTop) {
        isHoldingTop = true;
        holdTopStartTime = now;
      } else if (!nearTop && isHoldingTop) {
        isHoldingTop = false;
        holdTopStartTime = null;
      }

      // State transitions and rep counting
      let stateChanged = false;
      
      if (isElevation) {
        // For elevation: higher value = up position, lower value = down position
        if (bodyAngle >= UP_THRESH && state !== "UP") {
          state = "UP";
          stateChanged = true;
          if (downReached) {
            repCount += 1;
            repJustCounted = true;
            downReached = false;
          }
          // Track up phase timing
          if (lastDownStartTime !== null) {
            lastDownEndTime = now;
            lastDownDuration = lastDownEndTime - lastDownStartTime;
          }
          lastUpStartTime = now;
        } else if (bodyAngle <= DOWN_THRESH && state !== "DOWN") {
          state = "DOWN";
          stateChanged = true;
          downReached = true;
          // Track up phase timing
          if (lastUpStartTime !== null) {
            lastUpEndTime = now;
            lastUpDuration = lastUpEndTime - lastUpStartTime;
          }
          lastDownStartTime = now;
        } else if (bodyAngle > DOWN_THRESH && bodyAngle < UP_THRESH) {
          // In between thresholds - consider it REST
          if (state === "UP" || state === "DOWN") {
            state = "UNKNOWN";
            stateChanged = true;
          }
        }
      } else {
        // For angles: higher angle = up position, lower angle = down position
        if (bodyAngle > UP_THRESH && state !== "UP") {
          state = "UP";
          stateChanged = true;
          if (downReached) {
            repCount += 1;
            repJustCounted = true;
            downReached = false;
          }
          // Track up phase timing
          if (lastDownStartTime !== null) {
            lastDownEndTime = now;
            lastDownDuration = lastDownEndTime - lastDownStartTime;
          }
          lastUpStartTime = now;
        } else if (bodyAngle < DOWN_THRESH && state !== "DOWN") {
          state = "DOWN";
          stateChanged = true;
          downReached = true;
          // Track up phase timing
          if (lastUpStartTime !== null) {
            lastUpEndTime = now;
            lastUpDuration = lastUpEndTime - lastUpStartTime;
          }
          lastDownStartTime = now;
        } else if (bodyAngle >= DOWN_THRESH && bodyAngle <= UP_THRESH) {
          // In between thresholds - consider it REST
          if (state === "UP" || state === "DOWN") {
            state = "UNKNOWN";
            stateChanged = true;
          }
        }
      }

      // Update phase tracking
      if (stateChanged) {
        lastPhaseTransitionTime = now;
        phaseStartTime = now;
        currentPhase = state === "UP" ? "UP" : state === "DOWN" ? "DOWN" : "REST";
      }

      const phaseMs = phaseStartTime ? now - phaseStartTime : 0;

      return {
        repCount,
        state,
        repJustCounted,
        telemetry: {
          phase: currentPhase,
          phaseMs,
          lastDownMs: lastDownDuration,
          lastUpMs: lastUpDuration,
          holdBottomMs: isHoldingBottom && holdBottomStartTime ? now - holdBottomStartTime : null,
          holdTopMs: isHoldingTop && holdTopStartTime ? now - holdTopStartTime : null,
          tempoStatusDown: classifyTempo(lastDownDuration, config.tempo?.downSec),
          tempoStatusUp: classifyTempo(lastUpDuration, config.tempo?.upSec),
          tempoStatusHoldBottom: classifyTempo(
            isHoldingBottom && holdBottomStartTime ? now - holdBottomStartTime : null,
            config.tempo?.holdBottomSec
          ),
          tempoStatusHoldTop: classifyTempo(
            isHoldingTop && holdTopStartTime ? now - holdTopStartTime : null,
            config.tempo?.holdTopSec
          ),
        } as RepTelemetry
      };
    },
    get() {
      return { repCount, state };
    },
    reset() {
      state = "UNKNOWN";
      downReached = false;
      repCount = 0;
      initialized = false;
      currentPhase = "REST";
      phaseStartTime = null;
      lastPhaseTransitionTime = null;
      lastDownStartTime = null;
      lastUpStartTime = null;
      lastDownEndTime = null;
      lastUpEndTime = null;
      lastDownDuration = null;
      lastUpDuration = null;
      holdBottomStartTime = null;
      holdTopStartTime = null;
      isHoldingBottom = false;
      isHoldingTop = false;
    },
  };
}
