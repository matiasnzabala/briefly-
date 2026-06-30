"use client";

import { useEffect, useState } from "react";
import type { WorldCupMatch } from "@/app/api/mundial/route";

const TEAM_NAMES_ES: Record<string, string> = {
  Argentina: "Argentina",
  Brazil: "Brasil",
  Uruguay: "Uruguay",
  Colombia: "Colombia",
  Ecuador: "Ecuador",
  Paraguay: "Paraguay",
  Venezuela: "Venezuela",
  Bolivia: "Bolivia",
  Chile: "Chile",
  Peru: "Perú",
  Mexico: "México",
  "United States": "Estados Unidos",
  Canada: "Canadá",
  "Costa Rica": "Costa Rica",
  Panama: "Panamá",
  Honduras: "Honduras",
  Jamaica: "Jamaica",
  Haiti: "Haití",
  "Netherlands": "Países Bajos",
  Spain: "España",
  France: "Francia",
  Germany: "Alemania",
  Italy: "Italia",
  Portugal: "Portugal",
  England: "Inglaterra",
  Belgium: "Bélgica",
  Croatia: "Croacia",
  Switzerland: "Suiza",
  Austria: "Austria",
  Poland: "Polonia",
  Serbia: "Serbia",
  Denmark: "Dinamarca",
  Sweden: "Suecia",
  Norway: "Noruega",
  Scotland: "Escocia",
  Wales: "Gales",
  Ukraine: "Ucrania",
  Morocco: "Marruecos",
  Senegal: "Senegal",
  Tunisia: "Túnez",
  Algeria: "Argelia",
  Egypt: "Egipto",
  Nigeria: "Nigeria",
  Ghana: "Ghana",
  Cameroon: "Camerún",
  "Ivory Coast": "Costa de Marfil",
  "South Africa": "Sudáfrica",
  Japan: "Japón",
  "South Korea": "Corea del Sur",
  "Saudi Arabia": "Arabia Saudita",
  Iran: "Irán",
  Qatar: "Catar",
  Australia: "Australia",
  "New Zealand": "Nueva Zelanda",
  Jordan: "Jordania",
  Uzbekistan: "Uzbekistán",
};

function teamName(name: string): string {
  return TEAM_NAMES_ES[name] ?? name;
}

const TEAM_ISO: Record<string, string> = {
  Argentina: "AR",
  Brazil: "BR",
  Uruguay: "UY",
  Colombia: "CO",
  Ecuador: "EC",
  Paraguay: "PY",
  Venezuela: "VE",
  Bolivia: "BO",
  Chile: "CL",
  Peru: "PE",
  Mexico: "MX",
  "United States": "US",
  Canada: "CA",
  "Costa Rica": "CR",
  Panama: "PA",
  Honduras: "HN",
  Jamaica: "JM",
  Haiti: "HT",
  Netherlands: "NL",
  Spain: "ES",
  France: "FR",
  Germany: "DE",
  Italy: "IT",
  Portugal: "PT",
  England: "GB",
  Belgium: "BE",
  Croatia: "HR",
  Switzerland: "CH",
  Austria: "AT",
  Poland: "PL",
  Serbia: "RS",
  Denmark: "DK",
  Sweden: "SE",
  Norway: "NO",
  Scotland: "GB",
  Wales: "GB",
  Ukraine: "UA",
  Morocco: "MA",
  Senegal: "SN",
  Tunisia: "TN",
  Algeria: "DZ",
  Egypt: "EG",
  Nigeria: "NG",
  Ghana: "GH",
  Cameroon: "CM",
  "Ivory Coast": "CI",
  "South Africa": "ZA",
  Japan: "JP",
  "South Korea": "KR",
  "Saudi Arabia": "SA",
  Iran: "IR",
  Qatar: "QA",
  Australia: "AU",
  "New Zealand": "NZ",
  Jordan: "JO",
  Uzbekistan: "UZ",
};

function FlagIcon({ team }: { team: string }) {
  const iso = TEAM_ISO[team];
  if (!iso) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/24x18/${iso.toLowerCase()}.png`}
      alt=""
      width={20}
      height={15}
      className="inline-block rounded-[2px] align-middle"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

const AR_TZ = "America/Argentina/Buenos_Aires";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AR_TZ,
  });
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: AR_TZ,
  });
}

function arDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  return arDateParts(date) === arDateParts(new Date());
}

function MatchRow({ match }: { match: WorldCupMatch }) {
  const isLive = !match.finished && match.homeScore !== null && match.awayScore !== null;
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: isLive ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {match.stage && (
        <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.25)" }}>
          {match.stage}
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-neutral-200 flex items-center gap-1.5 flex-wrap">
          <FlagIcon team={match.home} /> {teamName(match.home)} vs.{" "}
          <FlagIcon team={match.away} /> {teamName(match.away)}
        </span>
        {match.homeScore !== null && match.awayScore !== null && (
          <span className="text-sm font-medium text-neutral-100 shrink-0">
            {match.homeScore} - {match.awayScore}
            {match.penaltyHomeScore !== null && match.penaltyAwayScore !== null && (
              <span className="font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>
                {" "}(pen. {match.penaltyHomeScore}-{match.penaltyAwayScore})
              </span>
            )}
          </span>
        )}
      </div>
      <span className="text-xs" style={{ color: isLive ? "#a78bfa" : "rgba(255,255,255,0.3)" }}>
        {match.finished
          ? `Finalizado — ${formatDay(match.time)}`
          : isLive
            ? "● En vivo"
            : `${formatDay(match.time)}, ${formatTime(match.time)} hs`}
      </span>
    </div>
  );
}

export default function WorldCupPanel() {
  const [matches, setMatches] = useState<WorldCupMatch[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mundial")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.matches) setMatches(json.matches);
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const todayMatches = matches?.filter((m) => isToday(m.time)) ?? [];
  const recentMatches = matches
    ?.filter((m) => !isToday(m.time) && m.finished)
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  return (
    <aside className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          Mundial 2026 — Hoy
        </h2>

        {error && (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            No se pudo cargar la info del Mundial.
          </p>
        )}

        {!error && matches === null && (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Cargando partidos…</p>
        )}

        {matches !== null && todayMatches.length === 0 && !error && (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            No hay partidos programados para hoy.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {todayMatches.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      </div>

      {recentMatches && recentMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
            Resultados recientes
          </h2>
          <div className="flex flex-col gap-2">
            {recentMatches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
