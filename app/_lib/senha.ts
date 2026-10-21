// Checagem de senha antes de criar conta ou trocar senha.
// Senhas vazadas: consulta a base pública do Have I Been Pwned pelo método "k-anonymity".
// Só os 5 primeiros caracteres do SHA-1 da senha saem do navegador; a senha em si nunca é enviada.
// Se a consulta falhar (sem internet, serviço fora), deixa passar para não travar o cadastro.

async function sha1Hex(texto: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export async function senhaVazada(senha: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(senha);
    const prefixo = hash.slice(0, 5);
    const resto = hash.slice(5);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      headers: { "Add-Padding": "true" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!r.ok) return false;
    const corpo = await r.text();
    return corpo.split("\n").some((linha) => {
      const [h, n] = linha.trim().split(":");
      return h === resto && Number(n) > 0;
    });
  } catch {
    return false;
  }
}

// Devolve a mensagem de erro, ou null se a senha estiver boa.
export async function problemaNaSenha(senha: string): Promise<string | null> {
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (await senhaVazada(senha)) return "Essa senha já apareceu em vazamentos na internet. Escolha outra, mais difícil de adivinhar.";
  return null;
}
