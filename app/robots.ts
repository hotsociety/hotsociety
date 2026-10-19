import type { MetadataRoute } from "next";

// Buscadores: só as páginas públicas. Área de membros, painel e APIs ficam fora.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/assinar", "/redefinir-senha", "/login"] }],
    sitemap: "https://hotsociety.com.br/sitemap.xml",
  };
}
