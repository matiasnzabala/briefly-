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

  // Brasil
  googleNews("BR", "pt-BR", "BR", "pt"),
  { name: "Folha de S.Paulo", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", country: "BR", lang: "pt" },
  { name: "G1 / Globo", url: "https://g1.globo.com/rss/g1/", country: "BR", lang: "pt" },

  // España
  googleNews("ES", "es", "ES"),
  { name: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", country: "ES" },
  { name: "El Mundo", url: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml", country: "ES" },

  // México
  googleNews("MX", "es-419", "MX"),
  { name: "El Universal", url: "https://www.eluniversal.com.mx/rss.xml", country: "MX" },
  { name: "Milenio", url: "https://www.milenio.com/rss", country: "MX" },

  // Chile
  googleNews("CL", "es-419", "CL"),
  { name: "La Tercera", url: "https://www.latercera.com/feed/", country: "CL" },
  { name: "El Mostrador", url: "https://www.elmostrador.cl/feed/", country: "CL" },

  // Venezuela
  googleNews("VE", "es-419", "VE"),
  { name: "El Nacional", url: "https://www.el-nacional.com/feed/", country: "VE" },
  { name: "Efecto Cocuyo", url: "https://efectococuyo.com/feed/", country: "VE" },

  // Estados Unidos (en español)
  googleNews("US", "es-419", "US"),
  { name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml", country: "US" },

  // Italia
  googleNews("IT", "it", "IT", "it"),
  { name: "Corriere della Sera", url: "https://xml2.corriereobjects.it/rss/homepage.xml", country: "IT", lang: "it" },
  { name: "La Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", country: "IT", lang: "it" },

  // Más países hispanohablantes
  googleNews("CO", "es-419", "CO"),
  googleNews("PE", "es-419", "PE"),
  googleNews("EC", "es-419", "EC"),
  googleNews("UY", "es-419", "UY"),
  googleNews("BO", "es-419", "BO"),
  googleNews("PY", "es-419", "PY"),
  googleNews("CU", "es-419", "CU"),
  googleNews("DO", "es-419", "DO"),
  googleNews("CR", "es-419", "CR"),
  googleNews("GT", "es-419", "GT"),

  // Europa adicional
  googleNews("FR", "fr", "FR", "it"),   // reutilizamos traducción para francés por ahora
  googleNews("DE", "de", "DE", "it"),
  googleNews("GB", "en-GB", "GB"),
  googleNews("PT", "pt-PT", "PT", "pt"),
  googleNews("CA", "en-CA", "CA"),

  // Otros
  googleNews("JP", "ja", "JP"),
  googleNews("IN", "en-IN", "IN"),
  googleNews("RU", "ru", "RU"),
  googleNews("CN", "zh-CN", "CN"),
  googleNews("IL", "iw", "IL"),
  googleNews("UA", "uk", "UA"),
];
