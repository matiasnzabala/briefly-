import Parser from "rss-parser";
import { SOURCES, type FeedSource } from "./sources";
import { translateBatch } from "./translate";

interface MediaContentField {
  $?: { url?: string; medium?: string };
}
interface EnclosureField {
  url?: string;
  type?: string;
}

const parser: Parser<unknown, { "media:content"?: MediaContentField; enclosure?: EnclosureField }> =
  new Parser({
    timeout: 10000,
    customFields: { item: ["media:content", "enclosure"] },
  });

export interface RawArticle {
  title: string;
  link: string;
  source: string;
  country: string;
  publishedAt: string | undefined;
  contentSnippet: string | undefined;
  imageUrl: string | undefined;
}

function extractImageUrl(item: {
  "media:content"?: MediaContentField;
  enclosure?: EnclosureField;
}): string | undefined {
  const mediaUrl = item["media:content"]?.$?.url;
  if (mediaUrl) return mediaUrl;

  const enclosureUrl = item.enclosure?.url;
  if (enclosureUrl && item.enclosure?.type?.startsWith("image/")) {
    return enclosureUrl;
  }

  return undefined;
}

function splitGoogleNewsTitle(rawTitle: string): {
  title: string;
  source: string | null;
} {
  const idx = rawTitle.lastIndexOf(" - ");
  if (idx === -1) return { title: rawTitle, source: null };
  return {
    title: rawTitle.slice(0, idx),
    source: rawTitle.slice(idx + 3).trim(),
  };
}

async function fetchSource(source: FeedSource): Promise<RawArticle[]> {
  const feed = await parser.parseURL(source.url);
  const articles = (feed.items ?? []).slice(0, 35).map((item) => {
    const rawTitle = item.title ?? "";

    const imageUrl = extractImageUrl(item);

    if (source.isGoogleNews) {
      const { title, source: parsedSource } = splitGoogleNewsTitle(rawTitle);
      return {
        title,
        link: item.link ?? "",
        source: parsedSource ?? source.name,
        country: source.country,
        publishedAt: item.isoDate,
        contentSnippet: item.contentSnippet?.slice(0, 300),
        imageUrl,
      };
    }

    return {
      title: rawTitle,
      link: item.link ?? "",
      source: source.name,
      country: source.country,
      publishedAt: item.isoDate,
      contentSnippet: item.contentSnippet?.slice(0, 300),
      imageUrl,
    };
  });

  if (!source.lang) return articles;

  // Traducir títulos y resúmenes al español en dos requests batcheados
  // (no uno por artículo) para no multiplicar las llamadas a la API.
  const [translatedTitles, translatedSnippets] = await Promise.all([
    translateBatch(
      articles.map((a) => a.title),
      source.lang
    ),
    translateBatch(
      articles.map((a) => a.contentSnippet ?? ""),
      source.lang
    ),
  ]);

  return articles.map((a, i) => ({
    ...a,
    title: translatedTitles[i] || a.title,
    contentSnippet: translatedSnippets[i] || a.contentSnippet,
  }));
}

export async function fetchAllArticles(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(SOURCES.map(fetchSource));

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RawArticle[]> => r.status === "fulfilled"
    )
    .flatMap((r) => r.value)
    .filter((a) => a.title);
}
