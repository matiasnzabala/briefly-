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

const cache = new Map<string, { data: object; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 20; // 20 minutos

const DEFAULT_LAT = -34.6;
const DEFAULT_LON = -58.38;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = Number(searchParams.get("lat"));
  const lonParam = Number(searchParams.get("lon"));
  const lat = Number.isFinite(latParam) ? latParam : DEFAULT_LAT;
  const lon = Number.isFinite(lonParam) ? lonParam : DEFAULT_LON;

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,weather_code" +
      "&timezone=auto&forecast_days=7",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`open-meteo respondió ${res.status}`);

    const json = await res.json();
    const cur = json.current ?? {};
    const daily = json.daily ?? {};
    const code: number = cur.weather_code;

    const data = {
      temperature: cur.temperature_2m ?? null,
      description: WEATHER_CODE_LABEL[code] ?? "—",
      emoji: WEATHER_CODE_EMOJI[code] ?? "",
      feelsLike: cur.apparent_temperature ?? null,
      humidity: cur.relative_humidity_2m ?? null,
      windSpeed: cur.wind_speed_10m ?? null,
      windDir: cur.wind_direction_10m ?? null,
      precipitation: cur.precipitation ?? null,
      tempMax: daily.temperature_2m_max?.[0] ?? null,
      tempMin: daily.temperature_2m_min?.[0] ?? null,
      precipSum: daily.precipitation_sum?.[0] ?? null,
      uvIndex: daily.uv_index_max?.[0] ?? null,
      forecast: (daily.time ?? []).map((date: string, i: number) => ({
        date,
        tempMax: daily.temperature_2m_max?.[i] ?? null,
        tempMin: daily.temperature_2m_min?.[i] ?? null,
        precipSum: daily.precipitation_sum?.[i] ?? null,
        emoji: WEATHER_CODE_EMOJI[daily.weather_code?.[i]] ?? "—",
        description: WEATHER_CODE_LABEL[daily.weather_code?.[i]] ?? "—",
      })),
    };

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
