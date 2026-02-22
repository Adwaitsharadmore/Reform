"use client"

import { CameraArea } from "@/components/session/camera-area"
import { CoachingPanel } from "@/components/session/coaching-panel"
import { DemoVideo } from "@/components/session/demo-video"
import { useVoiceCoach } from "@/lib/voice/useVoiceCoach"
import { useAppState } from "@/lib/store"
import { useEffect } from "react"
import * as voiceCoach from "@/lib/voice/voiceCoach"

function VoiceCoachIntegration() {
  const { sessionActive, metrics, plan } = useAppState()
  
  // Initialize voice coach on mount
  useEffect(() => {
    voiceCoach.initVoiceCoach().catch((e) => {
      console.error("[SessionPage] Failed to initialize voice coach:", e)
    })
  }, [])

  // Use the voice coach hook to monitor metrics with exercise-specific coaching
  useVoiceCoach({ sessionActive, metrics, plan })

  // Handle session end - DISABLED (now handled in useVoiceCoach hook for all exercises)
  // useEffect(() => {
  //   // Disabled - session end is now handled in useVoiceCoach hook with exercise-specific logic
  // }, [])

  return null
}

export default function SessionPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <VoiceCoachIntegration />
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Live Session
        </h1>
        <p className="mt-1 text-muted-foreground">
          Follow along with your exercises. Use the demo controls to simulate
          feedback.
        </p>
      </div>

      <div className="mb-8">
        <DemoVideo />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <CameraArea />
        <CoachingPanel />
      </div>
    </div>
  )
}
