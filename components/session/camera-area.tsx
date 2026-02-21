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

const RIGHT_HIP = 24
const RIGHT_KNEE = 26
const RIGHT_ANKLE = 28
const LEFT_HIP = 23
const LEFT_KNEE = 25
const LEFT_ANKLE = 27

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

export function CameraArea() {
  const { sessionActive, setSessionActive, metrics, setMetrics } = useAppState()

  const [showSkeleton, setShowSkeleton] = useState(true)
  const [mirrorCamera, setMirrorCamera] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showTip, setShowTip] = useState(true)
  const [debugInfo, setDebugInfo] = useState<{
    landmarksPresent: boolean
    poseConfidence: number
    kneeAngle: number
    repState: string
    repCount: number
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

  // Rep counter + rep scoring
  const repCounterRef = useRef(createRepCounter())
  const repMinAngleRef = useRef<number>(999)
  const lastDownTsRef = useRef<number | null>(null)
  const currentRepCountRef = useRef<number>(0)

  // Very small smoothing buffer for knee angle
  const angleBufRef = useRef<number[]>([])

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

    // quick leg lines (hip->knee->ankle)
    const legPairs = [
      [LEFT_HIP, LEFT_KNEE],
      [LEFT_KNEE, LEFT_ANKLE],
      [RIGHT_HIP, RIGHT_KNEE],
      [RIGHT_KNEE, RIGHT_ANKLE],
    ] as const

    for (const [a, b] of legPairs) {
      if ((pts[a]?.v ?? 0) < 0.5 || (pts[b]?.v ?? 0) < 0.5) continue
      ctx.beginPath()
      ctx.moveTo(pts[a].x, pts[a].y)
      ctx.lineTo(pts[b].x, pts[b].y)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }

  function computeFeedback(kneeAngle: number | null, conf: number | null): { status: "Good form" | "Needs work" | "Watch form"; checks: { label: string; ok: boolean }[] } {
    if (kneeAngle == null || conf == null || conf < 0.5) {
      return {
        status: "Watch form",
        checks: [
          { label: "Depth", ok: false },
          { label: "Control", ok: false },
          { label: "Knee alignment", ok: false },
        ],
      }
    }
    if (kneeAngle > 125) {
      return {
        status: "Needs work",
        checks: [
          { label: "Depth", ok: false },
          { label: "Control", ok: true },
          { label: "Knee alignment", ok: true },
        ],
      }
    }
    return {
      status: "Good form",
      checks: [
        { label: "Depth", ok: true },
        { label: "Control", ok: true },
        { label: "Knee alignment", ok: true },
      ],
    }
  }

  function scoreRep(minKneeAngle: number, repDurationMs: number | null) {
    // Simple + demo-friendly scoring
    let score = 100

    // depth
    if (minKneeAngle > 130) score -= 40
    else if (minKneeAngle > 115) score -= 20

    // speed (optional)
    if (repDurationMs != null && repDurationMs < 900) score -= 20

    return Math.max(0, Math.min(100, score))
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
      if (!landmarks) {
        console.log("No landmarks this frame")
        // Update debug info separately (not inside setMetrics to avoid React error)
        setDebugInfo({
          landmarksPresent: false,
          poseConfidence: 0,
          kneeAngle: 90,
          repState: "rest",
          repCount: currentRepCountRef.current,
        })
        setMetrics((prev) => ({
          ...prev,
          kneeAngle: 90,
          repState: "rest",
          poseConfidence: 0,
          feedback: {
            status: "Watch form",
            checks: [
              { label: "Depth", ok: false },
              { label: "Control", ok: false },
              { label: "Knee alignment", ok: false },
            ],
          },
        }))
        const ctx = canvas.getContext("2d")
        ctx?.clearRect(0, 0, w, h)
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      console.log("Landmarks ✅")

      // pose confidence proxy: average visibility of key leg points
      const v = (i: number) => clamp01(landmarks[i]?.visibility ?? 0)
      const rightConf = (v(RIGHT_HIP) + v(RIGHT_KNEE) + v(RIGHT_ANKLE)) / 3
      const leftConf = (v(LEFT_HIP) + v(LEFT_KNEE) + v(LEFT_ANKLE)) / 3
      const useRight = rightConf >= leftConf

      const hip = useRight ? landmarks[RIGHT_HIP] : landmarks[LEFT_HIP]
      const knee = useRight ? landmarks[RIGHT_KNEE] : landmarks[LEFT_KNEE]
      const ankle = useRight ? landmarks[RIGHT_ANKLE] : landmarks[LEFT_ANKLE]
      const conf = useRight ? rightConf : leftConf

      const rawAngle = angleABC(hip, knee, ankle)
      let kneeAngle = rawAngle

      // Smooth angle (moving average last 6 frames)
      if (kneeAngle != null) {
        const buf = angleBufRef.current
        buf.push(kneeAngle)
        if (buf.length > 6) buf.shift()
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        kneeAngle = avg
      }

      // Track min angle during rep
      if (kneeAngle != null) {
        repMinAngleRef.current = Math.min(repMinAngleRef.current, kneeAngle)
      }

      // Rep counting
      const { repCount, state, repJustCounted } = repCounterRef.current.update(kneeAngle)

      // Convert RepState to SessionMetrics repState format
      const repState: "up" | "down" | "rest" = state === "UP" ? "up" : state === "DOWN" ? "down" : "rest"

      let lastScore: number | undefined = undefined

      if (state === "DOWN" && lastDownTsRef.current == null) {
        lastDownTsRef.current = Date.now()
      }

      if (repJustCounted) {
        const minAngle = repMinAngleRef.current === 999 ? (kneeAngle ?? 999) : repMinAngleRef.current
        const downTs = lastDownTsRef.current
        const repDuration = downTs ? Date.now() - downTs : null
        lastScore = scoreRep(minAngle, repDuration)

        // reset trackers for next rep
        repMinAngleRef.current = 999
        lastDownTsRef.current = null
      }

      const feedback = computeFeedback(kneeAngle, conf)

      // Draw skeleton overlay
      drawSkeleton(landmarks, w, h)

      // Update app state metrics (CoachingPanel can display these)
      // Use functional update to avoid stale state, and preserve lastScore if not updated
      const roundedKneeAngle = kneeAngle != null ? Math.round(kneeAngle) : 90
      const poseConf = conf ?? 0
      
      // Update ref for debug info
      currentRepCountRef.current = repCount
      
      setMetrics((prev) => ({
        ...prev,
        kneeAngle: roundedKneeAngle,
        repState,
        poseConfidence: poseConf,
        feedback,
        repCount,
        lastScore: lastScore !== undefined ? lastScore : prev.lastScore,
      }))

      // Update debug info separately (not inside setMetrics to avoid React error)
      setDebugInfo({
        landmarksPresent: true,
        poseConfidence: poseConf,
        kneeAngle: roundedKneeAngle,
        repState,
        repCount,
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }

  async function handleStart() {
    setSessionActive(true)
    setShowTip(false)

    // reset session metrics
    repCounterRef.current.reset()
    repMinAngleRef.current = 999
    lastDownTsRef.current = null
    angleBufRef.current = []
    currentRepCountRef.current = 0

    setMetrics((prev) => ({
      ...prev,
      repCount: 0,
      lastScore: 0,
      kneeAngle: 90,
      repState: "rest",
      poseConfidence: 0,
      feedback: {
        status: "Watch form",
        checks: [
          { label: "Depth", ok: false },
          { label: "Control", ok: false },
          { label: "Knee alignment", ok: false },
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

  function handleEnd() {
    setSessionActive(false)
    stopLoop()
    stopCamera()
    setElapsed(0)
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
                <div>Knee: {debugInfo.kneeAngle}°</div>
                <div>State: {debugInfo.repState}</div>
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
          <Button onClick={handleStart} className="gap-2">
            <Play className="h-4 w-4" />
            Start
          </Button>
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