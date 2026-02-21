import { db } from "../store";
import { Plan } from "../types";

export async function savePlan(plan: Plan) {
  db.plan = plan;
  return;
}

export async function loadPlan(): Promise<Plan | null> {
  return db.plan;
}