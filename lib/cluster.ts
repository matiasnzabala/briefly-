import type { RawArticle } from "./rss";
import type { Category } from "./mock-data";
import type { GeneratedEvent } from "./summarize";

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al",
  "a", "en", "y", "o", "que", "con", "por", "para", "su", "sus", "se", "es",
  "fue", "ser", "como", "más", "menos", "le", "lo", "no", "sí", "tras",
  "entre", "sobre", "ante", "hasta", "desde", "este", "esta", "estos",
  "estas", "tras", "qué", "según",
]);

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Deportes: [
    "river", "boca", "futbol", "fútbol", "gol", "goles", "partido",
    "partidos", "torneo", "seleccion", "selección", "mundial", "copa",
    "deportivo", "messi", "liga", "futbolista", "entrenador", "dt",
    "16avos", "octavos", "cuartos", "estadio", "cancha", "arquero",
    "tenis", "basquet", "básquet", "rugby", "boxeo", "juegos olimpicos",
    // portugués
    "futebol", "gols", "jogo", "jogos", "campeonato", "selecao", "seleção",
    "time", "treinador", "estadio",
    // italiano
    "calcio", "partita", "campionato", "squadra", "allenatore", "gara",
  ],
  Economía: [
    "inflacion", "inflación", "dolar", "dólar", "indec", "economia",
    "economía", "economico", "económico", "precios", "salarios", "fmi",
    "deuda", "pbi", "mercado", "banco central", "tasa", "impuesto",
    "presupuesto", "recesion", "recesión", "exportaciones", "importaciones",
    "rebajas", "consumo", "bolsa", "acciones", "bonos", "riesgo pais",
    "riesgo país", "tipo de cambio", "blue", "billete", "ahorro",
    "jubilacion", "jubilación", "ajuste fiscal", "subsidio", "subsidios",
    "tarifas", "combustible", "nafta", "cripto", "bitcoin",
    // portugués
    "inflação", "preços", "imposto", "orçamento", "divida", "dívida",
    "salario", "salário",
    // italiano
    "inflazione", "prezzi", "tasse", "bilancio", "debito", "stipendio",
    "economia",
  ],
  Política: [
    "gobierno", "presidente", "ministro", "ministra", "congreso", "senado",
    "diputados", "elecciones", "politico", "político", "politica",
    "política", "kirchner", "milei", "gabinete", "decreto", "justicia",
    "juez", "fiscal", "diputado", "senador",
    // portugués
    "governo", "presidente", "ministro", "congresso", "eleicoes",
    "eleições", "justica", "justiça",
    // italiano
    "governo", "presidente", "ministro", "elezioni", "parlamento",
    "giustizia",
  ],
  Tecnología: [
    "tecnologia", "tecnología", " ia ", "inteligencia artificial", "app",
    "aplicacion", "aplicación", "software", "hardware", "startup",
    "internet", "ciberseguridad", "hackeo", "hackers", "google", "meta",
    "openai", "microsoft", "apple", "amazon", "samsung", "smartphone",
    "celular", "iphone", "android", "robot", "robotica", "robótica",
    "chatgpt", "algoritmo", "datos", "nube", "cloud", "videojuego",
    "videojuegos", "gaming", "criptomoneda", "blockchain", "satelite",
    "satélite", "espacio", "nasa", "spacex", "drone", "dron",
    // portugués / italiano (en buena parte iguales o muy similares)
    "tecnologia", "inteligencia artificial", "celular",
  ],
  Negocios: [
    "empresa", "empresas", "inversion", "inversión", "negocio", "negocios",
    "exportacion", "exportación", "industria", "comercio", "pyme",
    "facturacion", "facturación", "empleo", "empleos", "fabrica", "fábrica",
    // portugués
    "empresa", "empresas", "investimento", "negocio", "negócios",
    "industria", "indústria", "emprego",
    // italiano
    "azienda", "aziende", "investimento", "industria", "lavoro",
  ],
};

const CATEGORY_PRIORITY: Category[] = [
  "Deportes",
  "Economía",
  "Tecnología",
  "Negocios",
  "Política",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return intersection / union;
}

function categorize(title: string): Category {
  const text = ` ${normalize(title)} `;
  const scores = CATEGORY_PRIORITY.map((category) => ({
    category,
    score: CATEGORY_KEYWORDS[category].filter((kw) => text.includes(kw))
      .length,
  }));

  const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
  return best.score > 0 ? best.category : "Política";
}

const SIMILARITY_THRESHOLD = 0.22;

// Agrupa solo dentro de cada país: dos artículos de países distintos nunca
// se fusionan en un mismo evento, aunque cubran la misma noticia mundial
// con titulares casi idénticos — si no, el evento le quedaba asignado a un
// solo país arbitrario (el que aparecía primero) y los demás desaparecían.
function clusterWithinCountry(articles: RawArticle[]): number[][] {
  const tokenized = articles.map((a) => tokenize(a.title));
  const used = new Array(articles.length).fill(false);
  const groups: number[][] = [];

  for (let i = 0; i < articles.length; i++) {
    if (used[i]) continue;
    const group = [i];
    used[i] = true;

    for (let j = i + 1; j < articles.length; j++) {
      if (used[j]) continue;
      if (jaccardSimilarity(tokenized[i], tokenized[j]) >= SIMILARITY_THRESHOLD) {
        group.push(j);
        used[j] = true;
      }
    }

    groups.push(group);
  }

  return groups;
}

export function clusterArticles(articles: RawArticle[]): GeneratedEvent[] {
  const byCountry = new Map<string, RawArticle[]>();
  for (const article of articles) {
    const list = byCountry.get(article.country) ?? [];
    list.push(article);
    byCountry.set(article.country, list);
  }

  const groupedArticles: RawArticle[][] = [];
  for (const countryArticles of byCountry.values()) {
    const groups = clusterWithinCountry(countryArticles);
    for (const idxs of groups) {
      groupedArticles.push(idxs.map((idx) => countryArticles[idx]));
    }
  }

  const events: GeneratedEvent[] = groupedArticles.map((groupArticles, i) => {
    const uniqueSources = Array.from(
      new Map(groupArticles.map((a) => [a.source, a])).values()
    );
    const headline = groupArticles[0].title;

    return {
      id: String(i + 1),
      country: groupArticles[0].country,
      category: categorize(headline),
      headline,
      summary:
        groupArticles[0].contentSnippet ??
        "Resumen no disponible (modo sin IA).",
      importance: Math.min(100, 40 + uniqueSources.length * 15),
      sourcesCount: uniqueSources.length,
      sources: uniqueSources.slice(0, 6).map((a) => ({
        name: a.source,
        url: a.link,
      })),
      publishedAt: groupArticles[0].publishedAt ?? new Date().toISOString(),
      imageUrl: groupArticles.find((a) => a.imageUrl)?.imageUrl,
    };
  });

  // Agrupar por país + categoría para que ningún país (ej. Argentina, con
  // más fuentes y por lo tanto scores más altos) le quite lugar a los demás.
  const byCountryCategory = new Map<string, GeneratedEvent[]>();
  for (const event of events) {
    const key = `${event.country}|${event.category}`;
    const list = byCountryCategory.get(key) ?? [];
    list.push(event);
    byCountryCategory.set(key, list);
  }

  const TOP_PER_GROUP = 20;
  const balanced = Array.from(byCountryCategory.values()).flatMap((list) =>
    list.sort((a, b) => b.importance - a.importance).slice(0, TOP_PER_GROUP)
  );

  return balanced.sort((a, b) => b.importance - a.importance);
}
