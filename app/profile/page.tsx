"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Mail, 
  User, 
  Calendar, 
  Ruler, 
  Weight, 
  Activity, 
  AlertCircle,
  TrendingUp,
  Target,
  Clock,
  Bell,
  Volume2
} from "lucide-react"

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatHeight = (cm: number) => {
    const feet = Math.floor(cm / 30.48)
    const inches = Math.round((cm % 30.48) / 2.54)
    return `${feet}'${inches}" (${cm} cm)`
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          My Profile
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and manage your account information and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Details
              </CardTitle>
              <CardDescription>
                Your personal contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Account Created
                  </p>
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Last Active
                  </p>
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatDate(user.lastActiveAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Body Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Body Details
              </CardTitle>
              <CardDescription>
                Your physical characteristics and measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Age
                  </p>
                  <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {user.age} years
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Gender
                  </p>
                  <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {user.gender}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Height
                  </p>
                  <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-primary" />
                    {formatHeight(user.height)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Weight
                  </p>
                  <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Weight className="h-5 w-5 text-primary" />
                    {user.weight} kg ({Math.round(user.weight * 2.20462)} lbs)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Injury Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Injury Information
              </CardTitle>
              <CardDescription>
                Details about your injury and recovery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Primary Injury Area
                </p>
                <Badge variant="secondary" className="text-sm">
                  {user.primaryInjuryArea}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Description
                </p>
                <p className="text-sm text-foreground">{user.injuryDescription}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Injury Date
                  </p>
                  <p className="text-sm text-foreground">{formatDate(user.injuryDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Current Pain Level
                  </p>
                  <p className="text-sm text-foreground">{user.currentPainLevel}/10</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Pain Threshold
                  </p>
                  <p className="text-sm text-foreground">{user.painThreshold}/10</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Previous PT Experience
                  </p>
                  <p className="text-sm text-foreground">
                    {user.previousPTExperience ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Total Sessions
                </p>
                <p className="text-2xl font-bold text-foreground">{user.totalSessions}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Current Streak
                </p>
                <p className="text-2xl font-bold text-foreground">{user.currentStreak} days</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Longest Streak
                </p>
                <p className="text-2xl font-bold text-foreground">{user.longestStreak} days</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Total Reps
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {user.totalRepsAllTime.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Compliance Rate
                </p>
                <p className="text-2xl font-bold text-foreground">{user.complianceRate}%</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Improvement Trend
                </p>
                <Badge 
                  variant={user.improvementTrend === "improving" ? "default" : "secondary"}
                  className="text-sm capitalize"
                >
                  {user.improvementTrend}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Preferred Workout Time
                </p>
                <p className="text-sm text-foreground">{user.preferredWorkoutTime}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Settings
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4" />
                  <span className="text-foreground">Notifications</span>
                  <Badge variant={user.notificationsEnabled ? "default" : "secondary"} className="ml-auto">
                    {user.notificationsEnabled ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-foreground">Voice Coach</span>
                  <Badge variant={user.voiceCoachEnabled ? "default" : "secondary"} className="ml-auto">
                    {user.voiceCoachEnabled ? "On" : "Off"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Favorite Exercise
                </p>
                <Badge variant="secondary" className="text-sm">
                  {user.favoriteExercise}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Most Challenging
                </p>
                <Badge variant="secondary" className="text-sm">
                  {user.mostChallengingExercise}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">{user.plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.plan.daysPerWeek} days per week
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Exercises
                </p>
                <div className="space-y-1">
                  {user.plan.exercises.map((exercise, idx) => (
                    <div key={idx} className="text-sm text-foreground">
                      {exercise.exercise} - {exercise.sets} sets × {exercise.reps} reps
                    </div>
                  ))}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/plan">Edit Plan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

