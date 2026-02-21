"use client"

import { useAppState } from "@/lib/store"
import type { InjuryArea, ExerciseType, Tempo, DayOfWeek, ExerciseConfig } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"

const INJURY_AREAS: InjuryArea[] = ["Knee", "Shoulder", "Back", "Ankle", "Hip"]
const EXERCISES: ExerciseType[] = ["Squat", "Lunge", "Shoulder Raise", "Hip Hinge", "Shoulder Press", "Calf Raise"]
const TEMPOS: Tempo[] = ["Slow", "Normal", "Fast"]
const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function PlanForm() {
  const { plan, setPlan } = useAppState()

  function updateField<K extends keyof typeof plan>(
    key: K,
    value: (typeof plan)[K]
  ) {
    setPlan({ ...plan, [key]: value })
  }

  function updateExercise(index: number, updates: Partial<ExerciseConfig>) {
    const exercises = [...plan.exercises]
    exercises[index] = { ...exercises[index], ...updates }
    setPlan({ ...plan, exercises })
  }

  function addExercise() {
    const unused = EXERCISES.find(
      (e) => !plan.exercises.some((ex) => ex.exercise === e)
    )
    if (!unused) return
    setPlan({
      ...plan,
      exercises: [
        ...plan.exercises,
        { exercise: unused, sets: 3, reps: 10, tempo: "Normal", notes: "" },
      ],
    })
  }

  function removeExercise(index: number) {
    setPlan({
      ...plan,
      exercises: plan.exercises.filter((_, i) => i !== index),
    })
  }

  function toggleDay(day: DayOfWeek) {
    const days = plan.preferredDays.includes(day)
      ? plan.preferredDays.filter((d) => d !== day)
      : [...plan.preferredDays, day]
    updateField("preferredDays", days)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Plan basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Basics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              value={plan.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="My PT Plan"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="injury-area">Injury Area</Label>
            <Select
              value={plan.injuryArea}
              onValueChange={(v) => updateField("injuryArea", v as InjuryArea)}
            >
              <SelectTrigger id="injury-area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INJURY_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exercises */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Exercises</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={addExercise}
            disabled={plan.exercises.length >= EXERCISES.length}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {plan.exercises.map((ex, i) => (
            <div
              key={`${ex.exercise}-${i}`}
              className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="flex items-center justify-between">
                <Select
                  value={ex.exercise}
                  onValueChange={(v) =>
                    updateExercise(i, { exercise: v as ExerciseType })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXERCISES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExercise(i)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${ex.exercise}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Sets</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={ex.sets}
                    onChange={(e) =>
                      updateExercise(i, { sets: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Reps</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={ex.reps}
                    onChange={(e) =>
                      updateExercise(i, { reps: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Tempo</Label>
                  <Select
                    value={ex.tempo}
                    onValueChange={(v) =>
                      updateExercise(i, { tempo: v as Tempo })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={ex.notes}
                  onChange={(e) => updateExercise(i, { notes: e.target.value })}
                  placeholder="Any special instructions..."
                  className="min-h-[60px] resize-none"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Days per week</Label>
              <span className="text-sm font-medium text-primary">
                {plan.daysPerWeek}
              </span>
            </div>
            <Slider
              value={[plan.daysPerWeek]}
              onValueChange={([v]) => updateField("daysPerWeek", v)}
              min={1}
              max={7}
              step={1}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Preferred Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <Badge
                  key={day}
                  variant={
                    plan.preferredDays.includes(day) ? "default" : "outline"
                  }
                  className="cursor-pointer select-none"
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reminder-time">Reminder Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={plan.reminderTime}
              onChange={(e) => updateField("reminderTime", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Safety */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Safety</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Pain Threshold</Label>
              <span className="text-sm font-medium text-primary">
                {plan.painThreshold}/10
              </span>
            </div>
            <Slider
              value={[plan.painThreshold]}
              onValueChange={([v]) => updateField("painThreshold", v)}
              min={1}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Session will pause if reported pain exceeds this level.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
