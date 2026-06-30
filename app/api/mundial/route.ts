import { NextResponse } from "next/server";

export interface WorldCupMatch {
  id: string;
  home: string;
  away: string;
  time: string; // ISO
  stage: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
}

const WORLD_CUP_LEAGUE_ID = "4429";
const DAYS_BACK = 2;

let cache: { data: WorldCupMatch[]; expiresAt: number; date: string } | null =
  null;
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutos

interface SportsDbEvent {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strTimestamp: string | null;
  strStage: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
}

function dateOffset(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function fetchDay(date: string): Promise<SportsDbEvent[]> {
  const res = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&l=${WORLD_CUP_LEAGUE_ID}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`thesportsdb respondió ${res.status}`);
  const json: { events: SportsDbEvent[] | null } = await res.json();
  return json.events ?? [];
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  if (cache && cache.expiresAt > Date.now() && cache.date === today) {
    return NextResponse.json({ matches: cache.data });
  }

  try {
    const days = Array.from({ length: DAYS_BACK + 1 }, (_, i) =>
      dateOffset(i)
    ).reverse();

    const results = await Promise.allSettled(days.map(fetchDay));
    const rawEvents = results
      .filter(
        (r): r is PromiseFulfilledResult<SportsDbEvent[]> =>
          r.status === "fulfilled"
      )
      .flatMap((r) => r.value);

    const matches: WorldCupMatch[] = rawEvents.map((e) => {
      const homeScore =
        e.intHomeScore !== null ? Number(e.intHomeScore) : null;
      const awayScore =
        e.intAwayScore !== null ? Number(e.intAwayScore) : null;

      return {
        id: e.idEvent,
        home: e.strHomeTeam,
        away: e.strAwayTeam,
        time: e.strTimestamp ?? today,
        stage: e.strStage ?? "",
        homeScore,
        awayScore,
        finished: homeScore !== null && awayScore !== null,
      };
    });

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
