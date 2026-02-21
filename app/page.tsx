import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
} from "lucide-react"

const features = [
  {
    icon: Camera,
    title: "Real-time Form Cues",
    description:
      "Get instant feedback on your exercise form using computer vision analysis.",
  },
  {
    icon: Activity,
    title: "Rep Counting & Scoring",
    description:
      "Automatic rep detection with quality scores for every repetition.",
  },
  {
    icon: BarChart3,
    title: "Progress Summaries",
    description:
      "Track your improvement over time with detailed session reports.",
  },
]

const steps = [
  {
    number: "01",
    title: "Enter your PT prescription",
    description:
      "Input the exercises, sets, and reps your therapist recommended.",
  },
  {
    number: "02",
    title: "Follow guided sessions",
    description:
      "Perform exercises with real-time coaching and form feedback.",
  },
  {
    number: "03",
    title: "Track progress & improve form",
    description:
      "Review session summaries and work on areas that need attention.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)/0.08,transparent_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center lg:px-8 lg:py-32">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 px-3 py-1 text-sm"
          >
            <Activity className="h-3.5 w-3.5" />
            AI-Powered Physical Therapy
          </Badge>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Do Physical Therapy at Home
            <span className="text-primary">{" "}With Real-Time Form Feedback</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            TherapEase.ai helps you perform your PT exercises correctly using
            your camera. Get instant cues, count reps automatically, and track
            your progress over time.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/plan">
                <ClipboardList className="h-4 w-4" />
                Create Plan
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/session">
                Try Demo Session
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            Everything you need for guided PT
          </h2>
          <p className="mt-3 text-muted-foreground">
            Smart tools to make your physical therapy effective and consistent.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/60 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground">
              How It Works
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three simple steps to better physical therapy at home.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col gap-3">
                <span className="font-mono text-3xl font-bold text-primary/30">
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-balance text-2xl font-bold text-foreground sm:text-3xl">
              Ready to start your recovery journey?
            </h2>
            <p className="max-w-lg text-muted-foreground">
              Set up your personalized PT plan in under a minute and begin your
              first guided session today.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/plan">
                Get Started Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
