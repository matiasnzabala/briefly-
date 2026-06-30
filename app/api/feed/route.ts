import { NextResponse } from "next/server";
import { fetchAllArticles } from "@/lib/rss";
import { summarizeArticles, type GeneratedEvent } from "@/lib/summarize";
import { clusterArticles } from "@/lib/cluster";

let cache: { data: GeneratedEvent[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json({ events: cache.data, cached: true });
  }

  try {
    const articles = await fetchAllArticles();
    if (articles.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron obtener artículos de las fuentes RSS" },
        { status: 502 }
      );
    }

    const events = process.env.ANTHROPIC_API_KEY
      ? await summarizeArticles(articles)
      : clusterArticles(articles);

    cache = { data: events, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json({
      events,
      cached: false,
      mode: process.env.ANTHROPIC_API_KEY ? "ai" : "keyword",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
