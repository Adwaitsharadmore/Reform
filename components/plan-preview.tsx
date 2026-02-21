"use client"

import { useAppState } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Play, Save, Dumbbell, Calendar, Shield } from "lucide-react"
import { toast } from "sonner"

export function PlanPreview() {
  const { plan } = useAppState()

  function handleSave() {
    toast.success("Plan saved successfully!", {
      description: `"${plan.name}" has been saved.`,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4 text-primary" />
            Plan Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Plan Name</p>
            <p className="font-semibold text-foreground">{plan.name || "Untitled Plan"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Injury Area</p>
            <Badge variant="secondary">{plan.injuryArea}</Badge>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Exercises ({plan.exercises.length})
            </p>
            {plan.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exercises added yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {plan.exercises.map((ex, i) => (
                  <div
                    key={`${ex.exercise}-${i}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {ex.exercise}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ex.sets} x {ex.reps} &middot; {ex.tempo}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {plan.daysPerWeek}x / week &middot;{" "}
              {plan.preferredDays.length > 0
                ? plan.preferredDays.join(", ")
                : "No days selected"}
            </span>
          </div>

          {plan.reminderTime && (
            <div className="text-sm text-muted-foreground">
              Reminder at{" "}
              <span className="font-medium text-foreground">
                {plan.reminderTime}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Pain threshold: {plan.painThreshold}/10
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Plan
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/session">
            <Play className="h-4 w-4" />
            {"Start Today's Session"}
          </Link>
        </Button>
      </div>
    </div>
  )
}
