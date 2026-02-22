"use client"

import { useEffect, useRef } from "react"
import * as voiceCoach from "./voiceCoach"
import type { SessionMetrics } from "@/lib/types"

interface UseVoiceCoachOptions {
  sessionActive: boolean
  metrics: SessionMetrics
}

/**
 * Hook that monitors session metrics and triggers voice coaching cues
 * 
 * Observes:
 * - feedback.status changes (Good form -> Needs work, etc.)
 * - repCount increments
 * - poseConfidence drops below threshold
 * - tempoStatus changes
 */
export function useVoiceCoach({ sessionActive, metrics }: UseVoiceCoachOptions) {
  const lastRepCountRef = useRef<number>(metrics.repCount)
  const lastFeedbackStatusRef = useRef<string>(metrics.feedback.status)
  const lastTempoStatusRef = useRef<string | undefined>(metrics.tempoStatus)
  const lowConfidenceStartRef = useRef<number | null>(null)
  const initializedRef = useRef<boolean>(false)

  // Initialize voice coach on mount
  useEffect(() => {
    if (!initializedRef.current) {
      voiceCoach.initVoiceCoach().catch((e) => {
        console.error("[useVoiceCoach] Failed to initialize:", e)
      })
      initializedRef.current = true
    }
  }, [])

  // Stop speaking when session is paused or ended
  useEffect(() => {
    if (!sessionActive) {
      voiceCoach.stopSpeaking()
    }
  }, [sessionActive])

  // Monitor rep count changes
  useEffect(() => {
    if (!sessionActive || !voiceCoach.isEnabled()) return

    const repDelta = metrics.repCount - lastRepCountRef.current
    if (repDelta > 0) {
      // Rep count increased
      if (metrics.repCount === 1) {
        voiceCoach.speak("First rep complete!")
      } else if (metrics.repCount % 5 === 0) {
        // Every 5 reps
        voiceCoach.speak(`Rep ${metrics.repCount}`)
      } else if (metrics.lastScore >= 90) {
        voiceCoach.speak("Nice rep!")
      } else {
        voiceCoach.speak(`Rep ${metrics.repCount}`)
      }
      lastRepCountRef.current = metrics.repCount
    }
  }, [metrics.repCount, metrics.lastScore, sessionActive])

  // Monitor feedback status changes
  useEffect(() => {
    if (!sessionActive || !voiceCoach.isEnabled()) return

    const currentStatus = metrics.feedback.status
    const previousStatus = lastFeedbackStatusRef.current

    // Only speak on transitions (not every frame)
    if (currentStatus !== previousStatus) {
      if (currentStatus === "Good form" && previousStatus !== "Good form") {
        // Transitioned to good form (sparingly)
        if (Math.random() < 0.3) {
          // Only 30% chance to avoid spam
          voiceCoach.speak("Good form")
        }
      } else if (currentStatus === "Needs work") {
        // Check which specific check failed to give targeted feedback
        const failedChecks = metrics.feedback.checks.filter((c) => !c.ok)
        if (failedChecks.length > 0) {
          const checkLabel = failedChecks[0].label.toLowerCase()
          
          // Map common check labels to voice cues
          if (checkLabel.includes("depth") || checkLabel.includes("hip flexion")) {
            voiceCoach.speak("Go lower", { priority: 6 })
          } else if (checkLabel.includes("knee") || checkLabel.includes("alignment")) {
            voiceCoach.speak("Keep knees aligned", { priority: 6 })
          } else if (checkLabel.includes("trunk") || checkLabel.includes("back")) {
            voiceCoach.speak("Keep your back straight", { priority: 6 })
          } else if (checkLabel.includes("heel")) {
            voiceCoach.speak("Keep heels down", { priority: 6 })
          } else {
            // Generic feedback
            voiceCoach.speak("Adjust your form", { priority: 5 })
          }
        }
      } else if (currentStatus === "Watch form") {
        // Low confidence or pose not detected
        voiceCoach.speak("Step into frame", { priority: 7 })
      }

      lastFeedbackStatusRef.current = currentStatus
    }
  }, [metrics.feedback.status, metrics.feedback.checks, sessionActive])

  // Monitor tempo status (too fast/slow)
  useEffect(() => {
    if (!sessionActive || !voiceCoach.isEnabled()) return

    const currentTempo = metrics.tempoStatus
    const previousTempo = lastTempoStatusRef.current

    // Only speak on transitions
    if (currentTempo !== previousTempo) {
      if (currentTempo === "fast") {
        voiceCoach.speak("Slow down", { priority: 6 })
      } else if (currentTempo === "slow") {
        voiceCoach.speak("Keep it moving", { priority: 5 })
      }
      lastTempoStatusRef.current = currentTempo
    }
  }, [metrics.tempoStatus, sessionActive])

  // Monitor pose confidence - speak if low for >2 seconds
  useEffect(() => {
    if (!sessionActive || !voiceCoach.isEnabled()) return

    const LOW_CONFIDENCE_THRESHOLD = 0.5
    const LOW_CONFIDENCE_DURATION_MS = 2000

    if (metrics.poseConfidence < LOW_CONFIDENCE_THRESHOLD) {
      if (lowConfidenceStartRef.current === null) {
        lowConfidenceStartRef.current = Date.now()
      } else {
        const duration = Date.now() - lowConfidenceStartRef.current
        if (duration > LOW_CONFIDENCE_DURATION_MS) {
          voiceCoach.speak("Step into frame", { priority: 7 })
          lowConfidenceStartRef.current = null // Reset to avoid spam
        }
      }
    } else {
      lowConfidenceStartRef.current = null
    }
  }, [metrics.poseConfidence, sessionActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceCoach.stopSpeaking()
    }
  }, [])
}

