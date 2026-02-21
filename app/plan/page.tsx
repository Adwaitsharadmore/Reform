"use client"

import { PlanForm } from "@/components/plan-form"
import { PlanPreview } from "@/components/plan-preview"
import { Toaster } from "@/components/ui/sonner"

export default function PlanPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create Your Plan
          </h1>
          <p className="mt-1 text-muted-foreground">
            Set up your PT prescription with exercises, schedule, and safety
            preferences.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <PlanForm />
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PlanPreview />
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}
