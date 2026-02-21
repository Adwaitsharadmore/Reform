import { NextResponse } from "next/server";
import { savePlan, loadPlan } from "@/lib/services/planService";
import { Plan } from "@/lib/types";

export async function GET() {
  const plan = await loadPlan();
  return NextResponse.json({ plan });
}

export async function POST(req: Request) {
  const plan = (await req.json()) as Plan;
  await savePlan(plan);
  return NextResponse.json({ ok: true });
}