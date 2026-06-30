import { NextResponse } from "next/server";

let cache: { data: { valor: number; fecha: string }; expiresAt: number } | null =
  null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(
      "https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`argentinadatos respondió ${res.status}`);

    const data = await res.json();
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
