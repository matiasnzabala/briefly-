import { fetchAllArticles } from "./rss";
import { summarizeArticles, type GeneratedEvent } from "./summarize";
import { clusterArticles } from "./cluster";
import { mergeWithHistory } from "./history";

let cache: { data: GeneratedEvent[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

export interface FeedResult {
  events: GeneratedEvent[];
  mode: "ai" | "keyword";
  error?: string;
}

export async function getFeedEvents(): Promise<FeedResult> {
  if (cache && cache.expiresAt > Date.now()) {
    return {
      events: cache.data,
      mode: process.env.ANTHROPIC_API_KEY ? "ai" : "keyword",
    };
  }

  try {
    const fresh = await fetchAllArticles();
    if (fresh.length === 0) {
      return {
        events: [],
        mode: "keyword",
        error: "No se pudieron obtener artículos de las fuentes RSS",
      };
    }

    const articles = mergeWithHistory(fresh);

    const events = process.env.ANTHROPIC_API_KEY
      ? await summarizeArticles(articles)
      : clusterArticles(articles);

    cache = { data: events, expiresAt: Date.now() + CACHE_TTL_MS };

    return {
      events,
      mode: process.env.ANTHROPIC_API_KEY ? "ai" : "keyword",
    };
  } catch (err) {
    console.error(err);
    return {
      events: [],
      mode: "keyword",
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
