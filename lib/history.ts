import fs from "fs";
import path from "path";
import type { RawArticle } from "./rss";

const HISTORY_FILE = path.join(process.cwd(), "data", "articles-history.json");
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 35; // 35 días

function readHistory(): RawArticle[] {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    return JSON.parse(raw) as RawArticle[];
  } catch {
    return [];
  }
}

function writeHistory(articles: RawArticle[]) {
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(articles), "utf8");
  } catch {
    // En hosting serverless (ej. Vercel) el filesystem es efímero:
    // si falla la escritura, simplemente no se acumula historial entre
    // invocaciones y el feed sigue funcionando solo con el snapshot actual.
  }
}

export function mergeWithHistory(fresh: RawArticle[]): RawArticle[] {
  const existing = readHistory();
  const now = Date.now();

  const byLink = new Map<string, RawArticle>();
  for (const article of existing) {
    const time = article.publishedAt ? Date.parse(article.publishedAt) : NaN;
    if (!Number.isNaN(time) && now - time > MAX_AGE_MS) continue;
    if (article.link) byLink.set(article.link, article);
  }
  for (const article of fresh) {
    if (article.link) byLink.set(article.link, article);
  }

  const merged = Array.from(byLink.values());
  writeHistory(merged);
  return merged;
}
