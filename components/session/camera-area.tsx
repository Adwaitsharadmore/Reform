"use client"

import { useAppState } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Play, Pause, Square, FlipHorizontal2, Bone } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { createPoseLandmarker } from "@/lib/pose/poseEngine"
import { angleABC } from "@/lib/pose/angles"
import { createRepCounter } from "@/lib/pose/repCounter"
import { getPoseConfig, getExerciseConfig, LANDMARKS } from "@/lib/pose/config"
import { scoreRep } from "@/lib/pose/feedback"
import type { SessionMetrics } from "@/lib/types"

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

export function CameraArea() {
  const { sessionActive, setSessionActive, metrics, setMetrics, plan, setSessionResult, demoWatched } = useAppState()
  
  // Get pose configuration based on current exercise, fallback to injury area
  const exerciseConfig = getExerciseConfig(metrics.currentExercise)
  const poseConfig = exerciseConfig || getPoseConfig(plan.injuryArea)

  const [showSkeleton, setShowSkeleton] = useState(true)
  const [mirrorCamera, setMirrorCamera] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showTip, setShowTip] = useState(true)
  const [debugInfo, setDebugInfo] = useState<{
    landmarksPresent: boolean
    poseConfidence: number
    bodyAngle: number
    repState: string
    repCount: number
    // Elevation-specific debug info
    elevationState?: string
    heelY?: number
    baselineHeelY?: number
    elevation?: number
    velocity?: number
    stableFrames?: number
  } | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  // Video + Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Pose landmarker + loop refs
  const landmarkerRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)
  const sessionActiveRef = useRef<boolean>(false)
  const consoleFilterInstalledRef = useRef<boolean>(false)

  // Rep counter + rep scoring (will be initialized with config in handleStart)
  const repCounterRef = useRef<ReturnType<typeof createRepCounter> | null>(null)
  const repMinAngleRef = useRef<number>(999)
  const lastDownTsRef = useRef<number | null>(null)
  const currentRepCountRef = useRef<number>(0)

  // Very small smoothing buffer for body angle
  const angleBufRef = useRef<number[]>([])
  
  // For tracking both sides (e.g., shoulder raises)
  const leftAngleBufRef = useRef<number[]>([])
  const rightAngleBufRef = useRef<number[]>([])
  const leftAngleHistoryRef = useRef<number[]>([]) // Track angle history to determine movement range
  const rightAngleHistoryRef = useRef<number[]>([])
  const activeSideRef = useRef<"left" | "right" | null>(null) // Which side is currently being tracked
  
  // For elevation-based exercises (e.g., calf raises): state machine with hysteresis
  type ElevationState = "CALIBRATING_REST" | "REST" | "UP" | "MOVING"
  const elevationStateRef = useRef<ElevationState>("CALIBRATING_REST")
  const baselineHeelYRef = useRef<number | null>(null) // Baseline heel Y position at rest (normalized)
  const heelYSamplesRef = useRef<number[]>([]) // Samples for calibration
  const currentHeelYRef = useRef<number | null>(null) // Current heel Y position
  const prevHeelYRef = useRef<number | null>(null) // Previous heel Y for velocity calculation
  const elevationRef = useRef<number>(0) // Current elevation = baselineY - heelY
  const velocityRef = useRef<number>(0) // Current velocity = abs(heelY - prevHeelY)
  const stableFramesRef = useRef<number>(0) // Consecutive frames with velocity < threshold
  const upFramesRef = useRef<number>(0) // Consecutive frames above upThreshold
  const downFramesRef = useRef<number>(0) // Consecutive frames below downThreshold
  const minHeelYRef = useRef<number | null>(null) // Minimum heel Y during current rep (highest elevation/raised position)
  const maxHeelYRef = useRef<number | null>(null) // Maximum heel Y during current rep (lowest elevation/rest position)
  const elevationDiffRef = useRef<number>(0) // Difference between rest and raised positions (for display)
  
  // Constants for state machine
  const STABLE_VEL_THRESHOLD = 0.001 // Velocity threshold for stability (normalized)
  const CALIBRATION_STABLE_FRAMES = 20 // Frames needed for calibration
  const CALIBRATION_VARIANCE_THRESHOLD = 0.0001 // Max variance for calibration
  const UP_FRAMES_THRESHOLD = 3 // Frames above threshold to enter UP
  const DOWN_FRAMES_THRESHOLD = 3 // Frames below threshold to enter REST
  const REST_STABLE_FRAMES = 8 // Stable frames needed to enter REST
  const BASELINE_ADAPT_STABLE_FRAMES = 15 // Stable frames needed for baseline adaptation
  const BASELINE_EMA_ALPHA = 0.1 // EMA coefficient for baseline adaptation
  
  // Store current pose config ref to avoid stale closures
  const poseConfigRef = useRef(poseConfig)
  
  // Update pose config ref when exercise or plan changes
  useEffect(() => {
    const exerciseConfig = getExerciseConfig(metrics.currentExercise)
    poseConfigRef.current = exerciseConfig || getPoseConfig(plan.injuryArea)
    // Reinitialize rep counter with new config if it exists
    if (repCounterRef.current) {
      repCounterRef.current = createRepCounter(poseConfigRef.current)
    }
  }, [metrics.currentExercise, plan.injuryArea])

  // Keep sessionActiveRef in sync with sessionActive state
  useEffect(() => {
    sessionActiveRef.current = sessionActive
  }, [sessionActive])

  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sessionActive])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  async function setupCamera() {
    const video = videoRef.current
    if (!video) return
  
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: false,
    })
  
    video.srcObject = stream
    video.playsInline = true
    video.muted = true
  
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve()
    })
  
    await video.play()
  }

  // Install persistent console filter for MediaPipe INFO messages
  // This suppresses TensorFlow Lite initialization messages that appear
  // during the first detectForVideo call (lazy initialization)
  function installConsoleFilter() {
    if (consoleFilterInstalledRef.current) return
  
    const MEDIAPIPE_PATTERNS = ['TensorFlow Lite', 'XNNPACK', 'Created TensorFlow']
    const isSuppressed = (...args: any[]) =>
      MEDIAPIPE_PATTERNS.some((p) => args.join(' ').includes(p))
  
    const originalInfo  = console.info
    const originalLog   = console.log
    const originalWarn  = console.warn
    const originalError = console.error
  
    console.info  = (...args: any[]) => { if (isSuppressed(...args)) return; originalInfo.apply(console, args) }
    console.log   = (...args: any[]) => { if (isSuppressed(...args)) return; originalLog.apply(console, args) }
    console.warn  = (...args: any[]) => { if (isSuppressed(...args)) return; originalWarn.apply(console, args) }
    console.error = (...args: any[]) => { if (isSuppressed(...args)) return; originalError.apply(console, args) }
  
    consoleFilterInstalledRef.current = true
  }

  async function ensureLandmarker() {
    if (landmarkerRef.current) return landmarkerRef.current
    
    // Install console filter before loading MediaPipe
    installConsoleFilter()
    
    console.log("[PoseEngine] Loading MediaPipe Pose model...")
    try {
      landmarkerRef.current = await createPoseLandmarker()
      console.log("[PoseEngine] Pose model loaded ✅")
      return landmarkerRef.current
    } catch (e) {
      console.error("[PoseEngine] Pose model failed to load ❌", e)
      throw e
    }
  }
  function stopLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  function stopCamera() {
    const video = videoRef.current
    const stream = video?.srcObject as MediaStream | null
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    if (video) video.srcObject = null
  }

  function drawSkeleton(landmarks: any[], w: number, h: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Ensure canvas dimensions match video
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    ctx.clearRect(0, 0, w, h)

    if (!showSkeleton) return

    // basic points (not full connections list, keeps it simple)
    ctx.globalAlpha = 0.85
    ctx.lineWidth = 2
    ctx.strokeStyle = "#00ff00" // Green color for skeleton
    ctx.fillStyle = "#00ff00"

    const pts = landmarks.map((p) => ({ x: p.x * w, y: p.y * h, v: p.visibility ?? 0 }))

    // draw points
    for (const p of pts) {
      if (p.v < 0.5) continue
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw connections based on current pose config
    const config = poseConfigRef.current
    const primaryAngle = config.primaryAngle
    const connections = [
      [primaryAngle.pointA.left, primaryAngle.pointB.left],
      [primaryAngle.pointB.left, primaryAngle.pointC.left],
      [primaryAngle.pointA.right, primaryAngle.pointB.right],
      [primaryAngle.pointB.right, primaryAngle.pointC.right],
    ] as const

    for (const [a, b] of connections) {
      if ((pts[a]?.v ?? 0) < 0.5 || (pts[b]?.v ?? 0) < 0.5) continue
      ctx.beginPath()
      ctx.moveTo(pts[a].x, pts[a].y)
      ctx.lineTo(pts[b].x, pts[b].y)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }

  function computeFeedback(
    bodyAngle: number | null, 
    conf: number | null,
    landmarks?: any[],
    useRight?: boolean
  ): { status: "Good form" | "Needs work" | "Watch form"; checks: { label: string; ok: boolean }[] } {
    const config = poseConfigRef.current
    
    if (bodyAngle == null || conf == null || conf < 0.5) {
      const checks = [
        { label: config.depthLabel, ok: false },
        { label: "Control", ok: false },
        { label: config.alignmentLabel, ok: false },
      ]
      if (config.additionalLabels) {
        config.additionalLabels.forEach(label => checks.push({ label, ok: false }))
      }
      return { status: "Watch form", checks }
    }

    const checks: { label: string; ok: boolean }[] = []
    let hasIssues = false

    // Check primary angle/elevation (depth)
    let primaryOk: boolean
    if (config.measurementType === 'elevation') {
      // For elevation: check if the difference between top and rest meets the threshold
      // Use the elevation difference if available, otherwise use current elevation
      const elevationValue = elevationDiffRef.current > 0 ? elevationDiffRef.current : (bodyAngle ?? 0)
      primaryOk = elevationValue >= config.shallowAngle
    } else {
      // For angles: lower angle = deeper movement
      primaryOk = bodyAngle <= config.shallowAngle
    }
    checks.push({ label: config.depthLabel, ok: primaryOk })
    if (!primaryOk) hasIssues = true

    // Check additional angles if available
    if (config.additionalAngles && landmarks) {
      for (let i = 0; i < config.additionalAngles.length; i++) {
        const angleCheck = config.additionalAngles[i]
        const label = config.additionalLabels?.[i] || angleCheck.label
        
        const pointA = useRight ? landmarks[angleCheck.pointA.right] : landmarks[angleCheck.pointA.left]
        const pointB = useRight ? landmarks[angleCheck.pointB.right] : landmarks[angleCheck.pointB.left]
        const pointC = useRight ? landmarks[angleCheck.pointC.right] : landmarks[angleCheck.pointC.left]
        
        const angle = angleABC(pointA, pointB, pointC)
        let ok = true
        
        if (angle != null) {
          if (angleCheck.minAngle !== undefined && angle < angleCheck.minAngle) ok = false
          if (angleCheck.maxAngle !== undefined && angle > angleCheck.maxAngle) ok = false
        } else {
          ok = false
        }
        
        checks.push({ label, ok })
        if (!ok) hasIssues = true
      }
    }

    // Always include alignment check (using primary angle alignment)
    checks.push({ label: config.alignmentLabel, ok: true }) // Simplified for now

    // Control check (would need rep time tracking)
    checks.push({ label: "Control", ok: true }) // Simplified for now

    // Determine status based on measurement type
    let status: "Good form" | "Needs work" | "Watch form"
    if (config.measurementType === 'elevation') {
      const elevationValue = elevationDiffRef.current > 0 ? elevationDiffRef.current : (bodyAngle ?? 0)
      status = hasIssues || elevationValue < config.shallowAngle 
        ? "Needs work" 
        : "Good form"
    } else {
      status = hasIssues || bodyAngle > config.shallowAngle 
        ? "Needs work" 
        : "Good form"
    }
    
    return { status, checks }
  }

  async function startPoseLoop() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const landmarker = await ensureLandmarker()
    try {
      await landmarker.setOptions({ runningMode: "VIDEO" })
    } catch {}
    const loop = () => {
      // stop if paused (use ref to avoid stale closure)
      if (!sessionActiveRef.current) {
        rafRef.current = null
        return
      }

      // Get video dimensions - ensure we have valid dimensions
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      
      // Error handling for detectForVideo
      // Note: MediaPipe may log "INFO: Created TensorFlow Lite XNNPACK delegate for CPU"
      // on the first detection call. This is expected and indicates successful initialization,
      // not an error. It's a one-time initialization message from TensorFlow Lite's backend.
      let res
      try {
        res = landmarker.detectForVideo(video, now)
      } catch (error) {
        console.error("[PoseLoop] Error in detectForVideo:", error)
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const landmarks = res?.landmarks?.[0]
      if (!landmarks || !repCounterRef.current) {
        console.log("No landmarks this frame or rep counter not initialized")
        const config = poseConfigRef.current
        const checks = [
          { label: config.depthLabel, ok: false },
          { label: "Control", ok: false },
          { label: config.alignmentLabel, ok: false },
        ]
        if (config.additionalLabels) {
          config.additionalLabels.forEach(label => checks.push({ label, ok: false }))
        }
        // Update debug info separately (not inside setMetrics to avoid React error)
        setDebugInfo({
          landmarksPresent: false,
          poseConfidence: 0,
          bodyAngle: 90,
          repState: "rest",
          repCount: currentRepCountRef.current,
        })
        setMetrics((prev) => ({
          ...prev,
          bodyAngle: 90,
          repState: "rest",
          poseConfidence: 0,
          feedback: {
            status: "Watch form",
            checks,
          },
        }))
        const ctx = canvas.getContext("2d")
        ctx?.clearRect(0, 0, w, h)
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      console.log("Landmarks ✅")

      const config = poseConfigRef.current
      
      // pose confidence proxy: average visibility of key points for this injury area
      const v = (i: number) => clamp01(landmarks[i]?.visibility ?? 0)
      // confidencePoints array has left points first, then right points
      const midPoint = config.confidencePoints.length / 2
      const leftConfPoints = config.confidencePoints.slice(0, midPoint)
      const rightConfPoints = config.confidencePoints.slice(midPoint)
      const rightConf = rightConfPoints.reduce((sum, idx) => sum + v(idx), 0) / rightConfPoints.length
      const leftConf = leftConfPoints.reduce((sum, idx) => sum + v(idx), 0) / leftConfPoints.length

      let bodyAngle: number | null = null
      let conf: number = 0
      let useRight: boolean = false

      // For exercises like shoulder raises, track both sides and use the one with more movement
      let leftAngle: number | null = null
      let rightAngle: number | null = null
      
      if (config.trackBothSides) {
        // Calculate angles for both sides using primary angle
        const leftPointA = landmarks[config.primaryAngle.pointA.left]
        const leftPointB = landmarks[config.primaryAngle.pointB.left]
        const leftPointC = landmarks[config.primaryAngle.pointC.left]
        
        const rightPointA = landmarks[config.primaryAngle.pointA.right]
        const rightPointB = landmarks[config.primaryAngle.pointB.right]
        const rightPointC = landmarks[config.primaryAngle.pointC.right]
        
        // Only calculate angle if all required landmarks are visible
        const v = (p: any) => clamp01(p?.visibility ?? 0)
        const leftAllVisible = v(leftPointA) >= 0.5 && v(leftPointB) >= 0.5 && v(leftPointC) >= 0.5
        const rightAllVisible = v(rightPointA) >= 0.5 && v(rightPointB) >= 0.5 && v(rightPointC) >= 0.5
        
        const leftRawAngle = leftAllVisible ? angleABC(leftPointA, leftPointB, leftPointC) : null
        const rightRawAngle = rightAllVisible ? angleABC(rightPointA, rightPointB, rightPointC) : null

        // Smooth both angles
        if (leftRawAngle != null) {
          leftAngleBufRef.current.push(leftRawAngle)
          if (leftAngleBufRef.current.length > 6) leftAngleBufRef.current.shift()
          leftAngle = leftAngleBufRef.current.reduce((a, b) => a + b, 0) / leftAngleBufRef.current.length
          leftAngleHistoryRef.current.push(leftAngle)
          if (leftAngleHistoryRef.current.length > 30) leftAngleHistoryRef.current.shift() // Keep last 30 frames
        }

        if (rightRawAngle != null) {
          rightAngleBufRef.current.push(rightRawAngle)
          if (rightAngleBufRef.current.length > 6) rightAngleBufRef.current.shift()
          rightAngle = rightAngleBufRef.current.reduce((a, b) => a + b, 0) / rightAngleBufRef.current.length
          rightAngleHistoryRef.current.push(rightAngle)
          if (rightAngleHistoryRef.current.length > 30) rightAngleHistoryRef.current.shift() // Keep last 30 frames
        }

        // Determine which side has more movement (greater range of motion)
        // Calculate range of motion for each side over the history window
        const leftRange = leftAngleHistoryRef.current.length > 0
          ? Math.max(...leftAngleHistoryRef.current) - Math.min(...leftAngleHistoryRef.current)
          : 0
        const rightRange = rightAngleHistoryRef.current.length > 0
          ? Math.max(...rightAngleHistoryRef.current) - Math.min(...rightAngleHistoryRef.current)
          : 0

        // Use the side with more movement, or fall back to confidence if ranges are similar
        if (Math.abs(leftRange - rightRange) > 5) {
          // Significant difference in movement - use the more active side
          useRight = rightRange > leftRange
          bodyAngle = useRight ? rightAngle : leftAngle
          conf = useRight ? rightConf : leftConf
          activeSideRef.current = useRight ? "right" : "left"
        } else {
          // Similar movement - use confidence to decide
          useRight = rightConf >= leftConf
          bodyAngle = useRight ? rightAngle : leftAngle
          conf = useRight ? rightConf : leftConf
          activeSideRef.current = useRight ? "right" : "left"
        }
        
        // If bodyAngle is null but we have at least one valid angle, use it
        if (bodyAngle == null) {
          if (leftAngle != null) {
            bodyAngle = leftAngle
            useRight = false
            conf = leftConf
            activeSideRef.current = "left"
          } else if (rightAngle != null) {
            bodyAngle = rightAngle
            useRight = true
            conf = rightConf
            activeSideRef.current = "right"
          }
        }
      } else {
        // Standard single-side tracking
        useRight = rightConf >= leftConf
        conf = useRight ? rightConf : leftConf

        // Check if this exercise uses elevation measurement (e.g., calf raises)
        if (config.measurementType === 'elevation' && config.elevationLandmark) {
          const heelLandmark = useRight ? landmarks[config.elevationLandmark.right] : landmarks[config.elevationLandmark.left]
          const v = (p: any) => clamp01(p?.visibility ?? 0)
          const heelVisible = heelLandmark && v(heelLandmark) >= 0.5

          if (heelVisible) {
            // Track heel Y position directly (point B)
            // In normalized coordinates, Y increases downward
            const currentHeelY = heelLandmark.y
            currentHeelYRef.current = currentHeelY
            
            // Calculate velocity (change in Y position)
            let velocity = 0
            if (prevHeelYRef.current !== null) {
              velocity = Math.abs(currentHeelY - prevHeelYRef.current)
            }
            velocityRef.current = velocity
            prevHeelYRef.current = currentHeelY
            
            // Update stability counter
            if (velocity < STABLE_VEL_THRESHOLD) {
              stableFramesRef.current += 1
            } else {
              stableFramesRef.current = 0
            }
            
            const state = elevationStateRef.current
            const upThreshold = config.primaryAngle.upThreshold ?? 0.02
            const downThreshold = config.primaryAngle.downThreshold ?? 0.005
            
            // State machine logic
            if (state === "CALIBRATING_REST") {
              // Collect samples for calibration
              heelYSamplesRef.current.push(currentHeelY)
              // Keep last 30 samples
              if (heelYSamplesRef.current.length > 30) {
                heelYSamplesRef.current.shift()
              }
              
              // Check if we have enough stable frames and low variance
              if (heelYSamplesRef.current.length >= CALIBRATION_STABLE_FRAMES && 
                  stableFramesRef.current >= CALIBRATION_STABLE_FRAMES) {
                // Calculate variance
                const mean = heelYSamplesRef.current.reduce((a, b) => a + b, 0) / heelYSamplesRef.current.length
                const variance = heelYSamplesRef.current.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / heelYSamplesRef.current.length
                
                if (variance < CALIBRATION_VARIANCE_THRESHOLD) {
                  // Set baseline to max Y (lowest heel = rest position)
                  baselineHeelYRef.current = Math.max(...heelYSamplesRef.current)
                  elevationStateRef.current = "REST"
                }
              }
              
              bodyAngle = null // Don't calculate until baseline is established
            } else if (baselineHeelYRef.current !== null) {
              // Calculate elevation: elevation = baselineY - currentY
              // When heel rises, Y decreases, so elevation = baselineY - currentY is positive
              const elevation = baselineHeelYRef.current - currentHeelY
              elevationRef.current = elevation
              
              // Update state machine with hysteresis
              if (state === "REST") {
                // Baseline adaptation: slowly update baseline toward current heelY when stable
                if (stableFramesRef.current >= BASELINE_ADAPT_STABLE_FRAMES) {
                  // EMA update, but never decrease baseline below current max
                  const newBaseline = baselineHeelYRef.current * (1 - BASELINE_EMA_ALPHA) + currentHeelY * BASELINE_EMA_ALPHA
                  // Baseline should represent rest/lowest elevation, so use max
                  baselineHeelYRef.current = Math.max(baselineHeelYRef.current, newBaseline, currentHeelY)
                }
                
                // Check for transition to UP
                if (elevation > upThreshold) {
                  upFramesRef.current += 1
                  if (upFramesRef.current >= UP_FRAMES_THRESHOLD) {
                    elevationStateRef.current = "UP"
                    upFramesRef.current = 0
                    downFramesRef.current = 0
                  }
                } else {
                  upFramesRef.current = 0
                }
              } else if (state === "UP") {
                // Check for transition to REST or MOVING
                if (elevation < downThreshold) {
                  downFramesRef.current += 1
                  if (downFramesRef.current >= DOWN_FRAMES_THRESHOLD && 
                      stableFramesRef.current >= REST_STABLE_FRAMES) {
                    elevationStateRef.current = "REST"
                    upFramesRef.current = 0
                    downFramesRef.current = 0
                  } else {
                    elevationStateRef.current = "MOVING"
                  }
                } else {
                  downFramesRef.current = 0
                  if (velocity > STABLE_VEL_THRESHOLD) {
                    elevationStateRef.current = "MOVING"
                  }
                }
              } else if (state === "MOVING") {
                // Check for transition to UP or REST
                if (elevation > upThreshold) {
                  upFramesRef.current += 1
                  if (upFramesRef.current >= UP_FRAMES_THRESHOLD) {
                    elevationStateRef.current = "UP"
                    upFramesRef.current = 0
                    downFramesRef.current = 0
                  }
                } else if (elevation < downThreshold && stableFramesRef.current >= REST_STABLE_FRAMES) {
                  downFramesRef.current += 1
                  if (downFramesRef.current >= DOWN_FRAMES_THRESHOLD) {
                    elevationStateRef.current = "REST"
                    upFramesRef.current = 0
                    downFramesRef.current = 0
                  }
                } else {
                  upFramesRef.current = 0
                  downFramesRef.current = 0
                }
              }
              
              // Use elevation directly for rep counting (no scaling)
              bodyAngle = elevation
            } else {
              bodyAngle = null
            }
          } else {
            bodyAngle = null
            currentHeelYRef.current = null
            prevHeelYRef.current = null
            stableFramesRef.current = 0
          }
        } else {
          // Standard angle-based measurement
          const pointA = useRight ? landmarks[config.primaryAngle.pointA.right] : landmarks[config.primaryAngle.pointA.left]
          const pointB = useRight ? landmarks[config.primaryAngle.pointB.right] : landmarks[config.primaryAngle.pointB.left]
          const pointC = useRight ? landmarks[config.primaryAngle.pointC.right] : landmarks[config.primaryAngle.pointC.left]

          // Only calculate angle if all required landmarks are visible
          const v = (p: any) => clamp01(p?.visibility ?? 0)
          const allVisible = v(pointA) >= 0.5 && v(pointB) >= 0.5 && v(pointC) >= 0.5
          
          const rawAngle = allVisible ? angleABC(pointA, pointB, pointC) : null
          bodyAngle = rawAngle

          // Smooth angle (moving average last 6 frames)
          if (bodyAngle != null) {
            const buf = angleBufRef.current
            buf.push(bodyAngle)
            if (buf.length > 6) buf.shift()
            const avg = buf.reduce((a, b) => a + b, 0) / buf.length
            bodyAngle = avg
          }
        }
      }

      // Track min angle / elevation positions during rep
      if (bodyAngle != null) {
        if (config.measurementType === 'elevation') {
          // For elevation, track the heel Y positions
          // Lower Y = higher elevation (heel is raised more)
          if (currentHeelYRef.current != null) {
            // Track minimum Y (highest elevation/raised position) during up phase
            if (minHeelYRef.current === null || currentHeelYRef.current < minHeelYRef.current) {
              minHeelYRef.current = currentHeelYRef.current
            }
            // Track maximum Y (lowest elevation/rest position) during down phase
            if (maxHeelYRef.current === null || currentHeelYRef.current > maxHeelYRef.current) {
              maxHeelYRef.current = currentHeelYRef.current
            }
          }
        } else {
          // For angles, track minimum (lower angle = deeper movement)
          repMinAngleRef.current = Math.min(repMinAngleRef.current, bodyAngle)
        }
      }

      // Rep counting
      let repCount: number
      let repJustCounted: boolean
      let repState: "up" | "down" | "rest"
      
      if (config.measurementType === 'elevation') {
        // For elevation exercises, use state machine state for repState
        const elevationState = elevationStateRef.current
        if (elevationState === "UP") {
          repState = "up"
        } else if (elevationState === "REST" || elevationState === "CALIBRATING_REST") {
          repState = "rest"
        } else {
          repState = "down" // MOVING state
        }
        
        // Use repCounter for rep counting based on elevation value
        // repCounter expects elevation to go UP (higher value) for "up" position
        const { repCount: rc, state: rcState, repJustCounted: rjc } = repCounterRef.current.update(bodyAngle)
        repCount = rc
        repJustCounted = rjc
        
        // Override repState with state machine state for better accuracy
        // But keep repCounter's state for internal logic
      } else {
        // For angle-based exercises, use repCounter state
        const { repCount: rc, state: rcState, repJustCounted: rjc } = repCounterRef.current.update(bodyAngle)
        repCount = rc
        repJustCounted = rjc
        repState = rcState === "UP" ? "up" : rcState === "DOWN" ? "down" : "rest"
      }

      let lastScore: number | undefined = undefined

      // Track when entering down/rest state for rep timing
      if (config.measurementType === 'elevation') {
        const elevationState = elevationStateRef.current
        if ((elevationState === "REST" || elevationState === "MOVING") && lastDownTsRef.current == null) {
          lastDownTsRef.current = Date.now()
        }
      } else {
        // For angle-based exercises, use repCounter state
        if (repState === "down" && lastDownTsRef.current == null) {
          lastDownTsRef.current = Date.now()
        }
      }

      if (repJustCounted) {
        let valueForScoring: number
        if (config.measurementType === 'elevation') {
          // For elevation, calculate the difference between rest and raised positions
          // This difference should be consistent regardless of distance
          if (minHeelYRef.current != null && maxHeelYRef.current != null) {
            // Difference = max Y - min Y (rest Y - raised Y, positive value, larger = better range of motion)
            const elevationDiff = maxHeelYRef.current - minHeelYRef.current
            elevationDiffRef.current = elevationDiff
            valueForScoring = elevationDiff
          } else {
            valueForScoring = bodyAngle ?? 0
          }
        } else {
          // For angles, use min angle
          valueForScoring = repMinAngleRef.current === 999 ? (bodyAngle ?? 999) : repMinAngleRef.current
        }
        const downTs = lastDownTsRef.current
        const repDuration = downTs ? Date.now() - downTs : null
        lastScore = scoreRep(valueForScoring, config) + (repDuration != null && repDuration < 900 ? -20 : 0)

        // reset trackers for next rep
        repMinAngleRef.current = 999
        minHeelYRef.current = null
        maxHeelYRef.current = null
        lastDownTsRef.current = null
      }

      const feedback = computeFeedback(bodyAngle, conf, landmarks, useRight)

      // Draw skeleton overlay
      drawSkeleton(landmarks, w, h)

      // Update app state metrics (CoachingPanel can display these)
      // Use functional update to avoid stale state, and preserve lastScore if not updated
      // For elevation, bodyAngle is already in normalized coordinates (no scaling needed)
      let roundedBodyAngle: number
      if (config.measurementType === 'elevation' && bodyAngle != null) {
        // bodyAngle is elevation in normalized coordinates, round to 4 decimals
        roundedBodyAngle = Math.round(bodyAngle * 10000) / 10000
      } else {
        roundedBodyAngle = bodyAngle != null ? Math.round(bodyAngle) : 90
      }
      const roundedLeftAngle = leftAngle != null ? Math.round(leftAngle) : undefined
      const roundedRightAngle = rightAngle != null ? Math.round(rightAngle) : undefined
      const poseConf = conf ?? 0
      
      // Update ref for debug info
      currentRepCountRef.current = repCount
      
      // Update React state using functional update to avoid stale closures
      setMetrics((prev) => {
        const updatedMetrics: SessionMetrics = {
          ...prev,
          bodyAngle: roundedBodyAngle,
          leftBodyAngle: config.trackBothSides ? roundedLeftAngle : undefined,
          rightBodyAngle: config.trackBothSides ? roundedRightAngle : undefined,
          repState,
          poseConfidence: poseConf,
          feedback,
          repCount,
          lastScore: lastScore !== undefined ? lastScore : prev.lastScore,
        }
        
        // Save metrics to database
        // Send when: rep count changes, score is updated, or feedback status changes
        const shouldSave = 
          repCount !== prev.repCount || 
          (lastScore !== undefined && lastScore !== prev.lastScore) ||
          feedback.status !== prev.feedback.status ||
          repJustCounted // Always save when a rep is just counted
        
        if (shouldSave) {
          fetch("/api/session/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedMetrics),
          }).catch((err) => console.error("Failed to save metrics:", err))
        }
        
        return updatedMetrics
      })

      // Update debug info separately (not inside setMetrics to avoid React error)
      const debugData: typeof debugInfo = {
        landmarksPresent: true,
        poseConfidence: poseConf,
        bodyAngle: roundedBodyAngle,
        repState,
        repCount,
      }
      
      // Add elevation-specific debug info
      if (config.measurementType === 'elevation') {
        debugData.elevationState = elevationStateRef.current
        debugData.heelY = currentHeelYRef.current != null ? Math.round(currentHeelYRef.current * 10000) / 10000 : undefined
        debugData.baselineHeelY = baselineHeelYRef.current != null ? Math.round(baselineHeelYRef.current * 10000) / 10000 : undefined
        debugData.elevation = elevationRef.current != null ? Math.round(elevationRef.current * 10000) / 10000 : undefined
        debugData.velocity = Math.round(velocityRef.current * 10000) / 10000
        debugData.stableFrames = stableFramesRef.current
      }
      
      setDebugInfo(debugData)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }

  async function handleStart() {
    setSessionActive(true)
    setShowTip(false)

    // Start the session via API
    try {
      await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.name }), // Use plan name as planId for now
      })
    } catch (error) {
      console.error("Error starting session:", error)
    }

    // Get the first exercise from the plan
    const firstExercise = plan.exercises[0]
    const exerciseToUse = firstExercise?.exercise ?? metrics.currentExercise
    
    // Initialize rep counter with exercise-specific pose config
    const exerciseConfig = getExerciseConfig(exerciseToUse)
    const config = exerciseConfig || getPoseConfig(plan.injuryArea)
    poseConfigRef.current = config
    repCounterRef.current = createRepCounter(config)
    
    // reset session metrics
    repCounterRef.current.reset()
    repMinAngleRef.current = 999
    lastDownTsRef.current = null
    angleBufRef.current = []
    leftAngleBufRef.current = []
    rightAngleBufRef.current = []
    leftAngleHistoryRef.current = []
    rightAngleHistoryRef.current = []
    activeSideRef.current = null
    currentRepCountRef.current = 0
    // Reset elevation tracking and state machine
    elevationStateRef.current = "CALIBRATING_REST"
    baselineHeelYRef.current = null
    heelYSamplesRef.current = []
    currentHeelYRef.current = null
    prevHeelYRef.current = null
    elevationRef.current = 0
    velocityRef.current = 0
    stableFramesRef.current = 0
    upFramesRef.current = 0
    downFramesRef.current = 0
    minHeelYRef.current = null
    maxHeelYRef.current = null
    elevationDiffRef.current = 0

    setMetrics((prev) => ({
      ...prev,
      currentExercise: exerciseToUse,
      targetReps: firstExercise?.reps ?? prev.targetReps,
      totalSets: firstExercise?.sets ?? prev.totalSets,
      currentSet: 1,
      repCount: 0,
      lastScore: 0,
      bodyAngle: 90,
      leftBodyAngle: config.trackBothSides ? undefined : undefined,
      rightBodyAngle: config.trackBothSides ? undefined : undefined,
      repState: "rest",
      poseConfidence: 0,
      feedback: {
        status: "Watch form",
        checks: [
          { label: config.depthLabel, ok: false },
          { label: "Control", ok: false },
          { label: config.alignmentLabel, ok: false },
        ],
      },
    }))

    await setupCamera()
    await startPoseLoop()
  }

  function handlePause() {
    setSessionActive(false)
    stopLoop()
  }

  async function handleEnd() {
    setSessionActive(false)
    stopLoop()
    stopCamera()
    setElapsed(0)
    
    // Call API to end session and get result
    try {
      const response = await fetch("/api/session/end", {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.result) {
          setSessionResult(data.result)
        }
      }
    } catch (error) {
      console.error("Error ending session:", error)
    }
    
    router.push("/summary")
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop()
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardContent className="relative flex aspect-video items-center justify-center bg-foreground/5 p-0">
          <div className={`relative h-full w-full ${mirrorCamera ? "scale-x-[-1]" : ""}`}>
            {/* Real video */}
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Skeleton overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full z-10"
              style={{ pointerEvents: "none" }}
            />

            {/* If video not active yet, show hint overlay */}
            {!sessionActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/30 backdrop-blur-[1px]">
                <Camera className="h-12 w-12 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click Start to enable camera &amp; pose tracking
                </p>
              </div>
            )}
          </div>

          {/* Timer badge */}
          {sessionActive && (
            <Badge className="absolute right-3 top-3 bg-foreground/80 font-mono text-background">
              {formatTime(elapsed)}
            </Badge>
          )}

          {/* Debug HUD overlay */}
          {sessionActive && debugInfo && (
            <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1.5 font-mono text-xs text-white backdrop-blur">
              <div className="flex flex-col gap-0.5">
                <div className={debugInfo.landmarksPresent ? "text-green-400" : "text-red-400"}>
                  Landmarks: {debugInfo.landmarksPresent ? "✅" : "❌"}
                </div>
                <div>Conf: {(debugInfo.poseConfidence * 100).toFixed(0)}%</div>
                <div>{poseConfigRef.current.measurementType === 'elevation' ? 'Heel Elevation' : 'Angle'}: {poseConfigRef.current.measurementType === 'elevation' ? (debugInfo.bodyAngle != null ? debugInfo.bodyAngle.toFixed(4) : 'N/A') : `${debugInfo.bodyAngle}°`}</div>
                <div>State: {debugInfo.repState}</div>
                {debugInfo.elevationState && (
                  <>
                    <div>Elev State: {debugInfo.elevationState}</div>
                    <div>HeelY: {debugInfo.heelY?.toFixed(4) ?? 'N/A'}</div>
                    <div>Baseline: {debugInfo.baselineHeelY?.toFixed(4) ?? 'N/A'}</div>
                    <div>Elev: {debugInfo.elevation?.toFixed(4) ?? 'N/A'}</div>
                    <div>Vel: {debugInfo.velocity?.toFixed(6) ?? 'N/A'}</div>
                    <div>Stable: {debugInfo.stableFrames ?? 0}</div>
                  </>
                )}
                <div>Reps: {debugInfo.repCount}</div>
              </div>
            </div>
          )}

          {/* Onboarding tooltip */}
          {showTip && !sessionActive && (
            <TooltipProvider>
              <Tooltip defaultOpen>
                <TooltipTrigger asChild>
                  <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-primary/30 bg-card/90 px-4 py-3 text-sm text-foreground shadow-lg backdrop-blur">
                    Place your camera 6-8 feet away for best results.
                    <button
                      className="ml-2 text-xs text-primary underline"
                      onClick={() => setShowTip(false)}
                    >
                      Got it
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">Camera placement tip</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!sessionActive ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    onClick={handleStart} 
                    className="gap-2"
                    disabled={!demoWatched[metrics.currentExercise]}
                  >
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                </span>
              </TooltipTrigger>
              {!demoWatched[metrics.currentExercise] && (
                <TooltipContent>
                  <p>Please watch the demo video for {metrics.currentExercise} first</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button onClick={handlePause} variant="outline" className="gap-2">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        )}

        <Button
          onClick={handleEnd}
          variant="destructive"
          className="gap-2"
          disabled={elapsed === 0 && !sessionActive}
        >
          <Square className="h-4 w-4" />
          End Session
        </Button>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="skeleton"
              checked={showSkeleton}
              onCheckedChange={setShowSkeleton}
            />
            <Label htmlFor="skeleton" className="flex items-center gap-1 text-xs">
              <Bone className="h-3 w-3" />
              Skeleton
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="mirror"
              checked={mirrorCamera}
              onCheckedChange={setMirrorCamera}
            />
            <Label htmlFor="mirror" className="flex items-center gap-1 text-xs">
              <FlipHorizontal2 className="h-3 w-3" />
              Mirror
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}