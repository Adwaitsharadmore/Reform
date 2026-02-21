import { Activity } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row lg:px-8">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Reform
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          For demonstration purposes only. Not medical advice. Consult your physical therapist.
        </p>
      </div>
    </footer>
  )
}
