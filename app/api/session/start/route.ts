import { NextResponse } from "next/server";
import { startSession } from "@/lib/services/sessionService";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const planId = body?.planId as string | undefined;
  const res = await startSession(planId);
  return NextResponse.json(res);
}