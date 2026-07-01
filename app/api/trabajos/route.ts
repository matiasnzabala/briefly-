import { NextResponse } from "next/server";

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  tags: string[];
  publishedAt: string;
}

// El endpoint público (guest) de búsqueda de empleos de LinkedIn devuelve
// HTML con tarjetas de avisos. Es gratuito y sin clave. Filtramos por
// ubicación y limitamos a la última semana (f_TPR=r604800) por relevancia.
// Nota: evitar sortBy=DD y ventanas largas (f_TPR=r2592000): LinkedIn
// responde con avisos extranjeros mal geo-etiquetados y artefactos de UI.
function buildLinkedInUrl(location: string, km: number): string {
  const params = new URLSearchParams({
    location,
    f_TPR: "r604800",
    start: "0",
  });
  // `distance` de LinkedIn va en millas. 50 km ≈ 31 mi.
  if (km > 0) params.set("distance", String(Math.round(km * 0.621371)));
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const MAX_JOBS = 8;
const DEFAULT_LOCATION = "Argentina"; // sin geolocalización: todo el país

const cache = new Map<string, { data: JobOffer[]; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function clean(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// LinkedIn limita por IP (429) de forma agresiva. Reintentamos un par de
// veces con backoff corto para sobrevivir a un arranque en frío sin cache.
async function fetchListings(url: string): Promise<string> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return res.text();
    lastStatus = res.status;
    if (res.status !== 429 && res.status < 500) break; // errores no transitorios
  }
  throw new Error(`linkedin respondió ${lastStatus}`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = (searchParams.get("location") || DEFAULT_LOCATION).trim();
  const km = Number(searchParams.get("km")) || 0;

  const cacheKey = `${location}|${km}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ jobs: cached.data });
  }

  try {
    const html = await fetchListings(buildLinkedInUrl(location, km));

    // Parseamos tarjeta por tarjeta (un bloque por aviso). Extraer campo por
    // campo dentro de cada bloque evita que un aviso sin algún dato desalinee
    // al resto (títulos que se mezclan con ubicaciones de otro).
    const blocks = html.split(/<li>/).filter((b) => b.includes("jobPosting"));

    const one = (block: string, re: RegExp) => {
      const m = block.match(re);
      return m ? clean(m[1]) : "";
    };

    const jobs: JobOffer[] = [];
    for (const block of blocks) {
      if (jobs.length >= MAX_JOBS) break;

      const title = one(block, /base-search-card__title[^>]*>([\s\S]*?)<\/h3>/);
      const company = one(block, /base-search-card__subtitle[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
      if (!title || !company) continue;

      const rawUrl = block.match(/base-card__full-link[^>]*href="([^"]+)"/)?.[1] ?? "";
      const url = rawUrl
        ? decodeEntities(rawUrl).split("?")[0]
        : "https://www.linkedin.com/jobs/search?location=Argentina";

      jobs.push({
        id: rawUrl.match(/-(\d+)\?/)?.[1] ?? String(jobs.length),
        title,
        company,
        location: one(block, /job-search-card__location[^>]*>([\s\S]*?)<\/span>/) || "Argentina",
        url,
        tags: [],
        publishedAt: block.match(/datetime="([^"]+)"/)?.[1] ?? new Date().toISOString(),
      });
    }

    if (jobs.length === 0) throw new Error("no se pudieron parsear avisos");

    cache.set(cacheKey, { data: jobs, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error(err);
    // Si la actualización falla (p. ej. 429 de LinkedIn), seguimos sirviendo
    // el último resultado bueno aunque esté vencido, para no romper el panel.
    if (cached) {
      return NextResponse.json({ jobs: cached.data, stale: true });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
