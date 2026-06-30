const SPLIT_MARK = "\n|||\n";

async function translateRaw(text: string, sourceLang: string): Promise<string> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", sourceLang);
  url.searchParams.set("tl", "es");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`translate respondió ${res.status}`);

  const json = await res.json();
  // json[0] es un array de segmentos [traducido, original, ...]; los unimos.
  const segments: string[] = (json[0] ?? []).map(
    (seg: unknown[]) => seg[0] as string
  );
  return segments.join("");
}

/**
 * Traduce una lista de textos en un solo request, usando un separador
 * poco común para no perder el orden. Si algo falla o no coincide la
 * cantidad de líneas, devuelve los textos originales sin traducir.
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string
): Promise<string[]> {
  if (texts.length === 0) return texts;

  try {
    const joined = texts.join(SPLIT_MARK);
    const translated = await translateRaw(joined, sourceLang);
    const parts = translated.split(SPLIT_MARK.trim());

    if (parts.length === texts.length) {
      return parts.map((p) => p.trim());
    }
    return texts;
  } catch (err) {
    console.error("translateBatch falló:", err);
    return texts;
  }
}
