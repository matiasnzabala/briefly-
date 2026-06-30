import { NextResponse } from "next/server";
import { getFeedEvents } from "@/lib/feed";

export async function GET() {
  const result = await getFeedEvents();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ events: result.events, mode: result.mode });
}
