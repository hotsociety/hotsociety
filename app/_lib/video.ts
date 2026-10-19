// Links de vídeo aceitos nas aulas e o endereço do player embutido.
// Aceita Panda Video, Vimeo e YouTube (não listado). Qualquer outro endereço é recusado.

export type AulaInfo = { aula_id: string; video_url: string | null; duracao: string | null; material: string | null };

export function embedDoVideo(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.toLowerCase();

  // Panda Video: https://player-vz-xxxx.tv.pandavideo.com.br/embed/?v=ID
  if (h.endsWith(".tv.pandavideo.com.br") || h === "player.pandavideo.com.br") {
    return u.pathname.startsWith("/embed") && u.searchParams.get("v") ? u.toString() : null;
  }
  // Vimeo: vimeo.com/123456 (opcional /hash) ou player.vimeo.com/video/123456?h=hash
  if (h === "vimeo.com" || h === "player.vimeo.com") {
    const m = u.pathname.match(/^\/(?:video\/)?(\d{5,12})(?:\/([0-9a-f]{6,20}))?\/?$/i);
    if (!m) return null;
    const hash = m[2] || u.searchParams.get("h");
    return `https://player.vimeo.com/video/${m[1]}?dnt=1${hash ? `&h=${encodeURIComponent(hash)}` : ""}`;
  }
  // YouTube: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
  let id: string | null = null;
  if (h === "youtu.be") id = u.pathname.slice(1);
  else if (h === "www.youtube.com" || h === "youtube.com" || h === "www.youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
  }
  if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  return null;
}

export const duracaoValida = (d: string) => /^\d{1,3}:[0-5]\d$/.test(d.trim());
