import { NextResponse } from "next/server";
import { endSession } from "@/lib/services/sessionService";

export async function POST() {
  const result = await endSession();
  return NextResponse.json({ result });
}