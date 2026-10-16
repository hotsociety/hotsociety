import type { NextConfig } from "next";

// Cabeçalhos de segurança enviados em todas as páginas.
const SEGURANCA = [
  // Só HTTPS, por 2 anos, incluindo subdomínios.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Ninguém pode colocar o site dentro de outro site (golpe de clique escondido).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  // O navegador não "adivinha" o tipo dos arquivos.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Outros sites não veem o endereço completo de onde o aluno veio.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Câmera, microfone e localização desligados.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SEGURANCA }];
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
