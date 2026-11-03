// SÓ SERVIDOR. Liberar alguém como mentorado (conta + aba Mentorados + acesso à plataforma + e-mail).
// Usado no Painel → Mentoria → "Importar quem já é mentorado" e, sozinho, quando um link de pagamento da mentoria é pago.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL, enviarEmail, esc, moldura } from "./email";

export const ACESSO_MENTORIA_DIAS = 365; // quem paga a mentoria ganha 1 ano de plataforma
const MOTIVO = "Mentorado";

export type Liberacao = {
  email: string;
  nome?: string | null;
  turma?: string | null; // undefined = turma ativa mais recente
  acessoDias?: number | null | "nao"; // null = sem prazo · "nao" = não mexe no acesso
  avisar?: boolean;
  quem?: string | null; // quem liberou (auditoria); vazio = automático (pagamento)
  origem?: string; // texto da auditoria/motivo
};
export type ResultadoLiberacao = { email: string; status: "liberado" | "conta_criada" | "erro"; detalhe?: string; user_id?: string };

export async function turmaAtual(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.from("mentoria_turmas").select("id").eq("ativa", true).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function liberarMentorado(sb: SupabaseClient, o: Liberacao): Promise<ResultadoLiberacao> {
  const email = o.email.trim().toLowerCase();
  const nome = (o.nome ?? "").trim().slice(0, 80);
  try {
    // 1) Conta: cria já confirmada; se o e-mail já tem conta, usa a existente.
    let nova = false;
    const criada = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: nome ? { full_name: nome } : undefined });
    if (!criada.error && criada.data.user) nova = true;
    else if (criada.error && !/already|registered|exists/i.test(criada.error.message)) throw new Error("não deu para criar a conta");

    // O link de entrada também devolve a conta (serve para achar o id de quem já existe).
    const base = new URL(SITE_URL).origin;
    const link = await sb.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${base}/redefinir-senha` } });
    const user = link.data?.user;
    if (!user) throw new Error("conta não encontrada");
    const nuncaEntrou = nova || !user.last_sign_in_at;

    // 2) Aba Mentorados (ativo). Quem já está numa turma continua nela se não vier turma nova.
    const turma = o.turma === undefined ? await turmaAtual(sb) : o.turma;
    const { data: antes } = await sb.from("mentorados").select("turma_id").eq("user_id", user.id).maybeSingle();
    const { error: em } = await sb
      .from("mentorados")
      .upsert({ user_id: user.id, turma_id: o.turma === undefined && antes?.turma_id ? antes.turma_id : turma, ativo: true }, { onConflict: "user_id" });
    if (em) throw new Error("não deu para salvar o mentorado");

    // 3) Entrada na plataforma, sem encurtar quem já tem acesso maior.
    const dias = o.acessoDias === undefined ? ACESSO_MENTORIA_DIAS : o.acessoDias;
    let equipe = false;
    if (dias !== "nao") {
      const [{ data: p }, { data: a }] = await Promise.all([
        sb.from("perfis").select("cargo").eq("id", user.id).maybeSingle(),
        sb.from("acessos").select("status, valido_ate").eq("user_id", user.id).maybeSingle(),
      ]);
      equipe = !!p?.cargo;
      const ate = dias ? new Date(Date.now() + Math.min(dias, 3650) * 864e5) : null;
      const atual = a && a.status === "ativo" ? (a.valido_ate ? new Date(a.valido_ate) : "sempre") : null;
      const jaCobre = atual === "sempre" || (atual instanceof Date && ate !== null && atual >= ate);
      if (!equipe && !jaCobre) {
        const { error: ea } = await sb.from("acessos").upsert(
          {
            user_id: user.id,
            status: "ativo",
            origem: "manual",
            plano: "mentoria",
            valido_ate: ate?.toISOString() ?? null,
            motivo: `${MOTIVO} · ${o.origem ?? "importado no painel"}`.slice(0, 300),
            atualizado_por: o.quem ?? null,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        if (ea) throw new Error("mentorado salvo, mas o acesso à plataforma falhou");
      }
    }

    await sb.from("auditoria").insert({
      quem: o.quem ?? null,
      acao: o.quem ? "importar_mentorado" : "mentorado_pagamento",
      alvo: email,
      detalhes: { turma, conta_nova: nova, acesso_dias: dias, origem: o.origem ?? null },
    });

    // 4) E-mail: quem nunca entrou recebe o link para criar a senha; quem já usa a plataforma, só o aviso.
    let detalhe = "";
    if (o.avisar !== false) {
      const primeiro = (nome || (user.user_metadata as { full_name?: string } | undefined)?.full_name || "").split(" ")[0];
      const ola = `<p>Olá${primeiro ? ", " + esc(primeiro) : ""}!</p>`;
      const acao = link.data?.properties?.action_link;
      const enviado = await enviarEmail({
        para: email,
        assunto: "Sua Mentoria está liberada · HOT SOCIETY",
        chave: `mentorado-${user.id}-${new Date().toISOString().slice(0, 10)}`,
        html:
          nuncaEntrou && acao
            ? moldura(
                "Sua Mentoria está liberada",
                `${ola}<p>Você já faz parte da Mentoria HOT SOCIETY e agora tem a sua área na plataforma: encontros ao vivo, gravações, chat da turma e conversa direta com o mentor.</p><p>Toque no botão para criar a sua senha e entrar. O link vale por 1 hora; depois disso, use "Esqueci a senha" no login com este e-mail.</p><p>Na plataforma, abra <b>Minha Mentoria</b> no menu.</p>`,
                { t: "Criar senha e entrar", href: acao },
              )
            : moldura(
                "Sua Mentoria está liberada",
                `${ola}<p>A área <b>Minha Mentoria</b> já está liberada na sua conta: encontros ao vivo, gravações, chat da turma e conversa direta com o mentor.</p><p>Entre com o seu e-mail e senha de sempre.</p>`,
                { t: "Abrir Minha Mentoria", href: `${base}/dashboard/mentoria` },
              ),
      });
      if (!enviado) detalhe = "e-mail não saiu";
    }
    if (equipe) detalhe = [detalhe, "é da equipe (acesso pelo cargo)"].filter(Boolean).join(" · ");
    return { email, status: nova ? "conta_criada" : "liberado", detalhe: detalhe || undefined, user_id: user.id };
  } catch (e) {
    return { email, status: "erro", detalhe: e instanceof Error ? e.message : "falhou" };
  }
}

// Link de pagamento da mentoria pago → lead vira mentorado (e a aplicação fica "aprovado").
export async function mentoradoDoPagamento(sb: SupabaseClient, linkId: string) {
  const { data: l } = await sb
    .from("mentoria_links")
    .select("id, aplicacao_id, lead_nome, pagador_email, pagador_nome")
    .eq("id", linkId)
    .maybeSingle<{ id: string; aplicacao_id: string | null; lead_nome: string | null; pagador_email: string | null; pagador_nome: string | null }>();
  if (!l) return null;
  let email = l.pagador_email;
  if (l.aplicacao_id) {
    const { data: ap } = await sb.from("mentoria_aplicacoes").select("email").eq("id", l.aplicacao_id).maybeSingle<{ email: string | null }>();
    email = email || ap?.email || null;
    await sb.from("mentoria_aplicacoes").update({ status: "aprovado" }).eq("id", l.aplicacao_id);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.endsWith("@hotsociety.com.br")) {
    console.error(`mentoria ${l.id}: pago sem e-mail do lead; libere em Painel → Mentoria → Mentorados`);
    return null;
  }
  const r = await liberarMentorado(sb, { email, nome: l.pagador_nome ?? l.lead_nome, origem: `pagamento ${l.id.slice(0, 8)}` });
  if (r.status === "erro") console.error(`mentoria ${l.id}: liberar mentorado falhou: ${r.detalhe}`);
  return r;
}

// Reembolso/contestação → sai da aba Mentorados e perde o acesso que veio da mentoria (não mexe em assinatura comprada).
export async function mentoradoReembolso(sb: SupabaseClient, linkId: string) {
  const { data: l } = await sb.from("mentoria_links").select("id, pagador_email").eq("id", linkId).maybeSingle<{ id: string; pagador_email: string | null }>();
  if (!l?.pagador_email) return;
  const { data: link } = await sb.auth.admin.generateLink({ type: "recovery", email: l.pagador_email });
  const uid = link?.user?.id;
  if (!uid) return;
  await sb.from("mentorados").update({ ativo: false }).eq("user_id", uid);
  await sb.from("acessos").update({ status: "bloqueado", motivo: `Mentoria reembolsada · ${l.id.slice(0, 8)}`, atualizado_em: new Date().toISOString() })
    .eq("user_id", uid).eq("origem", "manual").eq("plano", "mentoria");
  await sb.from("auditoria").insert({ quem: null, acao: "mentorado_reembolso", alvo: l.pagador_email, detalhes: { link: l.id } });
}
