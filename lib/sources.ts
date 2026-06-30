export interface FeedSource {
  name: string;
  url: string;
  country: string;
}

export const SOURCES: FeedSource[] = [
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
];
