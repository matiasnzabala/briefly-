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

export async function fetchAllArticles(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return (feed.items ?? []).slice(0, 20).map((item) => ({
        title: item.title ?? "",
        link: item.link ?? "",
        source: source.name,
        country: source.country,
        publishedAt: item.isoDate,
        contentSnippet: item.contentSnippet?.slice(0, 300),
      }));
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RawArticle[]> => r.status === "fulfilled"
    )
    .flatMap((r) => r.value)
    .filter((a) => a.title);
}
