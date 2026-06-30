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

  return (
    <aside className="w-full lg:w-64 flex flex-col gap-3">
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

      {matches !== null && matches.length === 0 && !error && (
        <p className="text-xs text-neutral-500">
          No hay partidos programados para hoy.
        </p>
      )}

      {matches !== null && matches.length > 0 && (
        <div className="flex flex-col gap-2">
          {matches.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 flex flex-col gap-1"
            >
              {m.stage && (
                <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                  {m.stage}
                </span>
              )}
              <span className="text-sm text-neutral-200">
                {m.home} vs {m.away}
              </span>
              <span className="text-xs text-neutral-500">
                {formatTime(m.time)} hs
              </span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
