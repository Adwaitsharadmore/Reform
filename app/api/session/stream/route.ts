import { ingestMetrics } from "@/lib/services/sessionService";
import { SessionMetrics } from "@/lib/types";

function rand(min:number, max:number) {
  return Math.random() * (max - min) + min;
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let repCount = 0;
      let repState: SessionMetrics["repState"] = "up";
      let lastRepScore: number | null = null;

      const interval = setInterval(async () => {
        // Mock behavior: slowly vary body angle
        const bodyAngle = repState === "up" ? rand(160, 175) : rand(80, 105);

        // Occasionally simulate a rep by toggling state
        if (Math.random() < 0.12) {
          repState = repState === "up" ? "down" : "up";
          if (repState === "up") {
            repCount += 1;
            lastRepScore = Math.round(rand(60, 95));
          }
        }

        // Pick feedback based on score/angle (mock)
        let feedback: SessionMetrics["feedback"] = { status: "Good form", checks: [{ label: "Depth", ok: true }, { label: "Control", ok: true }, { label: "Alignment", ok: true }] };
        if (lastRepScore !== null && lastRepScore < 75) feedback = { status: "Needs work", checks: [{ label: "Depth", ok: false }] };
        if (Math.random() < 0.05) feedback = { status: "Watch form", checks: [{ label: "Control", ok: false }] };

        const m: SessionMetrics = {
          currentExercise: "Squat",
          currentSet: 1,
          totalSets: 3,
          targetReps: 10,
          bodyAngle: Math.round(bodyAngle),
          repState,
          poseConfidence: Math.round(rand(70, 98)) / 100,
          feedback,
          repCount,
          lastScore: lastRepScore ?? 0,
        };

        await ingestMetrics(m);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(m)}\n\n`)
        );
      }, 1000);

      controller.enqueue(encoder.encode("retry: 1000\n\n"));

      return () => clearInterval(interval);
    },
    cancel() {}
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}