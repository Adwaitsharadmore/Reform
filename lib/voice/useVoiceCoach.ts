"use client"

import { useEffect, useRef } from "react"
import * as voiceCoach from "./voiceCoach"
import type { SessionMetrics, Plan, RepTelemetry } from "@/lib/types"
import { getExerciseConfig, getPoseConfig } from "@/lib/pose/config"
import { createCoachingFSM } from "@/lib/pose/coachingFsm"

interface UseVoiceCoachOptions {
  sessionActive: boolean
  metrics: SessionMetrics
  plan: Plan
}

/**
 * Hook that monitors session metrics and triggers voice coaching cues
 * 
 * Observes:
 * - feedback.status changes (Good form -> Needs work, etc.)
 * - repCount increments
 * - poseConfidence drops below threshold
 * - tempoStatus changes
 * - repState changes (for phase-based coaching)
 * 
 * Uses exercise-specific coaching messages from config
 */
export function useVoiceCoach({ sessionActive, metrics, plan }: UseVoiceCoachOptions) {
  const lastRepCountRef = useRef<number>(metrics.repCount)
  const lastFeedbackStatusRef = useRef<string>(metrics.feedback.status)
  const lastTempoStatusRef = useRef<string | undefined>(metrics.tempoStatus)
  const lastRepStateRef = useRef<string>(metrics.repState)
  const initializedRef = useRef<boolean>(false)
  // Exercise-specific feedback tracking
  const lastAngleFeedbackRef = useRef<Record<string, string | null>>({})
  const lastAngleFeedbackTimeRef = useRef<Record<string, number>>({})
  const sessionEndSpokenRef = useRef<Record<string, boolean>>({})
  const lowConfidenceStartRef = useRef<Record<string, number | null>>({})
  const lastPositionFeedbackTimeRef = useRef<Record<string, number>>({})
  
  // FSM integration for primary/secondary coaching
  const coachingFSMRef = useRef<ReturnType<typeof createCoachingFSM> | null>(null)
  const lastPrimaryInstructionRef = useRef<string | null>(null)
  const lastPrimaryInstructionTimeRef = useRef<number>(0)
  const lastSecondaryCorrectionRef = useRef<string | null>(null)
  const lastSecondaryCorrectionTimeRef = useRef<number>(0)
  const PRIMARY_COOLDOWN_MS = 1000 // Don't repeat primary instruction for 1 second
  const SECONDARY_COOLDOWN_MS = 4000 // Don't repeat secondary correction for 4 seconds
  
  // Get exercise-specific config
  const exerciseConfig = getExerciseConfig(metrics.currentExercise)
  const poseConfig = exerciseConfig || getPoseConfig(plan.injuryArea)

  // Initialize voice coach on mount
  useEffect(() => {
    if (!initializedRef.current) {
      voiceCoach.initVoiceCoach().catch((e) => {
        console.error("[useVoiceCoach] Failed to initialize:", e)
      })
      initializedRef.current = true
    }
  }, [])

  // Initialize FSM when exercise config changes
  useEffect(() => {
    if (poseConfig.coaching?.repScript) {
      coachingFSMRef.current = createCoachingFSM(poseConfig)
    } else {
      coachingFSMRef.current = null
    }
  }, [poseConfig, metrics.currentExercise])

  // Reset FSM on exercise change
  useEffect(() => {
    coachingFSMRef.current?.reset()
    lastPrimaryInstructionRef.current = null
    lastSecondaryCorrectionRef.current = null
    lastPrimaryInstructionTimeRef.current = 0
    lastSecondaryCorrectionTimeRef.current = 0
  }, [metrics.currentExercise])

  // Update FSM on each metrics update
  useEffect(() => {
    if (!sessionActive || !coachingFSMRef.current) return

    const repJustCounted = metrics.repCount !== lastRepCountRef.current
    if (repJustCounted) {
      lastRepCountRef.current = metrics.repCount
    }

    coachingFSMRef.current.update({
      telemetry: metrics.tempoTelemetry,
      repJustCounted,
      feedback: metrics.feedback,
      bodyAngle: metrics.bodyAngle,
      repState: metrics.repState,
      repCount: metrics.repCount,
    })
  }, [metrics.tempoTelemetry, metrics.feedback, metrics.bodyAngle, metrics.repState, metrics.repCount, sessionActive])

  // Speak primary instructions from FSM
  useEffect(() => {
    if (!voiceCoach.isEnabled()) return
    if (!sessionActive || !coachingFSMRef.current) return
    if (metrics.poseConfidence < 0.5) return // Don't speak if pose not detected

    const primaryMessage = coachingFSMRef.current.getPrimaryInstruction()

    if (!primaryMessage) return

    // Only speak if message changed AND (first time OR enough time has passed)
    const now = Date.now()
    const lastSpoken = lastPrimaryInstructionRef.current
    const timeSinceLastPrimary = now - lastPrimaryInstructionTimeRef.current
    const isFirstTime = lastSpoken === null
    const cooldownPassed = timeSinceLastPrimary > PRIMARY_COOLDOWN_MS

    if (primaryMessage !== lastSpoken && (isFirstTime || cooldownPassed)) {
      voiceCoach.speak(primaryMessage, { priority: 4 })
      lastPrimaryInstructionRef.current = primaryMessage
      lastPrimaryInstructionTimeRef.current = now
    }
  }, [metrics.repState, metrics.tempoTelemetry, sessionActive, metrics.poseConfidence])

  // Speak secondary corrections from FSM
  useEffect(() => {
    if (!voiceCoach.isEnabled()) return
    if (!sessionActive || !coachingFSMRef.current) return
    if (metrics.poseConfidence < 0.5) return

    const secondaryMessage = coachingFSMRef.current.getSecondaryCorrection(
      metrics.feedback,
      metrics.tempoTelemetry
    )

    const now = Date.now()
    const lastSpoken = lastSecondaryCorrectionRef.current
    const timeSinceLastSecondary = now - lastSecondaryCorrectionTimeRef.current
    const isFirstTime = lastSpoken === null
    const cooldownPassed = timeSinceLastSecondary > SECONDARY_COOLDOWN_MS

    // Only speak if:
    // 1. There's a correction message
    // 2. It's different from last spoken correction
    // 3. First time OR enough time has passed (cooldown)
    if (secondaryMessage && 
        secondaryMessage !== lastSpoken &&
        (isFirstTime || cooldownPassed)) {
      voiceCoach.speak(secondaryMessage, { priority: 5 })
      lastSecondaryCorrectionRef.current = secondaryMessage
      lastSecondaryCorrectionTimeRef.current = now
    } else if (!secondaryMessage) {
      // Clear tracking when no correction needed
      lastSecondaryCorrectionRef.current = null
    }
  }, [metrics.feedback, metrics.tempoTelemetry, sessionActive, metrics.poseConfidence])

  // Stop speaking when session is paused or ended
  useEffect(() => {
    if (!sessionActive) {
      voiceCoach.stopSpeaking()
    }
  }, [sessionActive])

  // Monitor rep count changes - DISABLED for all exercises (using simplified coaching)
  // useEffect(() => {
  //   // Disabled - using simplified exercise-specific coaching instead
  // }, [])

  // Monitor feedback status changes - DISABLED for all exercises (using simplified coaching)
  // useEffect(() => {
  //   // Disabled - using simplified exercise-specific coaching instead
  // }, [])

  // Monitor tempo status - DISABLED for all exercises (using simplified coaching)
  // useEffect(() => {
  //   // Disabled - using simplified exercise-specific coaching instead
  // }, [])

  // Monitor repState changes - DISABLED for all exercises (using simplified coaching)
  // useEffect(() => {
  //   // Disabled - using simplified exercise-specific coaching instead
  // }, [])

  // Monitor pose confidence for ALL exercises - "be in position" when user can't be detected
  useEffect(() => {
    if (!voiceCoach.isEnabled()) return
    if (!sessionActive) return

    const exercise = metrics.currentExercise
    const LOW_CONFIDENCE_THRESHOLD = 0.5
    const LOW_CONFIDENCE_DURATION_MS = 2000
    const POSITION_FEEDBACK_COOLDOWN_MS = 3000

    const now = Date.now()
    const timeSinceLastPositionFeedback = (lastPositionFeedbackTimeRef.current[exercise] || 0)
    const timeSince = now - timeSinceLastPositionFeedback

    if (metrics.poseConfidence < LOW_CONFIDENCE_THRESHOLD) {
      const startTime = lowConfidenceStartRef.current[exercise]
      if (startTime === null || startTime === undefined) {
        lowConfidenceStartRef.current[exercise] = Date.now()
      } else {
        const duration = Date.now() - startTime
        if (duration > LOW_CONFIDENCE_DURATION_MS && timeSince > POSITION_FEEDBACK_COOLDOWN_MS) {
          voiceCoach.speak("Be in position", { priority: 7 })
          lowConfidenceStartRef.current[exercise] = null
          lastPositionFeedbackTimeRef.current[exercise] = now
        }
      }
    } else {
      lowConfidenceStartRef.current[exercise] = null
    }
  }, [metrics.poseConfidence, metrics.currentExercise, sessionActive])

  // Exercise-specific angle/elevation feedback for ALL exercises - driven by poseConfig
  useEffect(() => {
    if (!voiceCoach.isEnabled()) return
    if (!sessionActive || metrics.poseConfidence < 0.5) return

    const exercise = metrics.currentExercise
    const ANGLE_FEEDBACK_COOLDOWN_MS = 2000

    // Only provide depth feedback when user is in "up" or "rest" position (standing)
    // Don't give depth feedback when they're already in the "down" position (doing the movement)
    // This prevents nagging them about depth while they're already squatting
    if (metrics.repState === "down") {
      // Clear any pending depth feedback when in down position
      lastAngleFeedbackRef.current[exercise] = null
      return
    }

    // Get the current angle/elevation value
    // For trackBothSides: pick the side that exists, prefer the one further from acceptable range
    let currentValue: number | null = null
    if (poseConfig.trackBothSides && (metrics.leftBodyAngle != null || metrics.rightBodyAngle != null)) {
      const leftAngle = metrics.leftBodyAngle
      const rightAngle = metrics.rightBodyAngle
      
      if (leftAngle != null && rightAngle != null) {
        // Both exist: pick the one that's further from acceptable range (needs more correction)
        const shallowAngle = poseConfig.shallowAngle
        const isElevation = poseConfig.measurementType === 'elevation'
        const depthDirection = poseConfig.depthDirection || 'lowerBetter'
        
        // Calculate distance from acceptable range for each side
        let leftDistance: number
        let rightDistance: number
        
        if (isElevation) {
          // For elevation: higher is better, too shallow if < shallowAngle
          leftDistance = leftAngle < shallowAngle ? shallowAngle - leftAngle : 0
          rightDistance = rightAngle < shallowAngle ? shallowAngle - rightAngle : 0
        } else if (depthDirection === 'higherBetter') {
          // For higherBetter: higher is better, too shallow if < shallowAngle
          leftDistance = leftAngle < shallowAngle ? shallowAngle - leftAngle : 0
          rightDistance = rightAngle < shallowAngle ? shallowAngle - rightAngle : 0
        } else {
          // For lowerBetter: lower is better, too shallow if > shallowAngle
          leftDistance = leftAngle > shallowAngle ? leftAngle - shallowAngle : 0
          rightDistance = rightAngle > shallowAngle ? rightAngle - shallowAngle : 0
        }
        
        // Pick the side that needs more correction (further from acceptable)
        currentValue = leftDistance > rightDistance ? leftAngle : rightAngle
      } else {
        // Only one side exists, use it
        currentValue = leftAngle ?? rightAngle ?? null
      }
    } else {
      currentValue = metrics.bodyAngle
    }

    if (currentValue == null) return

    const now = Date.now()
    const lastFeedbackTime = lastAngleFeedbackTimeRef.current[exercise] || 0
    const timeSinceLastFeedback = now - lastFeedbackTime
    const lastFeedback = lastAngleFeedbackRef.current[exercise]

    // Get config values
    const isElevation = poseConfig.measurementType === 'elevation'
    const depthDirection = poseConfig.depthDirection || 'lowerBetter'
    const shallowAngle = poseConfig.shallowAngle
    const maxAngle = poseConfig.primaryAngle?.maxAngle
    const minAngle = poseConfig.primaryAngle?.minAngle

    // Check if depth is actually the issue by looking at feedback checks
    // Only provide depth feedback if the depth check is actually failing
    const depthCheck = metrics.feedback.checks.find(c => c.label === poseConfig.depthLabel)
    const isDepthIssue = depthCheck && !depthCheck.ok

    // Determine if too shallow based on measurement type and depth direction
    // For lowerBetter exercises, use maxAngle (target depth) if available, otherwise shallowAngle
    // For higherBetter exercises, use shallowAngle (minimum acceptable) or minAngle if available
    let isTooShallow = false
    if (isElevation) {
      // For elevation: higher value = better, too shallow if currentValue < shallowAngle
      isTooShallow = currentValue < shallowAngle
    } else {
      // For angles
      if (depthDirection === 'higherBetter') {
        // Higher angle = better depth
        // Use minAngle if available (minimum acceptable), otherwise shallowAngle
        const threshold = minAngle != null ? minAngle : shallowAngle
        isTooShallow = currentValue < threshold
      } else {
        // Lower angle = better depth (default, e.g., squats, lunges)
        // Use maxAngle if available (target depth), otherwise shallowAngle
        // For squats: maxAngle=115 means good depth is ≤115°, so >115° is too shallow
        const threshold = maxAngle != null ? maxAngle : shallowAngle
        isTooShallow = currentValue > threshold
      }
    }

    // Only provide depth feedback if depth is actually the issue
    // If "Needs work" is due to alignment or other issues, don't give depth feedback
    if (!isDepthIssue) {
      isTooShallow = false
    }

    // Check if too far (only for higherBetter exercises with maxAngle)
    const isTooFar = depthDirection === 'higherBetter' && maxAngle != null && currentValue > maxAngle && isDepthIssue

    // Exercise-specific feedback messages
    const feedbackMessages: Record<string, { tooShallow: string; tooFar?: string }> = {
      "Shoulder Raise": { tooShallow: "Raise your arms higher", tooFar: "Lower your arms slightly" },
      "Hip Hinge": { tooShallow: "Push your hips back more" },
      "Squat": { tooShallow: "Sink lower into your squat" },
      "Lunge": { tooShallow: "Lower your back knee more" },
      "Shoulder Press": { tooShallow: "Extend your arms fully" },
      "Calf Raise": { tooShallow: "Rise up onto your toes" },
    }

    const messages = feedbackMessages[exercise] || { tooShallow: "Adjust your form" }
    let feedbackMessage: string | null = null
    let feedbackKey: string | null = null

    if (isTooFar && messages.tooFar) {
      // Too far takes priority
      feedbackKey = "tooFar"
      feedbackMessage = messages.tooFar
    } else if (isTooShallow) {
      feedbackKey = "tooShallow"
      feedbackMessage = messages.tooShallow
    }

    // Determine acceptable range for clearing feedback
    const isInAcceptableRange = !isTooShallow && !isTooFar

    if (feedbackMessage && feedbackKey && lastFeedback !== feedbackKey && timeSinceLastFeedback > ANGLE_FEEDBACK_COOLDOWN_MS) {
      voiceCoach.speak(feedbackMessage, { priority: 6 })
      lastAngleFeedbackRef.current[exercise] = feedbackKey
      lastAngleFeedbackTimeRef.current[exercise] = now
    } else if (isInAcceptableRange) {
      // Clear feedback state when in acceptable range
      lastAngleFeedbackRef.current[exercise] = null
    }
  }, [metrics.bodyAngle, metrics.leftBodyAngle, metrics.rightBodyAngle, metrics.currentExercise, metrics.poseConfidence, metrics.feedback.checks, metrics.repState, sessionActive, poseConfig])

  // Monitor session end for ALL exercises
  useEffect(() => {
    if (!voiceCoach.isEnabled()) return

    const exercise = metrics.currentExercise

    // Session just ended (was active, now not active)
    if (!sessionActive && metrics.repCount > 0 && !sessionEndSpokenRef.current[exercise]) {
      sessionEndSpokenRef.current[exercise] = true
      setTimeout(() => {
        voiceCoach.speak("Session complete", { priority: 5 })
      }, 500)
    }

    // Reset when session starts again
    if (sessionActive) {
      sessionEndSpokenRef.current[exercise] = false
    }
  }, [sessionActive, metrics.repCount, metrics.currentExercise])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceCoach.stopSpeaking()
    }
  }, [])
}

