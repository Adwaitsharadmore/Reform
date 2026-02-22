import type { RepEvent, ExerciseType, SessionResult } from "../types";

export interface ExerciseInsight {
  exercise: ExerciseType;
  consistencyScore: number; // 0-100, higher = more consistent
  tempoCompliance: number; // 0-100, % of reps with good tempo
  formCompliance: number; // 0-100, % of reps with "Good form"
  topIssues: string[]; // Top 2-3 recurring issues
  rangeOfMotion: {
    min: number;
    median: number;
    max: number;
  };
  leftRightImbalance?: {
    leftAvg: number;
    rightAvg: number;
    imbalancePercent: number; // >0 means imbalance detected
  };
}

export interface SessionInsights {
  narrative: string; // 1-2 sentence summary
  exerciseInsights: ExerciseInsight[];
  nextSessionFocus: string[]; // 2-3 actionable items
}

/**
 * Calculate standard deviation of scores
 */
function calculateStdDev(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

/**
 * Calculate consistency score (0-100) based on variance
 * Lower variance = higher consistency
 */
function calculateConsistencyScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return 100; // Perfect consistency with one rep
  
  const stdDev = calculateStdDev(scores);
  // Normalize: stdDev of 0 = 100, stdDev of 20+ = 0
  // Most exercises have scores 0-100, so stdDev of 20 is quite variable
  const normalized = Math.max(0, Math.min(100, 100 - (stdDev * 5)));
  return Math.round(normalized);
}

/**
 * Get top recurring issues from repEvents
 */
function getTopIssues(repEvents: RepEvent[], limit: number = 2): string[] {
  const issueCounts: Record<string, number> = {};
  
  repEvents.forEach(event => {
    event.checksFailed.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  });
  
  // Sort by count (descending) and return top N
  return Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([issue]) => issue);
}

/**
 * Calculate range of motion metrics (min/median/max of primaryMetric)
 */
function calculateRangeOfMotion(repEvents: RepEvent[]): { min: number; median: number; max: number } {
  if (repEvents.length === 0) {
    return { min: 0, median: 0, max: 0 };
  }
  
  const metrics = repEvents.map(e => e.primaryMetric).sort((a, b) => a - b);
  const min = metrics[0];
  const max = metrics[metrics.length - 1];
  const median = metrics.length % 2 === 0
    ? (metrics[metrics.length / 2 - 1] + metrics[metrics.length / 2]) / 2
    : metrics[Math.floor(metrics.length / 2)];
  
  return { min, median, max };
}

/**
 * Calculate left-right imbalance for exercises that track both sides
 */
function calculateLeftRightImbalance(repEvents: RepEvent[]): { leftAvg: number; rightAvg: number; imbalancePercent: number } | undefined {
  const leftEvents = repEvents.filter(e => e.side === "left");
  const rightEvents = repEvents.filter(e => e.side === "right");
  
  if (leftEvents.length === 0 || rightEvents.length === 0) {
    return undefined;
  }
  
  const leftAvg = leftEvents.reduce((sum, e) => sum + e.primaryMetric, 0) / leftEvents.length;
  const rightAvg = rightEvents.reduce((sum, e) => sum + e.primaryMetric, 0) / rightEvents.length;
  
  // Calculate imbalance as percentage difference
  const avg = (leftAvg + rightAvg) / 2;
  const diff = Math.abs(leftAvg - rightAvg);
  const imbalancePercent = avg > 0 ? (diff / avg) * 100 : 0;
  
  return { leftAvg, rightAvg, imbalancePercent };
}

/**
 * Generate insights for a single exercise
 */
function generateExerciseInsight(exercise: ExerciseType, repEvents: RepEvent[]): ExerciseInsight {
  const scores = repEvents.map(e => e.score);
  const consistencyScore = calculateConsistencyScore(scores);
  
  // Tempo compliance: % of reps with tempoStatus === "good"
  const tempoCompliant = repEvents.filter(e => e.tempoStatus === "good").length;
  const tempoCompliance = repEvents.length > 0
    ? Math.round((tempoCompliant / repEvents.length) * 100)
    : 0;
  
  // Form compliance: approximate based on checksFailed (if no checks failed, assume good form)
  // In practice, we'd need to track form status in repEvent, but for now we'll use checksFailed
  const formCompliant = repEvents.filter(e => e.checksFailed.length === 0).length;
  const formCompliance = repEvents.length > 0
    ? Math.round((formCompliant / repEvents.length) * 100)
    : 0;
  
  const topIssues = getTopIssues(repEvents, 2);
  const rangeOfMotion = calculateRangeOfMotion(repEvents);
  const leftRightImbalance = calculateLeftRightImbalance(repEvents);
  
  return {
    exercise,
    consistencyScore,
    tempoCompliance,
    formCompliance,
    topIssues,
    rangeOfMotion,
    leftRightImbalance,
  };
}

