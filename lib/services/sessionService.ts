import { db } from "../db";
import { SessionMetrics, SessionResult, ExerciseType, RepEvent } from "../types";

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
  db.session.repEvents = [];
  db.session.exerciseData = {};
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

  // Generate main tip from last metrics or most common issue
  let mainTip = "Maintain consistent depth and control";
  if (db.session.lastMetrics?.feedback) {
    if (db.session.lastMetrics.feedback.status !== "Good form") {
      const failedChecks = db.session.lastMetrics.feedback.checks
        .filter(c => !c.ok)
        .map(c => c.label);
      if (failedChecks.length > 0) {
        mainTip = `Focus on: ${failedChecks[0]}. ${db.session.lastMetrics.feedback.status}`;
      } else {
        mainTip = `Focus on: ${db.session.lastMetrics.feedback.status}`;
      }
    }
  }

  // Generate exercises array from tracked exercise data
  const exercises = Object.entries(db.session.exerciseData)
    .filter(([_, data]) => data.repCount > 0) // Only include exercises with reps
    .map(([exercise, data]) => {
      const exerciseScores = data.scores.length > 0 ? data.scores : [];
      const avgExerciseScore = exerciseScores.length 
        ? Math.round(exerciseScores.reduce((a, b) => a + b, 0) / exerciseScores.length)
        : 0;
      const bestExerciseScore = exerciseScores.length 
        ? Math.max(...exerciseScores)
        : 0;
      
      // Format issues for display
      const issues = data.issues.map(issue => {
        // Count how many times this issue occurred (approximate based on failed checks)
        const issueCount = data.scores.length > 0 
          ? Math.max(1, Math.floor(data.scores.length * 0.3)) // Rough estimate
          : 1;
        return issueCount > 1 ? `${issue} on ${issueCount} reps` : issue;
      });

      return {
        exercise: exercise as ExerciseType,
        reps: data.repCount,
        avgScore: avgExerciseScore,
        bestScore: bestExerciseScore,
        issues: issues,
      };
    });

  const result: SessionResult = {
    sessionId: db.session.id ?? "unknown",
    planId: db.session.planId ?? undefined,
    startedAt: db.session.startedAt,
    endedAt,
    totalReps: db.session.repCount,
    avgScore,
    bestScore,
    mainTip,
    exercises: exercises.length > 0 ? exercises : undefined,
    duration: endedAt - db.session.startedAt,
    repEvents: db.session.repEvents.length > 0 ? db.session.repEvents : undefined,
  };

  db.session.result = result;
  return result;
}

/** Called by stream generator or later by real CV pipeline */
export async function ingestMetrics(m: SessionMetrics) {
  db.session.lastMetrics = m;
  db.session.repCount = m.repCount;
  db.session.lastRepScore = m.lastScore;

  const exercise = m.currentExercise;
  
  // Initialize exercise data if not exists
  if (!db.session.exerciseData[exercise]) {
    db.session.exerciseData[exercise] = {
      scores: [],
      repCount: 0,
      issues: [],
      lastRepCount: 0,
      lastGlobalRepCount: m.repCount, // Track global rep count when exercise starts
    };
  }

  const exerciseData = db.session.exerciseData[exercise];
  
  // Check if exercise changed (rep count decreased - this shouldn't happen normally, but handle it)
  // If the global rep count is less than what we last saw, it means we switched exercises or session reset
  if (m.repCount < exerciseData.lastGlobalRepCount) {
    // Session reset or exercise changed - reset tracking
    exerciseData.lastGlobalRepCount = m.repCount;
  }
  
  // Track new reps for this exercise (difference from last global rep count we saw for this exercise)
  const newReps = m.repCount - exerciseData.lastGlobalRepCount;
  if (newReps > 0) {
    // New reps occurred - attribute them to this exercise
    exerciseData.repCount += newReps;
    exerciseData.lastGlobalRepCount = m.repCount;
  } else {
    // Update lastGlobalRepCount to current value to keep tracking accurate
    exerciseData.lastGlobalRepCount = m.repCount;
  }

  // Track scores for this exercise
  if (typeof m.lastScore === "number" && m.lastScore > 0) {
    const last = exerciseData.scores[exerciseData.scores.length - 1];
    // prevent duplicates if same score repeats rapidly
    if (last !== m.lastScore) {
      exerciseData.scores.push(m.lastScore);
    }
  }

  // Track issues from feedback checks
  if (m.feedback && m.feedback.checks) {
    const failedChecks = m.feedback.checks
      .filter(check => !check.ok)
      .map(check => check.label);
    
    // Add unique issues
    failedChecks.forEach(issue => {
      if (!exerciseData.issues.includes(issue)) {
        exerciseData.issues.push(issue);
      }
    });
  }

  // Also track overall scores
  if (typeof m.lastScore === "number" && m.lastScore > 0) {
    const last = db.session.scores[db.session.scores.length - 1];
    // prevent duplicates if same score repeats rapidly
    if (last !== m.lastScore) db.session.scores.push(m.lastScore);
  }
}

/** Called when a rep is completed to store detailed rep event data */
export async function ingestRepEvent(repEvent: RepEvent) {
  // Adjust repIndex to be exercise-specific
  const exercise = repEvent.exercise;
  if (!db.session.exerciseData[exercise]) {
    db.session.exerciseData[exercise] = {
      scores: [],
      repCount: 0,
      issues: [],
      lastRepCount: 0,
      lastGlobalRepCount: 0,
    };
  }
  
  const exerciseData = db.session.exerciseData[exercise];
  // Calculate exercise-specific rep index
  const exerciseRepIndex = exerciseData.repCount + 1;
  
  // Create repEvent with adjusted index
  const adjustedRepEvent: RepEvent = {
    ...repEvent,
    repIndex: exerciseRepIndex,
  };
  
  db.session.repEvents.push(adjustedRepEvent);
}