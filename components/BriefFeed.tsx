"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import ThemeToggle from "./ThemeToggle";
import CountryPicker from "./CountryPicker";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
};

const TOP_OPTIONS = [5, 10, 20] as const;
const PREFS_KEY = "briefly:prefs";
const READ_KEY = "briefly:read";
const REFRESH_INTERVAL_MS = 1000 * 60 * 10;

interface StoredPrefs {
  countries: string[];
  categories: Category[];
  period: Period;
  topN: (typeof TOP_OPTIONS)[number];
}

const PERIOD_MS: Record<Period, number> = {
  today: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
  month: 1000 * 60 * 60 * 24 * 30,
};

function loadPrefs(): StoredPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : null;
  } catch {
    return null;
  }
}

function loadReadSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function readKeyFor(event: BriefEvent): string {
  return `${event.country}|${event.headline}`;
}

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function formatRelativeTime(iso: string, now: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMin = Math.floor((now - date.getTime()) / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  return `hace ${Math.floor(diffH / 24)}d`;
}

function importanceBar(score: number): { color: string; label: string } {
  if (score >= 85) return { color: "#ef4444", label: "Alta" };
  if (score >= 65) return { color: "#f59e0b", label: "Media" };
  return { color: "#22c55e", label: "Menor" };
}

function importanceBadge(score: number): { label: string; className: string } {
  if (score >= 85)
    return { label: "🔴 Alta", className: "bg-red-500/15 text-red-400 dark:text-red-300 border-red-500/30" };
  if (score >= 65)
    return { label: "🟡 Media", className: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30" };
  return { label: "🟢 Menor", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" };
}

async function shareEvent(event: BriefEvent) {
  const url = event.sources[0]?.url ?? window.location.href;
  const shareData = { title: event.headline, text: event.summary, url };
  if (navigator.share) {
    try { await navigator.share(shareData); return; } catch { /* cancelado */ }
  }
  try { await navigator.clipboard.writeText(url); } catch { /* sin permiso */ }
}

function TickerSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {[80, 120, 96, 104].map((w) => (
        <span
          key={w}
          className="h-7 rounded-full animate-pulse"
          style={{ width: w, background: "var(--skeleton)" }}
        />
      ))}
    </div>
  );
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

  const [events, setEvents] = useState<BriefEvent[]>(
    () => (initialEvents.length > 0 ? initialEvents : MOCK_EVENTS)
  );
  const [mode] = useState(initialMode);
  const [usingMock] = useState(initialEvents.length === 0);
  const [error] = useState(initialError ?? null);

  // auto-refresh
  const [newCount, setNewCount] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(() => Date.now());
  const knownIdsRef = useRef<Set<string>>(
    new Set(initialEvents.map((e) => e.id))
  );

  const checkForUpdates = useCallback(async () => {
    try {
      const res = await fetch("/api/feed");
      if (!res.ok) return;
      const json: { events?: BriefEvent[] } = await res.json();
      if (!json.events) return;
      setLastFetchedAt(Date.now());
      const incoming = json.events;
      const fresh = incoming.filter((e) => !knownIdsRef.current.has(e.id));
      if (fresh.length > 0) {
        setNewCount(fresh.length);
      }
      // guardamos ids para el próximo ciclo pero no mostramos aún
      knownIdsRef.current = new Set(incoming.map((e) => e.id));
      // si el usuario acepta la actualización, usamos esto
      latestEventsRef.current = incoming;
    } catch { /* silencioso */ }
  }, []);

  const latestEventsRef = useRef<BriefEvent[]>(initialEvents);

  function applyUpdate() {
    setEvents(latestEventsRef.current.length > 0 ? latestEventsRef.current : events);
    setNewCount(0);
    setLastFetchedAt(Date.now());
  }

  useEffect(() => {
    const id = setInterval(checkForUpdates, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkForUpdates]);

  useEffect(() => {
    const prefs: StoredPrefs = { countries, categories, period, topN };
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [countries, categories, period, topN]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [search, setSearch] = useState("");

  // filtros
  const allCategoriesSelected = CATEGORIES.every((c) => categories.includes(c));

  function toggleCountry(code: string) {
    setCountries((prev) => {
      if (prev.includes(code)) {
        const next = prev.filter((c) => c !== code);
        return next.length === 0 ? prev : next;
      }
      return [...prev, code];
    });
  }

  function toggleCategory(cat: Category) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  const candidates = useMemo(() => {
    return events
      .filter((e) => countries.includes(e.country) && categories.includes(e.category))
      .sort((a, b) => b.importance - a.importance);
  }, [events, countries, categories]);

  const eventsInPeriod = useMemo(() => {
    const windowMs = PERIOD_MS[period];
    return candidates.filter((e) => {
      const t = new Date(e.publishedAt).getTime();
      return Number.isNaN(t) || now - t <= windowMs;
    });
  }, [candidates, period, now]);

  const searchQuery = search.trim().toLowerCase();
  const visibleEvents = useMemo(() => {
    const pool = (eventsInPeriod.length >= topN ? eventsInPeriod : candidates).slice(0, topN);
    if (!searchQuery) return pool;
    return pool.filter(
      (e) =>
        e.headline.toLowerCase().includes(searchQuery) ||
        e.summary.toLowerCase().includes(searchQuery)
    );
  }, [eventsInPeriod, candidates, topN, searchQuery]);

  const expandedBeyondPeriod =
    eventsInPeriod.length < topN && visibleEvents.length > eventsInPeriod.length;

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedEvent(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEvent]);

  const minutesSinceFetch = Math.floor((now - lastFetchedAt) / 60000);
  const freshnessLabel =
    minutesSinceFetch < 1 ? "actualizado ahora" : `actualizado hace ${minutesSinceFetch}m`;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Toast de nuevas noticias */}
      {newCount > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <button
            onClick={applyUpdate}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            ↑ {newCount} nueva{newCount > 1 ? "s noticias" : " noticia"} — actualizar
          </button>
        </div>
      )}

      <div className="sticky-header -mx-4 px-4 pb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between gap-2 sm:contents">
          <h1
            className="text-xl font-bold tracking-tight shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            briefly
          </h1>
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
        </div>
        <div className="min-w-0 sm:flex-1">
          {mounted ? <TopTicker /> : <TickerSkeleton />}
        </div>
        <div className="hidden sm:block shrink-0">
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full max-w-2xl mx-auto lg:mx-0 flex flex-col gap-8">

          {/* Header */}
          <header className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Lo importante, sin ruido</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "var(--accent)" }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              </span>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{freshnessLabel}</span>
            </div>
            {usingMock && (
              <p className="text-xs text-amber-500 dark:text-amber-400">
                Mostrando datos de ejemplo{error ? ` (${error})` : ""}.
              </p>
            )}
            {!usingMock && mode === "keyword" && (
              <p className="text-xs text-sky-600 dark:text-sky-400">RSS reales agrupados por palabras clave.</p>
            )}
            {!usingMock && mode === "ai" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">RSS reales resumidos con IA.</p>
            )}
          </header>

          {/* Filtros */}
          <section className="flex flex-col gap-4">
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Países</p>
              <CountryPicker selected={countries} onChange={setCountries} />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="px-3 py-1.5 text-sm rounded-md transition"
                    style={
                      period === p
                        ? { background: "var(--accent-bg)", color: "var(--accent-text)" }
                        : { color: "var(--text-muted)" }
                    }
                  >
                    {PERIOD_LABEL[p]}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {TOP_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setTopN(n)}
                    className="px-3 py-1.5 text-sm rounded-md transition"
                    style={
                      topN === n
                        ? { background: "var(--accent-bg)", color: "var(--accent-text)" }
                        : { color: "var(--text-muted)" }
                    }
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Categorías</p>
                <button
                  onClick={() =>
                    setCategories(allCategoriesSelected ? [] : [...CATEGORIES])
                  }
                  className="text-xs transition"
                  style={{ color: "var(--text-faint)" }}
                >
                  {allCategoriesSelected ? "Ninguna" : "Todas"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="px-3 py-1 text-xs rounded-full border transition"
                    style={
                      categories.includes(cat)
                        ? { background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent-text)" }
                        : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Búsqueda */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "var(--text-faint)" }}>🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar noticias…"
              className="w-full rounded-xl px-4 py-2.5 pl-9 text-sm outline-none transition"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Lista */}
          <section className="flex flex-col gap-4">
            {visibleEvents.length > 0 && !expandedBeyondPeriod && !searchQuery && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {eventsInPeriod.length} eventos en {PERIOD_LABEL[period].toLowerCase()}, mostrando los {visibleEvents.length} más importantes.
              </p>
            )}
            {expandedBeyondPeriod && !searchQuery && (
              <p className="text-xs text-amber-500 dark:text-amber-400">
                Solo había {eventsInPeriod.length} eventos en {PERIOD_LABEL[period].toLowerCase()}; completamos hasta {visibleEvents.length} con eventos de fuera del periodo.
              </p>
            )}
            {searchQuery && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {visibleEvents.length === 0 ? "Sin resultados para" : `${visibleEvents.length} resultado${visibleEvents.length !== 1 ? "s" : ""} para`}{" "}
                <span style={{ color: "var(--text)" }}>"{search.trim()}"</span>
              </p>
            )}
            {visibleEvents.length === 0 && !searchQuery && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No hay eventos para esta combinación de filtros. Probá con otras categorías o un periodo más amplio.
              </p>
            )}

            {visibleEvents.map((event, i) => {
              const isRead = readSet.has(readKeyFor(event));
              const badge = importanceBadge(event.importance);
              return (
                <article
                  key={event.id}
                  onClick={() => openEvent(event)}
                  style={mounted ? {
                    animationDelay: `${i * 40}ms`,
                    animationFillMode: "both",
                    opacity: isRead ? 0.55 : 1,
                  } : undefined}
                  className={`glass card-hover rounded-2xl p-5 flex flex-col gap-3 cursor-pointer ${mounted ? "animate-fadeIn" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: importanceBar(event.importance).color }}
                        aria-hidden
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: "var(--accent-text)" }}>
                        {event.category}
                      </span>
                      {countries.length > 1 && (
                        <span className="text-xs truncate" style={{ color: "var(--text-faint)" }}>
                          — {countryName(event.country)}
                        </span>
                      )}
                      {isRead && <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>✓ leído</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold leading-snug" style={{ color: "var(--text)" }}>{event.headline}</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{event.summary}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs pt-2" style={{ color: "var(--text-faint)" }}>
                      <span>{formatRelativeTime(event.publishedAt, now)}</span>
                      <span>·</span>
                      <span>{event.sourcesCount} fuentes:</span>
                      {event.sources.map((s) => (
                        <a
                          key={s.name}
                          href={s.url}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline transition-colors"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {s.name}
                        </a>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(event); }}
                      className="text-xs font-medium transition-colors shrink-0 mt-2"
                      style={{ color: copiedId === event.id ? "var(--accent-text)" : "var(--text-faint)" }}
                    >
                      {copiedId === event.id ? "Copiado ✓" : "Compartir ↗"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        {/* Panel del Mundial — sticky en desktop, colapsado debajo en mobile */}
        <div className="w-full lg:w-64 shrink-0 lg:sticky lg:top-6 order-last lg:order-none">
          <WorldCupPanel />
        </div>
      </div>

      {/* Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fadeIn"
          style={{ background: "var(--overlay)" }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="glass rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4"
            style={{ background: "var(--modal-bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {selectedEvent.category}
                  {countries.length > 1 && ` — ${countryName(selectedEvent.country)}`}
                </span>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {formatRelativeTime(selectedEvent.publishedAt, now)}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-sm transition"
                style={{ color: "var(--text-muted)" }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <h2 className="text-xl font-medium leading-snug" style={{ color: "var(--text)" }}>{selectedEvent.headline}</h2>

            <span className={`text-xs px-2 py-0.5 rounded-full border self-start ${importanceBadge(selectedEvent.importance).className}`}>
              {importanceBadge(selectedEvent.importance).label}
            </span>

            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{selectedEvent.summary}</p>

            <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedEvent.sourcesCount} fuentes citadas</p>
              <div className="flex flex-col gap-1.5">
                {selectedEvent.sources.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                    style={{ color: "var(--accent-text)" }}
                  >
                    {s.name} <span className="text-xs">↗</span>
                  </a>
                ))}
              </div>
            </div>

            {selectedEvent.sources[0] && (
              <a
                href={selectedEvent.sources[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 w-full text-center text-sm font-medium py-2.5 rounded-lg transition"
                style={{
                  background: `linear-gradient(135deg, var(--accent-bg), var(--accent-bg))`,
                  border: "1px solid var(--accent-border)",
                  color: "var(--accent-text)",
                }}
              >
                Leer nota completa ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