/**
 * Generate narrative summary (1-2 sentences)
 */
function generateNarrative(sessionResult: SessionResult, insights: ExerciseInsight[]): string {
  const avgScore = sessionResult.avgScore;
  const totalReps = sessionResult.totalReps;
  
  // Check for consistency issues
  const lowConsistency = insights.some(i => i.consistencyScore < 70);
  const tempoIssues = insights.some(i => i.tempoCompliance < 70);
  const formIssues = insights.some(i => i.formCompliance < 70);
  
  let narrative = "";
  
  if (avgScore >= 90) {
    narrative = "Excellent session! ";
  } else if (avgScore >= 80) {
    narrative = "Strong performance. ";
  } else if (avgScore >= 70) {
    narrative = "Good effort. ";
  } else {
    narrative = "Room for improvement. ";
  }
  
  if (lowConsistency) {
    narrative += "Your form varied across reps—focus on consistency.";
  } else if (tempoIssues) {
    narrative += "You maintained good form but rushed some movements—slow down and control the tempo.";
  } else if (formIssues) {
    narrative += "Focus on maintaining proper form throughout each rep.";
  } else {
    narrative += "Keep up the consistent form and control.";
  }
  
  return narrative;
}

/**
 * Generate next session focus items (2-3 actionable items)
 */
function generateNextSessionFocus(insights: ExerciseInsight[]): string[] {
  const focusItems: string[] = [];
  
  // Find worst exercise by form compliance
  const worstForm = insights.reduce((worst, current) => 
    current.formCompliance < (worst?.formCompliance ?? 100) ? current : worst
  , insights[0]);
  
  if (worstForm && worstForm.formCompliance < 80) {
    if (worstForm.topIssues.length > 0) {
      focusItems.push(`Focus on ${worstForm.topIssues[0]} during ${worstForm.exercise}`);
    } else {
      focusItems.push(`Improve form consistency during ${worstForm.exercise}`);
    }
  }
  
  // Check for tempo issues
  const worstTempo = insights.reduce((worst, current) =>
    current.tempoCompliance < (worst?.tempoCompliance ?? 100) ? current : worst
  , insights[0]);
  
  if (worstTempo && worstTempo.tempoCompliance < 80 && focusItems.length < 3) {
    focusItems.push(`Slow down and control the tempo during ${worstTempo.exercise}`);
  }
  
  // Check for left-right imbalance
  const imbalanced = insights.find(i => i.leftRightImbalance && i.leftRightImbalance.imbalancePercent > 15);
  if (imbalanced && focusItems.length < 3) {
    focusItems.push(`Address left-right imbalance in ${imbalanced.exercise} (${Math.round(imbalanced.leftRightImbalance!.imbalancePercent)}% difference)`);
  }
  
  // Fallback if no specific issues
  if (focusItems.length === 0) {
    focusItems.push("Maintain current form quality");
    focusItems.push("Focus on consistent tempo throughout");
  }
  
  return focusItems.slice(0, 3);
}

/**
 * Generate comprehensive session insights from session result
 */
export function generateSessionInsights(sessionResult: SessionResult): SessionInsights {
  const repEvents = sessionResult.repEvents || [];
  
  if (repEvents.length === 0) {
    return {
      narrative: "No rep data available for analysis.",
      exerciseInsights: [],
      nextSessionFocus: ["Complete more reps to generate insights"],
    };
  }
  
  // Group repEvents by exercise
  const eventsByExercise = new Map<ExerciseType, RepEvent[]>();
  repEvents.forEach(event => {
    const existing = eventsByExercise.get(event.exercise) || [];
    existing.push(event);
    eventsByExercise.set(event.exercise, existing);
  });
  
  // Generate insights for each exercise
  const exerciseInsights: ExerciseInsight[] = [];
  eventsByExercise.forEach((events, exercise) => {
    exerciseInsights.push(generateExerciseInsight(exercise, events));
  });
  
  const narrative = generateNarrative(sessionResult, exerciseInsights);
  const nextSessionFocus = generateNextSessionFocus(exerciseInsights);
  
  return {
    narrative,
    exerciseInsights,
    nextSessionFocus,
  };
}

