"use client"

import { useState, useEffect, useRef } from "react"
import { useAppState } from "@/lib/store"
import type { ExerciseType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Play, CheckCircle2 } from "lucide-react"

// Map exercises to YouTube video URLs
const EXERCISE_VIDEOS: Record<ExerciseType, string> = {
  "Squat": "eBVcvPA4J7Q",
  "Lunge": "CtyIVeJH6lI",
  "Shoulder Raise": "uf48kLnXI_M",
  "Hip Hinge": "2W_gXhut5S8",
  "Shoulder Press": "eBVcvPA4J7Q", // Fallback to first video
  "Calf Raise": "CtyIVeJH6lI", // Fallback to second video
}

const MIN_WATCH_TIME_SECONDS = 15

export function DemoVideo() {
  const { metrics, demoWatched, setDemoWatched } = useAppState()
  const currentExercise = metrics.currentExercise
  const videoId = EXERCISE_VIDEOS[currentExercise] || EXERCISE_VIDEOS["Squat"]
  
  const [mounted, setMounted] = useState(false)
  const [watchedTime, setWatchedTime] = useState(0)
  const [isMarkedWatched, setIsMarkedWatched] = useState(false)
  const [canMarkWatched, setCanMarkWatched] = useState(false)
  const [origin, setOrigin] = useState("") // Set client-side only to avoid hydration mismatch
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Defer isWatched to client-only to avoid SSR/client hydration mismatch
  // (demoWatched may be rehydrated from localStorage on the client but is empty on the server)
  const isWatched = mounted && (demoWatched[currentExercise] || false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const canSkip = process.env.NEXT_PUBLIC_DEMO_SKIP === "true"

  // Set origin client-side only to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  // Check if demo is already watched
  useEffect(() => {
    if (isWatched) {
      setIsMarkedWatched(true)
      setCanMarkWatched(true)
    }
  }, [isWatched])

  // Reset state when exercise changes
  useEffect(() => {
    setWatchedTime(0)
    setIsMarkedWatched(isWatched)
    setCanMarkWatched(isWatched)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [currentExercise, isWatched])

  // Simple timer-based tracking (since YouTube iframe API requires more setup)
  // Start tracking when component mounts (assume user will watch)
  useEffect(() => {
    // Don't start timer if already watched
    if (isWatched) return

    // Start a timer that tracks "watch time" - this is a simple MVP approach
    // In a production app, you'd use YouTube iframe API to track actual playback
    const startTime = Date.now()
    
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setWatchedTime((prev) => {
        const newTime = Math.max(prev, elapsed)
        if (newTime >= MIN_WATCH_TIME_SECONDS) {
          setCanMarkWatched(true)
        }
        return newTime
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [currentExercise, isWatched])

  const handleMarkWatched = () => {
    setIsMarkedWatched(true)
    setDemoWatched(currentExercise, true)
  }

  const handleSkip = () => {
    setDemoWatched(currentExercise, true)
    setIsMarkedWatched(true)
    setCanMarkWatched(true)
  }


  // If already watched, show minimal UI
  if (isWatched) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Demo video watched for {currentExercise}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo Video</CardTitle>
        <CardDescription>
          Watch the demo video for <strong>{currentExercise}</strong> before starting your session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* YouTube Embed */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <iframe
            ref={iframeRef}
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1${origin ? `&origin=${origin}` : ''}`}
            title={`${currentExercise} Demo Video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

    

        {/* Mark as watched section */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="mark-watched"
              checked={isMarkedWatched}
              onCheckedChange={(checked) => {
                if (checked && canMarkWatched) {
                  handleMarkWatched()
                }
              }}
              disabled={!canMarkWatched}
            />
            <Label
              htmlFor="mark-watched"
              className={`cursor-pointer ${!canMarkWatched ? "text-muted-foreground" : ""}`}
            >
              I watched the demo
              {!canMarkWatched && watchedTime < MIN_WATCH_TIME_SECONDS && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (watch at least {MIN_WATCH_TIME_SECONDS}s)
                </span>
              )}
            </Label>
          </div>
          
          {canSkip && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-xs text-muted-foreground"
            >
              Skip (dev)
            </Button>
          )}
        </div>

        {canMarkWatched && !isMarkedWatched && (
          <Button onClick={handleMarkWatched} className="w-full gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Mark as Watched
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

