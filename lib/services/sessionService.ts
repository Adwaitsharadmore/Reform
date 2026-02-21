import { db } from "../store";
import { SessionMetrics, SessionResult } from "../types";

function uid(prefix="sess") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function startSession(planId?: string) {
  db.session.id = uid();
  db.session.planId = planId ?? null;
  db.session.status = "running";
  db.session.startedAt = Date.now();
  db.session.repCount = 0;
  db.session.lastRepScore = null;
  db.session.scores = [];
  db.session.result = null;
  return { sessionId: db.session.id, startedAt: db.session.startedAt };
}

export async function pauseSession() {
  if (db.session.status === "running") db.session.status = "paused";
  return { status: db.session.status };
}

export async function endSession(): Promise<SessionResult> {
  db.session.status = "ended";
  const endedAt = Date.now();
  const scores = db.session.scores;
  const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;

  const mainTip =
    (db.session.lastMetrics?.feedback && db.session.lastMetrics.feedback.status !== "Good form")
      ? `Focus on: ${db.session.lastMetrics.feedback.status}`
      : "Maintain consistent depth and control";

  const result: SessionResult = {
    sessionId: db.session.id ?? "unknown",
    planId: db.session.planId ?? undefined,
    startedAt: db.session.startedAt,
    endedAt,
    totalReps: db.session.repCount,
    avgScore,
    bestScore,
    mainTip,
    duration: endedAt - db.session.startedAt,
  };

  db.session.result = result;
  return result;
}

/** Called by stream generator or later by real CV pipeline */
export async function ingestMetrics(m: SessionMetrics) {
  db.session.lastMetrics = m;
  db.session.repCount = m.repCount;
  db.session.lastRepScore = m.lastScore;

  if (typeof m.lastScore === "number") {
    const last = db.session.scores[db.session.scores.length - 1];
    // prevent duplicates if same score repeats rapidly
    if (last !== m.lastScore) db.session.scores.push(m.lastScore);
  }
}