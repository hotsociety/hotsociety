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
  // Política completa em modo "só relatar": mostra no console o que seria bloqueado, sem quebrar nada.
  // Depois de uns dias sem avisos, troca a chave para "Content-Security-Policy" e passa a valer.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.hcaptcha.com https://open.spotify.com https://*.daily.co https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https://uadzgmdyoksdxyybgisl.supabase.co https://*.googleusercontent.com https://i.ytimg.com https://*.scdn.co https://*.spotifycdn.com https://*.pandavideo.com.br",
      "media-src 'self' blob: https://uadzgmdyoksdxyybgisl.supabase.co",
      "connect-src 'self' https://uadzgmdyoksdxyybgisl.supabase.co wss://uadzgmdyoksdxyybgisl.supabase.co https://api.pwnedpasswords.com https://challenges.cloudflare.com https://*.hcaptcha.com https://*.daily.co wss://*.daily.co https://open.spotify.com https://vitals.vercel-insights.com",
      "frame-src https://open.spotify.com https://challenges.cloudflare.com https://*.hcaptcha.com https://*.daily.co https://player.vimeo.com https://www.youtube.com https://www.youtube-nocookie.com https://*.tv.pandavideo.com.br https://player.pandavideo.com.br https://miro.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SEGURANCA },
      // Sala de vídeo da mentoria: libera câmera, microfone e compartilhar tela só nesta página (para o Daily).
      {
        source: "/dashboard/mentoria/sala/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=*, microphone=*, display-capture=*, fullscreen=*, geolocation=(), payment=(), usb=()" }],
      },
    ];
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
