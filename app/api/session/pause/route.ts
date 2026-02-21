import { NextResponse } from "next/server";
import { pauseSession } from "@/lib/services/sessionService";

export async function POST() {
  const res = await pauseSession();
  return NextResponse.json(res);
}