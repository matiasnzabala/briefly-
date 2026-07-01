import Anthropic from "@anthropic-ai/sdk";
import type { RawArticle } from "./rss";
import type { Category } from "./mock-data";

const CATEGORIES: Category[] = [
  "Política",
  "Economía",
  "Deportes",
  "Tecnología",
  "Negocios",
  "Salud",
  "Ciencia",
  "Mundo",
];

export interface GeneratedEvent {
  id: string;
  country: string;
  category: Category;
  headline: string;
  summary: string;
  importance: number;
  sourcesCount: number;
  sources: { name: string; url: string }[];
  publishedAt: string;
}

export async function summarizeArticles(
  articles: RawArticle[]
): Promise<GeneratedEvent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no configurada");
  }

  const client = new Anthropic({ apiKey });

  const articlesForPrompt = articles.map((a, i) => ({
    idx: i,
    title: a.title,
    source: a.source,
    snippet: a.contentSnippet,
  }));

  const prompt = `Te paso una lista de titulares de noticias de distintos medios argentinos, en formato JSON.

Tu tarea:
1. Agrupá los titulares que hablan del mismo hecho/evento real (aunque estén redactados distinto).
2. Para cada grupo, extraé cuál es el hecho central (no copies el titular textual, sintetizalo).
3. Asignale una categoría de esta lista exacta: ${CATEGORIES.join(", ")}.
4. Escribí un resumen de 1-2 oraciones, claro y neutral.
5. Asignale un score de importancia de 0 a 100, considerando: cantidad de fuentes que lo cubren, relevancia para el público general, y magnitud del hecho.
6. Quedate solo con los 10 grupos más importantes.
7. Para cada grupo, indicá los índices (idx) de los artículos originales que lo componen.

Artículos:
${JSON.stringify(articlesForPrompt)}

Respondé ÚNICAMENTE con un JSON array válido, sin texto adicional, con este formato exacto:
[
  {
    "headline": "string corto, tipo titular",
    "category": "una de las categorías exactas",
    "summary": "1-2 oraciones",
    "importance": number,
    "articleIdxs": [number, ...]
  }
]`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Respuesta inesperada del modelo");
  }

  const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("No se pudo extraer JSON de la respuesta del modelo");
  }

  const parsed: {
    headline: string;
    category: string;
    summary: string;
    importance: number;
    articleIdxs: number[];
  }[] = JSON.parse(jsonMatch[0]);

  return parsed.map((group, i) => {
    const groupArticles = group.articleIdxs
      .map((idx) => articles[idx])
      .filter(Boolean);

    const uniqueSources = Array.from(
      new Map(groupArticles.map((a) => [a.source, a])).values()
    );

    return {
      id: String(i + 1),
      country: groupArticles[0]?.country ?? "AR",
      category: CATEGORIES.includes(group.category as Category)
        ? (group.category as Category)
        : "Política",
      headline: group.headline,
      summary: group.summary,
      importance: Math.max(0, Math.min(100, Math.round(group.importance))),
      sourcesCount: uniqueSources.length,
      sources: uniqueSources.slice(0, 6).map((a) => ({
        name: a.source,
        url: a.link,
      })),
      publishedAt: groupArticles[0]?.publishedAt ?? new Date().toISOString(),
    };
  });
}
