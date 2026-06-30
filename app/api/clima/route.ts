import { NextResponse } from "next/server";

const WEATHER_CODE_LABEL: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla",
  51: "Llovizna débil",
  53: "Llovizna",
  55: "Llovizna intensa",
  61: "Lluvia débil",
  63: "Lluvia",
  65: "Lluvia intensa",
  71: "Nieve débil",
  73: "Nieve",
  75: "Nieve intensa",
  80: "Chubascos débiles",
  81: "Chubascos",
  82: "Chubascos intensos",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta con granizo",
};

const WEATHER_CODE_EMOJI: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

let cache: { data: object; expiresAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 20; // 20 minutos

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-34.6&longitude=-58.38&current=temperature_2m,weather_code&timezone=America%2FArgentina%2FBuenos_Aires",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`open-meteo respondió ${res.status}`);

    const json = await res.json();
    const code: number = json.current?.weather_code;
    const data = {
      temperature: json.current?.temperature_2m ?? null,
      description: WEATHER_CODE_LABEL[code] ?? "—",
      emoji: WEATHER_CODE_EMOJI[code] ?? "",
    };

    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
