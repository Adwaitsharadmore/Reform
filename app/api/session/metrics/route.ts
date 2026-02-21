import { NextResponse } from "next/server";
import { ingestMetrics } from "@/lib/services/sessionService";
import { SessionMetrics } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const metrics = (await req.json()) as SessionMetrics;
    await ingestMetrics(metrics);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error ingesting metrics:", error);
    return NextResponse.json({ error: "Failed to ingest metrics" }, { status: 500 });
  }
}

