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

interface RemoteOkJob {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  url?: string;
  apply_url?: string;
  date?: string;
}

// La API de RemoteOK devuelve el texto con doble codificación UTF-8
// (ej. "Ã©" en vez de "é"); esto lo revierte.
function fixMojibake(text: string): string {
  try {
    return Buffer.from(text, "latin1").toString("utf8");
  } catch {
    return text;
  }
}

let cache: { data: JobOffer[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

const MAX_JOBS = 8;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json({ jobs: cache.data });
  }

  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BrieflyBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`remoteok respondió ${res.status}`);

    const json: RemoteOkJob[] = await res.json();
    const listings = json.filter((j) => j.position && j.company);

    const inArgentina = listings.filter((j) =>
      /argentina/i.test(j.location ?? "")
    );
    const openWorldwide = listings.filter(
      (j) =>
        !/argentina/i.test(j.location ?? "") &&
        /worldwide|anywhere/i.test(j.location ?? "")
    );

    const picked = [...inArgentina, ...openWorldwide].slice(0, MAX_JOBS);

    const jobs: JobOffer[] = picked.map((j) => ({
      id: j.id ?? j.slug ?? j.position!,
      title: fixMojibake(j.position!),
      company: fixMojibake(j.company!),
      location: /argentina/i.test(j.location ?? "")
        ? fixMojibake(j.location!)
        : "Remoto (abierto a Argentina)",
      url: j.url ?? j.apply_url ?? "https://remoteok.com",
      tags: (j.tags ?? []).slice(0, 3).map(fixMojibake),
      publishedAt: j.date ?? new Date().toISOString(),
    }));

    cache = { data: jobs, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
