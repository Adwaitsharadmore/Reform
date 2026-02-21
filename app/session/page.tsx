"use client"

import { CameraArea } from "@/components/session/camera-area"
import { CoachingPanel } from "@/components/session/coaching-panel"

export default function SessionPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Live Session
        </h1>
        <p className="mt-1 text-muted-foreground">
          Follow along with your exercises. Use the demo controls to simulate
          feedback.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <CameraArea />
        <CoachingPanel />
      </div>
    </div>
  )
}
