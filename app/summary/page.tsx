"use client"

import { useAppState } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import Link from "next/link"
import {
  CheckCircle2,
  RotateCcw,
  ClipboardList,
  Download,
  Copy,
  Trophy,
  Target,
  Star,
  Lightbulb,
} from "lucide-react"

export default function SummaryPage() {
  const { sessionResult } = useAppState()

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  function handleCopy() {
    const text = [
      `TherapEase.ai Session Summary`,
      `Total Reps: ${sessionResult.totalReps}`,
      `Avg Score: ${sessionResult.avgScore}/100`,
      `Best Score: ${sessionResult.bestScore}/100`,
      `Duration: ${formatDuration(sessionResult.duration)}`,
      ``,
      `Tip: ${sessionResult.mainTip}`,
      ``,
      `Exercises:`,
      ...sessionResult.exercises.map(
        (e) =>
          `- ${e.exercise}: ${e.reps} reps, avg ${e.avgScore}/100 ${e.issues.length > 0 ? `(${e.issues.join(", ")})` : ""}`
      ),
    ].join("\n")

    navigator.clipboard.writeText(text)
    toast.success("Summary copied to clipboard!")
  }

  const statCards = [
    {
      icon: Trophy,
      label: "Total Reps",
      value: sessionResult.totalReps.toString(),
      color: "text-primary",
    },
    {
      icon: Target,
      label: "Avg Score",
      value: `${sessionResult.avgScore}/100`,
      color: "text-chart-2",
    },
    {
      icon: Star,
      label: "Best Score",
      value: `${sessionResult.bestScore}/100`,
      color: "text-warning",
    },
    {
      icon: Lightbulb,
      label: "Main Tip",
      value: sessionResult.mainTip,
      color: "text-chart-3",
      isTip: true,
    },
  ]

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Session Complete
            </h1>
            <p className="text-sm text-muted-foreground">
              Duration: {formatDuration(sessionResult.duration)}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
                {stat.isTip ? (
                  <p className="text-sm leading-relaxed text-foreground">
                    {stat.value}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Breakdown table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Exercise Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise</TableHead>
                  <TableHead className="text-right">Reps</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionResult.exercises.map((ex) => (
                  <TableRow key={ex.exercise}>
                    <TableCell className="font-medium">{ex.exercise}</TableCell>
                    <TableCell className="text-right">{ex.reps}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={ex.avgScore >= 80 ? "default" : "secondary"}
                      >
                        {ex.avgScore}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ex.issues.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ex.issues.map((issue) => (
                            <Badge
                              key={issue}
                              variant="outline"
                              className="text-xs"
                            >
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild className="gap-2">
            <Link href="/session">
              <RotateCcw className="h-4 w-4" />
              Repeat Session
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/plan">
              <ClipboardList className="h-4 w-4" />
              Back to Plan
            </Link>
          </Button>

          <div className="flex gap-3 sm:ml-auto">
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() =>
                toast.info("Download report coming soon!", {
                  description:
                    "PDF export will be available in a future update.",
                })
              }
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
            <Button variant="secondary" className="gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy Summary
            </Button>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}
