"use client";

import { useEffect, useState } from "react";
import type { WorldCupMatch } from "@/app/api/mundial/route";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

function MatchRow({ match }: { match: WorldCupMatch }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 flex flex-col gap-1">
      {match.stage && (
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">
          {match.stage}
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-neutral-200">
          {match.home} vs {match.away}
        </span>
        {match.finished && (
          <span className="text-sm font-medium text-neutral-100 shrink-0">
            {match.homeScore} - {match.awayScore}
          </span>
        )}
      </div>
      <span className="text-xs text-neutral-500">
        {match.finished
          ? `Finalizado — ${formatDay(match.time)}`
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
    <aside className="w-full lg:w-64 flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-300">
          Mundial 2026 — Hoy
        </h2>

        {error && (
          <p className="text-xs text-neutral-500">
            No se pudo cargar la info del Mundial.
          </p>
        )}

        {!error && matches === null && (
          <p className="text-xs text-neutral-500">Cargando partidos…</p>
        )}

        {matches !== null && todayMatches.length === 0 && !error && (
          <p className="text-xs text-neutral-500">
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
          <h2 className="text-sm font-medium text-neutral-300">
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
