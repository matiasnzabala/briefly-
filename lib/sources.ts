export interface FeedSource {
  name: string;
  url: string;
  country: string;
  /**
   * Google News RSS items come back as "Headline - SourceName" with all
   * sources mixed into one feed. When true, the real outlet name is
   * parsed out of each title instead of using `name` as the source.
   */
  isGoogleNews?: boolean;
  /** Idioma de origen si NO es español, para traducir título y resumen. */
  lang?: "pt" | "it";
}

function googleNews(
  country: string,
  hl: string,
  gl: string,
  lang?: "pt" | "it"
): FeedSource {
  return {
    name: "Google News",
    url: `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`,
    country,
    isGoogleNews: true,
    lang,
  };
}

export const SOURCES: FeedSource[] = [
  // Argentina: fuentes directas ya validadas (más diversidad que Google News solo)
  {
    name: "La Nación",
    url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/",
    country: "AR",
  },
  {
    name: "Infobae",
    url: "https://www.infobae.com/arc/outboundfeeds/rss/",
    country: "AR",
  },
  {
    name: "Página 12",
    url: "https://www.pagina12.com.ar/rss/portada",
    country: "AR",
  },
  {
    name: "Ámbito",
    url: "https://www.ambito.com/contenidos/rss/home.xml",
    country: "AR",
  },
  {
    name: "El Cronista",
    url: "https://www.cronista.com/files/rss/news.xml",
    country: "AR",
  },
  {
    name: "Clarín Tecnología",
    url: "https://www.clarin.com/rss/tecnologia/",
    country: "AR",
  },
  googleNews("AR", "es-419", "AR"),

  // Resto de países: Google News por país (validado, sin XML roto ni 404)
  googleNews("BR", "pt-BR", "BR", "pt"),
  googleNews("ES", "es", "ES"),
  googleNews("MX", "es-419", "MX"),
  googleNews("CL", "es-419", "CL"),
  googleNews("VE", "es-419", "VE"),
  googleNews("US", "es-419", "US"),
  googleNews("IT", "it", "IT", "it"),
];
