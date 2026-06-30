import { NextResponse } from "next/server";

export interface WorldCupMatch {
  id: string;
  home: string;
  away: string;
  time: string; // ISO
  stage: string;
}

const WORLD_CUP_LEAGUE_ID = "4429";

let cache: { data: WorldCupMatch[]; expiresAt: number; date: string } | null =
  null;
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutos

interface SportsDbEvent {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strTimestamp: string | null;
  strStage: string | null;
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  if (cache && cache.expiresAt > Date.now() && cache.date === today) {
    return NextResponse.json({ matches: cache.data });
  }

  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&l=${WORLD_CUP_LEAGUE_ID}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`thesportsdb respondió ${res.status}`);

    const json: { events: SportsDbEvent[] | null } = await res.json();
    const matches: WorldCupMatch[] = (json.events ?? []).map((e) => ({
      id: e.idEvent,
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      time: e.strTimestamp ?? today,
      stage: e.strStage ?? "",
    }));

    cache = { data: matches, expiresAt: Date.now() + CACHE_TTL_MS, date: today };

    return NextResponse.json({ matches });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
