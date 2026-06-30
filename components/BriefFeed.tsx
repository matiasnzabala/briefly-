"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  COUNTRIES,
  MOCK_EVENTS,
  type BriefEvent,
  type Category,
  type Period,
} from "@/lib/mock-data";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
};

const TOP_OPTIONS = [5, 10, 20] as const;

function importanceColor(score: number) {
  if (score >= 85) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (score >= 65)
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
}

export default function BriefFeed() {
  const [countries, setCountries] = useState<string[]>(["AR"]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [period, setPeriod] = useState<Period>("today");
  const [topN, setTopN] = useState<(typeof TOP_OPTIONS)[number]>(10);

  const [liveEvents, setLiveEvents] = useState<BriefEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [mode, setMode] = useState<"ai" | "keyword" | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/feed");
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(json.error ?? "Error al cargar el feed real");
          setUsingMock(true);
          setLiveEvents(null);
        } else {
          setLiveEvents(json.events);
          setMode(json.mode ?? null);
          setUsingMock(false);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo conectar con /api/feed");
          setUsingMock(true);
          setLiveEvents(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCategory(cat: Category) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleCountry(code: string) {
    setCountries((prev) => {
      if (prev.includes(code)) {
        const next = prev.filter((c) => c !== code);
        return next.length === 0 ? prev : next;
      }
      return [...prev, code];
    });
  }

  const sourceEvents = useMemo(() => {
    if (!liveEvents) return MOCK_EVENTS;
    const liveCountries = new Set(liveEvents.map((e) => e.country));
    const mockFallback = MOCK_EVENTS.filter(
      (e) => !liveCountries.has(e.country)
    );
    return [...liveEvents, ...mockFallback];
  }, [liveEvents]);

  const events = useMemo(() => {
    return sourceEvents
      .filter(
        (e) => countries.includes(e.country) && categories.includes(e.category)
      )
      .sort((a, b) => b.importance - a.importance)
      .slice(0, topN);
  }, [sourceEvents, countries, categories, topN]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Briefly</h1>
        <p className="text-neutral-400 text-sm">
          Lo más importante, sin ruido.
        </p>
        {loading && (
          <p className="text-xs text-neutral-500">Cargando noticias reales…</p>
        )}
        {!loading && usingMock && (
          <p className="text-xs text-amber-400">
            Mostrando datos de ejemplo
            {error ? ` (${error})` : ""}.
          </p>
        )}
        {!loading && !usingMock && mode === "keyword" && (
          <p className="text-xs text-sky-400">
            RSS reales agrupados por palabras clave (modo gratis, sin IA).
          </p>
        )}
        {!loading && !usingMock && mode === "ai" && (
          <p className="text-xs text-emerald-400">
            RSS reales resumidos con IA.
          </p>
        )}
      </header>

      <section className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-neutral-500 mb-2">Países</p>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => toggleCountry(c.code)}
                className={`px-3 py-1 text-xs rounded-full border transition ${
                  countries.includes(c.code)
                    ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  period === p
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            {TOP_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  topN === n
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>

        <div>
        <p className="text-xs text-neutral-500 mb-2">Categorías</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition ${
                categories.includes(cat)
                  ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        {events.length === 0 && !loading && (
          <p className="text-neutral-500 text-sm">
            No hay eventos para esta combinación de filtros. Probá con otras
            categorías.
          </p>
        )}

        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wide text-neutral-500">
                {event.category}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${importanceColor(
                  event.importance
                )}`}
              >
                Importancia {event.importance}
              </span>
            </div>

            <h2 className="text-lg font-medium leading-snug">
              {event.headline}
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {event.summary}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 pt-1">
              <span>{event.sourcesCount} fuentes —</span>
              {event.sources.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  className="underline decoration-neutral-700 hover:decoration-neutral-400"
                >
                  {s.name}
                </a>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
