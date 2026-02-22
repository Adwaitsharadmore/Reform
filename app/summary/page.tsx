"use client"

import { useAppState } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
  Target,
  Star,
  Lightbulb,
  TrendingUp,
  Activity,
  Award,
  AlertCircle,
  BarChart3,
  PieChart,
  Gauge,
  TrendingDown,
  Zap,
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Cell, 
  PieChart as RechartsPieChart, 
  Pie, 
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
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
  const exercisesWithIssues = sessionResult.exercises?.filter(ex => ex.issues.length > 0).length || 0
  const avgRepsPerExercise = sessionResult.exercises && sessionResult.exercises.length > 0
    ? Math.round(sessionResult.totalReps / sessionResult.exercises.length)
    : 0
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

  const scoreDistribution = [
    { name: "Excellent (90+)", value: sessionResult.exercises?.filter(ex => ex.avgScore >= 90).length || 0 },
    { name: "Good (80-89)", value: sessionResult.exercises?.filter(ex => ex.avgScore >= 80 && ex.avgScore < 90).length || 0 },
    { name: "Fair (70-79)", value: sessionResult.exercises?.filter(ex => ex.avgScore >= 70 && ex.avgScore < 80).length || 0 },
    { name: "Needs Work (<70)", value: sessionResult.exercises?.filter(ex => ex.avgScore < 70).length || 0 },
  ].filter(item => item.value > 0)

  const chartConfig = {
    avgScore: {
      label: "Avg Score",
      color: "hsl(var(--chart-1))",
    },
    bestScore: {
      label: "Best Score",
      color: "hsl(var(--chart-2))",
    },
    reps: {
      label: "Reps",
      color: "hsl(var(--chart-3))",
    },
    excellent: {
      label: "Excellent (90+)",
      color: "hsl(var(--chart-1))",
    },
    good: {
      label: "Good (80-89)",
      color: "hsl(var(--chart-2))",
    },
    fair: {
      label: "Fair (70-79)",
      color: "hsl(var(--chart-3))",
    },
    needsWork: {
      label: "Needs Work (<70)",
      color: "hsl(var(--chart-4))",
    },
  }

  const pieChartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ]
  
  // Prepare rep score over time data (line chart)
  const repScoreData = useMemo(() => {
    if (!sessionResult.repEvents || sessionResult.repEvents.length === 0) return []
    return sessionResult.repEvents.map((event, index) => ({
      rep: index + 1,
      score: event.score,
      exercise: event.exercise,
      timestamp: event.ts,
    }))
  }, [sessionResult.repEvents])
  
  // Prepare form status counts (stacked bar chart)
  const formStatusData = useMemo(() => {
    if (!sessionResult.repEvents || sessionResult.repEvents.length === 0) return []
    const byExercise = new Map<string, { good: number; needsWork: number; watchForm: number }>()
    
    sessionResult.repEvents.forEach(event => {
      const existing = byExercise.get(event.exercise) || { good: 0, needsWork: 0, watchForm: 0 }
      // Approximate form status: no failed checks = good, 1-2 = needs work, 3+ = watch form
      if (event.checksFailed.length === 0) {
        existing.good++
      } else if (event.checksFailed.length <= 2) {
        existing.needsWork++
      } else {
        existing.watchForm++
      }
      byExercise.set(event.exercise, existing)
    })
    
    return Array.from(byExercise.entries()).map(([exercise, counts]) => ({
      exercise,
      "Good form": counts.good,
      "Needs work": counts.needsWork,
      "Watch form": counts.watchForm,
    }))
  }, [sessionResult.repEvents])
  
  // Calculate overall tempo compliance for radial gauge
  const overallTempoCompliance = useMemo(() => {
    if (!sessionResult.repEvents || sessionResult.repEvents.length === 0) return 0
    const goodTempo = sessionResult.repEvents.filter(e => e.tempoStatus === "good").length
    return Math.round((goodTempo / sessionResult.repEvents.length) * 100)
  }, [sessionResult.repEvents])

  const statCards = [
    {
      icon: Trophy,
      label: "Total Reps",
      value: sessionResult.totalReps.toString(),
      subtitle: `${avgRepsPerExercise} avg per exercise`,
      color: "text-primary",
      progress: Math.min(100, (sessionResult.totalReps / 50) * 100),
    },
    {
      icon: Target,
      label: "Avg Score",
      value: `${sessionResult.avgScore}/100`,
      subtitle: scoreGrade,
      color: "text-chart-2",
      progress: sessionResult.avgScore,
    },
    {
      icon: Star,
      label: "Best Score",
      value: `${sessionResult.bestScore}/100`,
      subtitle: "Peak performance",
      color: "text-warning",
      progress: sessionResult.bestScore,
    },
    {
      icon: Activity,
      label: "Exercises",
      value: `${sessionResult.exercises?.length || 0}`,
      subtitle: `${exercisesWithIssues} need attention`,
      color: "text-chart-3",
      progress: sessionResult.exercises ? (exercisesWithIssues / sessionResult.exercises.length) * 100 : 0,
    },
  ]

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
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-foreground">
                      {sessionResult.avgScore}/100
                    </h2>
                    <p className="text-sm text-muted-foreground">{scoreGrade}</p>
                  </div>
                </div>
                <p className="text-base leading-relaxed text-foreground max-w-2xl">
                  {insights.narrative}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="relative overflow-hidden">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                {stat.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={stat.progress} className="h-1.5" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
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
                    <Bar dataKey="avgScore" fill="var(--color-avgScore)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No exercise data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Score Distribution
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Performance breakdown
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {scoreDistribution.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <RechartsPieChart>
                    <Pie
                      data={scoreDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </RechartsPieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No score data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Analytics Charts */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          {/* Rep Scores Over Time (Line Chart) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Rep Scores Over Time
              </CardTitle>
              <CardDescription>Score progression throughout the session</CardDescription>
            </CardHeader>
            <CardContent>
              {repScoreData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={repScoreData}>
                    <XAxis
                      dataKey="rep"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      domain={[0, 100]}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No rep data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tempo Compliance (Radial Gauge) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Tempo Compliance
              </CardTitle>
              <CardDescription>% of reps with good tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-[300px]">
                <ChartContainer config={chartConfig} className="h-[200px] w-[200px]">
                  <RadialBarChart
                    innerRadius={60}
                    outerRadius={100}
                    data={[{ value: overallTempoCompliance, name: "Tempo" }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      fill="hsl(var(--chart-1))"
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                  </RadialBarChart>
                </ChartContainer>
                <div className="mt-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{overallTempoCompliance}%</p>
                  <p className="text-sm text-muted-foreground">Good tempo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Status by Exercise (Stacked Bar Chart) */}
        {formStatusData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Form Status by Exercise
              </CardTitle>
              <CardDescription>Distribution of form quality across exercises</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={formStatusData}>
                  <XAxis
                    dataKey="exercise"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="Good form" stackId="a" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="Needs work" stackId="a" fill="hsl(var(--chart-3))" />
                  <Bar dataKey="Watch form" stackId="a" fill="hsl(var(--chart-4))" />
                  <Legend />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Physio-Style Insight Panels */}
        {insights.exerciseInsights.length > 0 && (
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {insights.exerciseInsights.map((insight) => (
              <Card key={insight.exercise}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {insight.exercise} Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Consistency Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Consistency</span>
                      <div className="flex items-center gap-2">
                        <Progress value={insight.consistencyScore} className="w-24 h-2" />
                        <span className="text-sm font-medium">{insight.consistencyScore}%</span>
                      </div>
                    </div>
                    
                    {/* Tempo Compliance */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tempo Compliance</span>
                      <div className="flex items-center gap-2">
                        <Progress value={insight.tempoCompliance} className="w-24 h-2" />
                        <span className="text-sm font-medium">{insight.tempoCompliance}%</span>
                      </div>
                    </div>
                    
                    {/* Form Compliance */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Form Compliance</span>
                      <div className="flex items-center gap-2">
                        <Progress value={insight.formCompliance} className="w-24 h-2" />
                        <span className="text-sm font-medium">{insight.formCompliance}%</span>
                      </div>
                    </div>
                    
                    {/* Range of Motion */}
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Range of Motion</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div>
                          <span>Min: </span>
                          <span className="font-mono">{insight.rangeOfMotion.min.toFixed(1)}</span>
                        </div>
                        <div>
                          <span>Median: </span>
                          <span className="font-mono">{insight.rangeOfMotion.median.toFixed(1)}</span>
                        </div>
                        <div>
                          <span>Max: </span>
                          <span className="font-mono">{insight.rangeOfMotion.max.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Top Issues */}
                    {insight.topIssues.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2">Top Issues</p>
                        <div className="flex flex-wrap gap-1">
                          {insight.topIssues.map((issue) => (
                            <Badge key={issue} variant="outline" className="text-xs">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Left-Right Imbalance */}
                    {insight.leftRightImbalance && insight.leftRightImbalance.imbalancePercent > 15 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-warning" />
                          <span className="font-medium text-warning">
                            Left-Right Imbalance: {Math.round(insight.leftRightImbalance.imbalancePercent)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Left avg: {insight.leftRightImbalance.leftAvg.toFixed(1)}, 
                          Right avg: {insight.leftRightImbalance.rightAvg.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Next Session Focus */}
        {insights.nextSessionFocus.length > 0 && (
          <Card className="mb-6 bg-warning/5 border-warning/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-warning" />
                Next Session Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.nextSessionFocus.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-warning mt-1">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Insights and Breakdown */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          {/* Main Tip Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-warning" />
                Key Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground">
                  {sessionResult.mainTip}
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3">
                  <TrendingUp className="h-4 w-4 text-warning" />
                  <span className="text-xs font-medium text-foreground">
                    Focus on this for your next session
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Overall Performance: {scoreGrade}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your average score of {sessionResult.avgScore}/100 indicates {scoreGrade.toLowerCase()} form throughout the session.
                    </p>
                  </div>
                </div>
                {sessionResult.bestScore >= 90 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <Trophy className="h-4 w-4 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Peak Performance Achieved
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        You reached a score of {sessionResult.bestScore}/100 - excellent work!
                      </p>
                    </div>
                  </div>
                )}
                {totalIssues > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10">
                      <AlertCircle className="h-4 w-4 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Areas for Improvement
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {totalIssues} form issue{totalIssues !== 1 ? "s" : ""} detected across {exercisesWithIssues} exercise{exercisesWithIssues !== 1 ? "s" : ""}. Review the breakdown below.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                      <TableHead className="text-center">Metrics</TableHead>
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
                              variant={
                                ex.avgScore >= 90
                                  ? "default"
                                  : ex.avgScore >= 80
                                  ? "secondary"
                                  : "outline"
                              }
                              className={
                                ex.avgScore >= 90
                                  ? "bg-success/10 text-success hover:bg-success/20"
                                  : ex.avgScore >= 80
                                  ? ""
                                  : "bg-warning/10 text-warning hover:bg-warning/20"
                              }
                            >
                              {ex.avgScore}/100
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {ex.bestScore}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {exerciseInsight ? (
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    exerciseInsight.tempoCompliance >= 80
                                      ? "bg-success/10 text-success"
                                      : exerciseInsight.tempoCompliance >= 60
                                      ? "bg-warning/10 text-warning"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                  title="Tempo Compliance"
                                >
                                  ⏱ {exerciseInsight.tempoCompliance}%
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    exerciseInsight.formCompliance >= 80
                                      ? "bg-success/10 text-success"
                                      : exerciseInsight.formCompliance >= 60
                                      ? "bg-warning/10 text-warning"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                  title="Form Compliance"
                                >
                                  ✓ {exerciseInsight.formCompliance}%
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    exerciseInsight.consistencyScore >= 80
                                      ? "bg-success/10 text-success"
                                      : exerciseInsight.consistencyScore >= 60
                                      ? "bg-warning/10 text-warning"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                  title="Consistency"
                                >
                                  📊 {exerciseInsight.consistencyScore}%
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
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
