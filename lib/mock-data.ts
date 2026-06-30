export type Category =
  | "Política"
  | "Economía"
  | "Deportes"
  | "Tecnología"
  | "Negocios";

export type Period = "today" | "week" | "month";

export interface NewsSource {
  name: string;
  url: string;
}

export interface BriefEvent {
  id: string;
  country: string;
  category: Category;
  headline: string;
  summary: string;
  importance: number; // 0-100
  sourcesCount: number;
  sources: NewsSource[];
  publishedAt: string;
}

export const COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "BR", name: "Brasil" },
  { code: "ES", name: "España" },
  { code: "MX", name: "México" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "US", name: "Estados Unidos" },
  { code: "IT", name: "Italia" },
];

export const CATEGORIES: Category[] = [
  "Política",
  "Economía",
  "Deportes",
  "Tecnología",
  "Negocios",
];

export const MOCK_EVENTS: BriefEvent[] = [
  {
    id: "1",
    country: "AR",
    category: "Deportes",
    headline: "River quedó líder del campeonato",
    summary:
      "River venció 2-0 a Independiente y se consolidó en la cima de la tabla a falta de tres fechas para el cierre del torneo.",
    importance: 92,
    sourcesCount: 14,
    sources: [
      { name: "La Nación", url: "#" },
      { name: "Olé", url: "#" },
      { name: "TyC Sports", url: "#" },
    ],
    publishedAt: "2026-06-30T09:00:00Z",
  },
  {
    id: "2",
    country: "AR",
    category: "Economía",
    headline: "La inflación de junio fue del 3,2%",
    summary:
      "El INDEC informó que el índice de precios al consumidor subió 3,2% en junio, por debajo de las expectativas del mercado.",
    importance: 97,
    sourcesCount: 22,
    sources: [
      { name: "Clarín", url: "#" },
      { name: "Ámbito", url: "#" },
      { name: "Infobae", url: "#" },
    ],
    publishedAt: "2026-06-30T08:30:00Z",
  },
  {
    id: "3",
    country: "AR",
    category: "Política",
    headline: "Se inauguró una nueva línea de subte en Buenos Aires",
    summary:
      "El gobierno porteño habilitó la extensión de la línea E, que conectará tres barrios del sur con el centro de la ciudad.",
    importance: 78,
    sourcesCount: 9,
    sources: [
      { name: "La Nación", url: "#" },
      { name: "Página 12", url: "#" },
    ],
    publishedAt: "2026-06-30T07:15:00Z",
  },
  {
    id: "4",
    country: "AR",
    category: "Tecnología",
    headline: "Una startup argentina de IA recibió inversión de USD 10M",
    summary:
      "La compañía, que desarrolla herramientas de automatización para pymes, cerró una ronda Serie A liderada por un fondo regional.",
    importance: 65,
    sourcesCount: 6,
    sources: [
      { name: "Infobae", url: "#" },
      { name: "iProUP", url: "#" },
    ],
    publishedAt: "2026-06-30T06:50:00Z",
  },
  {
    id: "5",
    country: "AR",
    category: "Negocios",
    headline: "Una cadena de supermercados anunció 500 nuevos empleos",
    summary:
      "La empresa abrirá 12 sucursales nuevas en el área metropolitana durante el segundo semestre del año.",
    importance: 58,
    sourcesCount: 5,
    sources: [{ name: "Ámbito", url: "#" }],
    publishedAt: "2026-06-30T06:00:00Z",
  },
];
