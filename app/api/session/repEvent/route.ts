import { NextResponse } from "next/server";
import { ingestRepEvent } from "@/lib/services/sessionService";
import { RepEvent } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const repEvent = (await req.json()) as RepEvent;
    await ingestRepEvent(repEvent);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error ingesting repEvent:", error);
    return NextResponse.json({ error: "Failed to ingest repEvent" }, { status: 500 });
  }
}

