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
import TopTicker from "./TopTicker";
import WorldCupPanel from "./WorldCupPanel";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
};

const TOP_OPTIONS = [5, 10, 20] as const;

const PREFS_KEY = "briefly:prefs";

interface StoredPrefs {
  countries: string[];
  categories: Category[];
  period: Period;
  topN: (typeof TOP_OPTIONS)[number];
}

function loadPrefs(): StoredPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPrefs;
  } catch {
    return null;
  }
}

const PERIOD_MS: Record<Period, number> = {
  today: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
  month: 1000 * 60 * 60 * 24 * 30,
};

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function formatPublishedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function importanceColor(score: number) {
  if (score >= 85) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (score >= 65)
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
}

const READ_KEY = "briefly:read";

function readKeyFor(event: BriefEvent): string {
  return `${event.country}|${event.headline}`;
}

function loadReadSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

async function shareEvent(event: BriefEvent) {
  const url = event.sources[0]?.url ?? window.location.href;
  const shareData = { title: event.headline, text: event.summary, url };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      // usuario canceló o falló — caemos al portapapeles
    }
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // sin permiso de portapapeles, no hacemos nada más
  }
}

interface BriefFeedProps {
  initialEvents: BriefEvent[];
  initialMode: "ai" | "keyword";
  initialError?: string;
}

export default function BriefFeed({
  initialEvents,
  initialMode,
  initialError,
}: BriefFeedProps) {
  const [countries, setCountries] = useState<string[]>(
    () => loadPrefs()?.countries ?? ["AR"]
  );
  const [categories, setCategories] = useState<Category[]>(
    () => loadPrefs()?.categories ?? CATEGORIES
  );
  const [period, setPeriod] = useState<Period>(
    () => loadPrefs()?.period ?? "today"
  );
  const [topN, setTopN] = useState<(typeof TOP_OPTIONS)[number]>(
    () => loadPrefs()?.topN ?? 10
  );

  useEffect(() => {
    const prefs: StoredPrefs = { countries, categories, period, topN };
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [countries, categories, period, topN]);

  // Los datos ya llegan resueltos desde el servidor (sin loading ni fetch
  // del lado del cliente), así que solo caemos a mock si el RSS falló.
  const usingMock = initialEvents.length === 0;
  const mode = initialMode;
  const error = initialError ?? null;

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

  const sourceEvents = initialEvents.length > 0 ? initialEvents : MOCK_EVENTS;

  const [now] = useState(() => Date.now());

  const candidates = useMemo(() => {
    return sourceEvents
      .filter(
        (e) => countries.includes(e.country) && categories.includes(e.category)
      )
      .sort((a, b) => b.importance - a.importance);
  }, [sourceEvents, countries, categories]);

  const eventsInPeriod = useMemo(() => {
    const windowMs = PERIOD_MS[period];
    return candidates.filter((e) => {
      const publishedTime = new Date(e.publishedAt).getTime();
      if (Number.isNaN(publishedTime)) return true;
      return now - publishedTime <= windowMs;
    });
  }, [candidates, period, now]);

  const events = useMemo(
    () => (eventsInPeriod.length >= topN ? eventsInPeriod : candidates).slice(
      0,
      topN
    ),
    [eventsInPeriod, candidates, topN]
  );

  const expandedBeyondPeriod =
    eventsInPeriod.length < topN && events.length > eventsInPeriod.length;

  const [selectedEvent, setSelectedEvent] = useState<BriefEvent | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(() => loadReadSet());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function openEvent(event: BriefEvent) {
    setSelectedEvent(event);
    setReadSet((prev) => {
      const next = new Set(prev);
      next.add(readKeyFor(event));
      window.localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  async function handleShare(event: BriefEvent) {
    await shareEvent(event);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId((id) => (id === event.id ? null : id)), 2000);
  }

  useEffect(() => {
    if (!selectedEvent) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedEvent(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEvent]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
      <div className="border-b border-neutral-900 pb-3">
        <TopTicker />
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="w-full max-w-2xl mx-auto lg:mx-0 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Briefly</h1>
        <p className="text-neutral-400 text-sm">
          Lo más importante, sin ruido.
        </p>
        {usingMock && (
          <p className="text-xs text-amber-400">
            Mostrando datos de ejemplo
            {error ? ` (${error})` : ""}.
          </p>
        )}
        {!usingMock && mode === "keyword" && (
          <p className="text-xs text-sky-400">
            RSS reales agrupados por palabras clave (modo gratis, sin IA).
          </p>
        )}
        {!usingMock && mode === "ai" && (
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
        {events.length > 0 && !expandedBeyondPeriod && (
          <p className="text-xs text-neutral-500">
            {eventsInPeriod.length} eventos encontrados en{" "}
            {PERIOD_LABEL[period].toLowerCase()}, mostrando los {events.length}{" "}
            más importantes.
          </p>
        )}
        {expandedBeyondPeriod && (
          <p className="text-xs text-amber-400">
            Solo había {eventsInPeriod.length} eventos en{" "}
            {PERIOD_LABEL[period].toLowerCase()}; completamos hasta {events.length}{" "}
            con eventos de fuera de ese periodo.
          </p>
        )}

        {events.length === 0 && (
          <p className="text-neutral-500 text-sm">
            No hay eventos para esta combinación de filtros. Probá con otras
            categorías o un periodo más amplio.
          </p>
        )}

        {events.map((event) => {
          const isRead = readSet.has(readKeyFor(event));
          return (
            <article
              key={event.id}
              onClick={() => openEvent(event)}
              className={`rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 flex flex-col gap-3 cursor-pointer hover:border-neutral-700 transition ${
                isRead ? "opacity-60" : ""
              }`}
            >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">
                    {event.category}
                    {countries.length > 1 &&
                      ` — ${countryName(event.country)}`}
                    {isRead && " · Leído"}
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

                <div className="flex flex-wrap items-center justify-between gap-2 pb-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span>{event.sourcesCount} fuentes —</span>
                    {event.sources.map((s) => (
                      <a
                        key={s.name}
                        href={s.url}
                        onClick={(e) => e.stopPropagation()}
                        className="underline decoration-neutral-700 hover:decoration-neutral-400"
                      >
                        {s.name}
                      </a>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(event);
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-200 shrink-0"
                  >
                    {copiedId === event.id ? "Copiado ✓" : "Compartir"}
                  </button>
                </div>
            </article>
          );
        })}
      </section>
      </div>

      <WorldCupPanel />
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  {selectedEvent.category}
                  {countries.length > 1 &&
                    ` — ${countryName(selectedEvent.country)}`}
                </span>
                <span className="text-xs text-neutral-600">
                  {formatPublishedAt(selectedEvent.publishedAt)}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-neutral-500 hover:text-neutral-200 text-sm"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <h2 className="text-xl font-medium leading-snug">
              {selectedEvent.headline}
            </h2>

            <span
              className={`text-xs px-2 py-0.5 rounded-full border self-start ${importanceColor(
                selectedEvent.importance
              )}`}
            >
              Importancia {selectedEvent.importance}
            </span>

            <p className="text-sm text-neutral-300 leading-relaxed">
              {selectedEvent.summary}
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
              <p className="text-xs text-neutral-500">
                {selectedEvent.sourcesCount} fuentes citadas
              </p>
              <div className="flex flex-col gap-1">
                {selectedEvent.sources.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sky-400 hover:underline"
                  >
                    {s.name} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
