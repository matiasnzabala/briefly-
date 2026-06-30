import { NextResponse } from "next/server";

export interface DolarRate {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
}

let cache: { data: DolarRate[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutos

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json({ rates: cache.data });
  }

  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`dolarapi respondió ${res.status}`);

    const data: DolarRate[] = await res.json();
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json({ rates: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
