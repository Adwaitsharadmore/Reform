"use client"

import { useAppState } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import Link from "next/link"
import { useMemo } from "react"
import {
  CheckCircle2,
  RotateCcw,
  ClipboardList,
  Download,
  Copy,
  Trophy,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  BarChart3,
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Cell, 
} from "recharts"
import { generateSessionInsights } from "@/lib/analytics/sessionInsights"

export default function SummaryPage() {
  const { sessionResult } = useAppState()
  
  // Generate insights from session result
  const insights = useMemo(() => generateSessionInsights(sessionResult), [sessionResult])

  function formatDuration(milliseconds: number) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}m ${s}s`
  }

  function handleCopy() {
    const text = [
      `Reform Session Summary`,
      `Total Reps: ${sessionResult.totalReps}`,
      `Avg Score: ${sessionResult.avgScore}/100`,
      `Best Score: ${sessionResult.bestScore}/100`,
      `Duration: ${formatDuration(sessionResult.duration)}`,
      ``,
      `Summary: ${insights.narrative}`,
      ``,
      `Tip: ${sessionResult.mainTip}`,
      ``,
      `Exercises:`,
      ...(sessionResult.exercises && sessionResult.exercises.length > 0
        ? sessionResult.exercises.map(
            (e) =>
              `- ${e.exercise}: ${e.reps} reps, avg ${e.avgScore}/100 ${e.issues.length > 0 ? `(${e.issues.join(", ")})` : ""}`
          )
        : ["No exercise data available"]),
      ``,
      `Next Session Focus:`,
      ...insights.nextSessionFocus.map(item => `- ${item}`),
    ].join("\n")

    navigator.clipboard.writeText(text)
    toast.success("Summary copied to clipboard!")
  }
  
  function handleExport() {
    const dataStr = JSON.stringify(sessionResult, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `session-${sessionResult.sessionId}-${new Date(sessionResult.endedAt).toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Session data exported!")
  }

  // Calculate additional metrics
  const totalIssues = sessionResult.exercises?.reduce((sum, ex) => sum + ex.issues.length, 0) || 0
  const scoreGrade = sessionResult.avgScore >= 90 ? "Excellent" 
    : sessionResult.avgScore >= 80 ? "Good" 
    : sessionResult.avgScore >= 70 ? "Fair" 
    : "Needs Improvement"

  // Prepare chart data
  const exerciseChartData = sessionResult.exercises?.map(ex => ({
    exercise: ex.exercise,
    avgScore: ex.avgScore,
    reps: ex.reps,
    bestScore: ex.bestScore,
  })) || []


  // Color palette for charts - using actual hex colors
  const colors = {
    excellent: "#10b981", // green-500
    good: "#3b82f6", // blue-500
    fair: "#f59e0b", // amber-500
    poor: "#ef4444", // red-500
    primary: "#8b5cf6", // violet-500
    secondary: "#06b6d4", // cyan-500
    warning: "#f59e0b", // amber-500
    success: "#10b981", // green-500
  }

  const chartConfig = {
    avgScore: {
      label: "Avg Score",
      color: colors.primary,
    },
    bestScore: {
      label: "Best Score",
      color: colors.secondary,
    },
    reps: {
      label: "Reps",
      color: colors.good,
    },
    excellent: {
      label: "Excellent (90+)",
      color: colors.excellent,
    },
    good: {
      label: "Good (80-89)",
      color: colors.good,
    },
    fair: {
      label: "Fair (70-79)",
      color: colors.fair,
    },
    needsWork: {
      label: "Needs Work (<70)",
      color: colors.poor,
    },
  }

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return colors.excellent
    if (score >= 80) return colors.good
    if (score >= 70) return colors.fair
    return colors.poor
  }
  

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Session Complete
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Completed in {formatDuration(sessionResult.duration)} • {new Date(sessionResult.endedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Hero Score + Narrative */}
        <Card className={`mb-6 border-2 ${
          sessionResult.avgScore >= 90 
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800"
            : sessionResult.avgScore >= 80
            ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 dark:from-blue-950/20 dark:to-cyan-950/20 dark:border-blue-800"
            : sessionResult.avgScore >= 70
            ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800"
            : "bg-gradient-to-br from-red-50 to-orange-50 border-red-200 dark:from-red-950/20 dark:to-orange-950/20 dark:border-red-800"
        }`}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                    sessionResult.avgScore >= 90 ? "bg-green-100 dark:bg-green-900/30"
                    : sessionResult.avgScore >= 80 ? "bg-blue-100 dark:bg-blue-900/30"
                    : sessionResult.avgScore >= 70 ? "bg-amber-100 dark:bg-amber-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                  }`}>
                    <Trophy className={`h-8 w-8 ${
                      sessionResult.avgScore >= 90 ? "text-green-600 dark:text-green-400"
                      : sessionResult.avgScore >= 80 ? "text-blue-600 dark:text-blue-400"
                      : sessionResult.avgScore >= 70 ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                    }`} />
                  </div>
                  <div>
                    <h2 className={`text-4xl font-bold ${
                      sessionResult.avgScore >= 90 ? "text-green-700 dark:text-green-300"
                      : sessionResult.avgScore >= 80 ? "text-blue-700 dark:text-blue-300"
                      : sessionResult.avgScore >= 70 ? "text-amber-700 dark:text-amber-300"
                      : "text-red-700 dark:text-red-300"
                    }`}>
                      {sessionResult.avgScore}/100
                    </h2>
                    <p className="text-sm text-muted-foreground">{scoreGrade}</p>
                  </div>
                </div>
                <p className="text-base leading-relaxed text-foreground max-w-2xl font-medium">
                  {insights.narrative}
                </p>
                {totalIssues > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span className="text-warning font-medium">
                      {totalIssues} form issue{totalIssues !== 1 ? "s" : ""} detected - review below
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="mb-6">
          {/* Exercise Performance Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Exercise Performance
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Average scores by exercise
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {exerciseChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={exerciseChartData}>
                    <XAxis
                      dataKey="exercise"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.split(" ")[0]}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      domain={[0, 100]}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
                      {exerciseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getScoreColor(entry.avgScore)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No exercise data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>



        {/* Key Mistakes & Next Session Focus */}
        {insights.nextSessionFocus.length > 0 && (
          <Card className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-5 w-5" />
                Key Areas to Improve
              </CardTitle>
              <CardDescription className="text-amber-600 dark:text-amber-400">
                Focus on these in your next session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insights.nextSessionFocus.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 dark:bg-amber-900/20">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 mt-0.5">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Quick Insights */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {/* Main Tip Card */}
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 dark:from-violet-950/20 dark:to-purple-950/20 dark:border-violet-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Quick Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-foreground font-medium">
                {sessionResult.mainTip}
              </p>
            </CardContent>
          </Card>

          {/* Best Performance */}
          {sessionResult.bestScore >= 90 && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Peak Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{sessionResult.bestScore}</p>
                <p className="text-xs text-muted-foreground mt-1">Excellent work!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Breakdown table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exercise Breakdown</CardTitle>
            <CardDescription>
              Detailed performance metrics for each exercise
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionResult.exercises && sessionResult.exercises.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercise</TableHead>
                      <TableHead className="text-right">Reps</TableHead>
                      <TableHead className="text-right">Avg Score</TableHead>
                      <TableHead className="text-right">Best Score</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionResult.exercises.map((ex) => {
                      const exerciseInsight = insights.exerciseInsights.find(i => i.exercise === ex.exercise)
                      return (
                        <TableRow key={ex.exercise}>
                          <TableCell className="font-medium">{ex.exercise}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span>{ex.reps}</span>
                              <div className="h-2 w-16 rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{
                                    width: `${Math.min(100, (ex.reps / 20) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={`font-semibold ${
                                ex.avgScore >= 90
                                  ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                                  : ex.avgScore >= 80
                                  ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                                  : ex.avgScore >= 70
                                  ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                                  : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                              }`}
                            >
                              {ex.avgScore}/100
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {ex.bestScore}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ex.issues.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {ex.issues.map((issue) => (
                                  <Badge
                                    key={issue}
                                    variant="outline"
                                    className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 font-medium"
                                  >
                                    <AlertCircle className="h-3 w-3 mr-1 inline" />
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                No issues
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No exercise breakdown available for this session.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild className="gap-2" size="lg">
            <Link href="/session">
              <RotateCcw className="h-4 w-4" />
              Repeat Session
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2" size="lg">
            <Link href="/plan">
              <ClipboardList className="h-4 w-4" />
              Back to Plan
            </Link>
          </Button>
        </div>
      </div>
      <Toaster />
    </>
  )
}
