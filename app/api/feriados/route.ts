import { NextResponse } from "next/server";

interface Holiday {
  fecha: string;
  tipo: string;
  nombre: string;
}

let cache: { data: Holiday | null; expiresAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json({ next: cache.data });
  }

  try {
    const year = new Date().getFullYear();
    const res = await fetch(
      `https://api.argentinadatos.com/v1/feriados/${year}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`argentinadatos respondió ${res.status}`);

    const holidays: Holiday[] = await res.json();
    const today = new Date().toISOString().slice(0, 10);
    const next = holidays
      .filter((h) => h.fecha >= today)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))[0] ?? null;

    cache = { data: next, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json({ next });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
