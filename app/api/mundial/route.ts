import { NextResponse } from "next/server";

export interface WorldCupMatch {
  id: string;
  home: string;
  away: string;
  time: string; // ISO
  stage: string;
  homeScore: number | null;
  awayScore: number | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  finished: boolean;
}

const WORLD_CUP_LEAGUE_ID = "4429";
const DAYS_BACK = 2;
const DAYS_FORWARD = 1;
const AR_TZ = "America/Argentina/Buenos_Aires";

function arDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

let cache: { data: WorldCupMatch[]; expiresAt: number; date: string } | null =
  null;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutos (más frecuente durante partidos)

interface SportsDbEvent {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strTimestamp: string | null;
  strStage: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intHomeScoreExtra: string | null;
  intAwayScoreExtra: string | null;
  strResult: string | null;
  strStatus: string | null;
}

// TheSportsDB usa strStatus para el estado en vivo: "NS" (no empezado),
// "1H"/"2H"/"HT"/"ET" (en curso) o "FT"/"AET"/"Penalties"/"Match Finished"
// (terminado). El marcador (intHomeScore/intAwayScore) ya viene cargado
// mientras el partido está en curso, así que no alcanza para saber si
// terminó.
const FINISHED_STATUSES = new Set([
  "FT",
  "AET",
  "PEN",
  "PENALTIES",
  "MATCH FINISHED",
  "FINISHED",
]);

function isFinished(status: string | null, kickoffIso: string | null): boolean {
  if (status && FINISHED_STATUSES.has(status.trim().toUpperCase())) return true;
  // fallback: si arrancó hace más de 2h30 con marcador, asumimos terminado
  if (kickoffIso) {
    const elapsed = Date.now() - new Date(`${kickoffIso}Z`).getTime();
    if (elapsed > 1000 * 60 * 150) return true;
  }
  return false;
}

function dateOffset(daysFromToday: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
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
  const todayUTC = new Date().toISOString().slice(0, 10);
  const todayAR = arDateString(new Date());

  if (cache && cache.expiresAt > Date.now() && cache.date === todayAR) {
    return NextResponse.json({ matches: cache.data });
  }

  try {
    // Fetchamos también el día UTC siguiente porque los partidos nocturnos
    // en Argentina (UTC-3) suelen caer en el día calendario siguiente en UTC.
    const days = Array.from(
      { length: DAYS_BACK + DAYS_FORWARD + 1 },
      (_, i) => dateOffset(DAYS_FORWARD - i)
    );

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

      // intHomeScoreExtra/intAwayScoreExtra solo representan penales cuando
      // strResult lo confirma; en otros casos pueden referirse a otra cosa
      // (tiempo extra), así que no los mostramos como penales sin esa señal.
      const decidedOnPenalties = (e.strResult ?? "")
        .toLowerCase()
        .includes("penalties");
      const penaltyHomeScore =
        decidedOnPenalties && e.intHomeScoreExtra !== null
          ? Number(e.intHomeScoreExtra)
          : null;
      const penaltyAwayScore =
        decidedOnPenalties && e.intAwayScoreExtra !== null
          ? Number(e.intAwayScoreExtra)
          : null;

      // strTimestamp viene en UTC pero sin sufijo "Z", así que hay que
      // agregarlo explícitamente o el navegador lo interpreta como hora local.
      const time = e.strTimestamp ? `${e.strTimestamp}Z` : `${todayUTC}T00:00:00Z`;

      return {
        id: e.idEvent,
        home: e.strHomeTeam,
        away: e.strAwayTeam,
        time,
        stage: e.strStage ?? "",
        homeScore,
        awayScore,
        penaltyHomeScore,
        penaltyAwayScore,
        finished: isFinished(e.strStatus, e.strTimestamp),
      };
    });

    cache = { data: matches, expiresAt: Date.now() + CACHE_TTL_MS, date: todayAR };

    return NextResponse.json({ matches });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
