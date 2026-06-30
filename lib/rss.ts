import Parser from "rss-parser";
import { SOURCES } from "./sources";

const parser = new Parser({ timeout: 10000 });

export interface RawArticle {
  title: string;
  link: string;
  source: string;
  country: string;
  publishedAt: string | undefined;
  contentSnippet: string | undefined;
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

export async function fetchAllArticles(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return (feed.items ?? []).slice(0, 35).map((item) => {
        const rawTitle = item.title ?? "";

        if (source.isGoogleNews) {
          const { title, source: parsedSource } =
            splitGoogleNewsTitle(rawTitle);
          return {
            title,
            link: item.link ?? "",
            source: parsedSource ?? source.name,
            country: source.country,
            publishedAt: item.isoDate,
            contentSnippet: item.contentSnippet?.slice(0, 300),
          };
        }

        return {
          title: rawTitle,
          link: item.link ?? "",
          source: source.name,
          country: source.country,
          publishedAt: item.isoDate,
          contentSnippet: item.contentSnippet?.slice(0, 300),
        };
      });
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RawArticle[]> => r.status === "fulfilled"
    )
    .flatMap((r) => r.value)
    .filter((a) => a.title);
}
