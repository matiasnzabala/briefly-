import BriefFeed from "@/components/BriefFeed";
import { getFeedEvents } from "@/lib/feed";

// El feed cambia con cada corrida del pipeline (cacheado 30 min en
// lib/feed.ts); sin esto Next.js lo congelaría como HTML estático en
// build time y nunca se actualizaría.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { events, mode, error } = await getFeedEvents();

  return (
    <BriefFeed initialEvents={events} initialMode={mode} initialError={error} />
  );
}
