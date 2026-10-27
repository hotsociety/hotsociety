"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../_lib/supabase";
import { ROUTE } from "../../_lib/site";
import Icon, { type IconName } from "./Icon";
import { MemberContext, nomeDoUsuario, PODE, type Cargo, type Membro } from "./MemberContext";
import SemAcesso, { type Acesso } from "./SemAcesso";
import { ProgressoProvider, useProgresso } from "./Progresso";
import Toaster from "./Toast";
import HotPhone from "./hotphone/HotPhone";
import "./shell.css";
import "./proto.css";
import s from "./shell.styles";

type Item = { href: string; t: string; icon: IconName; badge?: string; soon?: boolean };
type Grupo = { g?: string; itens: Item[] };

// Menu no padrão do protótipo da área de membros. soon = aba que ainda vai ser construída.
export const GRUPOS: Grupo[] = [
  { itens: [{ href: "/dashboard", t: "Início", icon: "home" }] },
  {
    g: "Comunidade",
    itens: [
      { href: "/dashboard/feed", t: "Feed", icon: "feed" },
      { href: "/dashboard/missoes", t: "Missões", icon: "target" },
    ],
  },
  {
    g: "Conteúdo",
    itens: [
      { href: "/dashboard/area", t: "Área de Membros", icon: "grid" },
      { href: "/dashboard/aulas", t: "Módulos", icon: "modules" },
      { href: "/dashboard/ferramentas", t: "Ferramentas", icon: "tool" },
      { href: "/dashboard/cappuia", t: "Assistente CappuIA", icon: "bot" },
    ],
  },
  {
    g: "Conquistas",
    itens: [
      { href: "/dashboard/conquistas", t: "Gamificação", icon: "trophy" },
      { href: "/dashboard/jornada", t: "Prêmios", icon: "plaque" },
    ],
  },
  {
    g: "Extras",
    itens: [
      { href: "/dashboard/store", t: "Hot Store", icon: "bag" },
      { href: "/dashboard/games", t: "Games", icon: "pad" },
    ],
  },
  {
    g: "Grana",
    itens: [
      { href: "/dashboard/caixa", t: "Levantar Caixa", icon: "wallet" },
      { href: "/dashboard/afiliados", t: "Afiliados", icon: "affiliate" },
    ],
  },
  { g: "Acesso", itens: [{ href: "/dashboard/mentoria", t: "Minha Mentoria", icon: "mentor" }] },
  {
    g: "Conta",
    itens: [
      { href: "/dashboard/suporte", t: "Suporte", icon: "help" },
      { href: "/dashboard/perfil", t: "Perfil", icon: "user" },
    ],
  },
];
export const NAV: Item[] = GRUPOS.flatMap((g) => g.itens).filter((i) => !i.soon);

// Aba da equipe: só aparece para quem tem cargo (o banco confere de novo em cada ação).
const EQUIPE: Grupo = { g: "Equipe", itens: [{ href: "/dashboard/painel", t: "Painel da equipe", icon: "shield" }] };
function gruposDo(cargo: Cargo | null) {
  // Para a equipe, o painel fica logo abaixo de Início (fácil de achar).
  return PODE.verPainel(cargo) ? [GRUPOS[0], EQUIPE, ...GRUPOS.slice(1)] : GRUPOS;
}
function navDo(cargo: Cargo | null) {
  return gruposDo(cargo)
    .flatMap((g) => g.itens)
    .filter((i) => !i.soon);
}

// No celular, 4 atalhos fixos + "Mais".
const BOTTOM = ["/dashboard", "/dashboard/feed", "/dashboard/missoes", "/dashboard/aulas"];

function ativo(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export default function MemberShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mais, setMais] = useState(false);
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [tentativa, setTentativa] = useState(0);

  // Proteção da área: sem sessão volta para o login.
  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!vivo) return;
      if (!session) router.replace(`/login?callback=${encodeURIComponent(window.location.pathname)}`);
      else setUser(session.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
      else setUser(session.user);
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // Chegou pelo link de um afiliado? Registra a indicação (só a primeira vale; autoindicação não conta).
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    const ref = document.cookie.match(/(?:^|; )hs_ref=([a-z0-9-]{3,24})/)?.[1];
    if (ref) supabase.rpc("registrar_indicacao", { p_codigo: ref }).then(() => {});
  }, [uid]);

  // Assinatura ativa ou cargo da equipe? Quem decide é o banco (função meu_acesso).
  useEffect(() => {
    if (!uid) return;
    let vivo = true;
    supabase.rpc("meu_acesso").then(({ data, error }) => {
      if (!vivo) return;
      if (error) {
        // Função ainda não criada no Supabase: mantém o comportamento antigo (todos entram).
        const semFuncao = error.code === "PGRST202" || error.code === "42883";
        setAcesso(semFuncao ? { ativo: true, cargo: null } : { ativo: false, erro: true });
        return;
      }
      const d = data as { ativo: boolean; cargo: Cargo | null; status: string | null; valido_ate: string | null };
      setAcesso({ ativo: d.ativo, cargo: d.cargo, status: d.status, validoAte: d.valido_ate });
    });
    return () => {
      vivo = false;
    };
  }, [uid, tentativa]);

  useEffect(() => {
    document.body.style.overflow = mais ? "hidden" : "";
    if (!mais) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMais(false);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [mais]);

  const carregando = (
    <div className={s.loading}>
      <Image src="/brand/hs-simbolo.svg" alt="" width={64} height={64} className={s.pulse} />
      <p>Abrindo seu passaporte…</p>
    </div>
  );
  if (!user || !acesso) return carregando;
  if (!acesso.ativo) {
    return (
      <SemAcesso
        acesso={acesso}
        email={user.email ?? ""}
        onDeNovo={() => {
          setAcesso(null);
          setTentativa((n) => n + 1);
        }}
        onSair={async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        }}
      />
    );
  }

  const nome = nomeDoUsuario(user);
  const membro: Membro = {
    user,
    cargo: acesso.cargo ?? null,
    nome,
    iniciais: nome.slice(0, 2).toUpperCase(),
    sair: async () => {
      await supabase.auth.signOut();
      router.replace("/login");
    },
  };

  return (
    <MemberContext.Provider value={membro}>
      <ProgressoProvider user={user} fallback={carregando}>
        <Casca membro={membro} pathname={pathname} mais={mais} setMais={setMais}>
          {children}
        </Casca>
      </ProgressoProvider>
    </MemberContext.Provider>
  );
}

function Casca({
  membro,
  pathname,
  mais,
  setMais,
  children,
}: {
  membro: Membro;
  pathname: string;
  mais: boolean;
  setMais: (v: boolean) => void;
  children: ReactNode;
}) {
  const { perfil, nivel, temporadaFim } = useProgresso();
  const nome = membro.nome;
  const stop = ROUTE[perfil.stopAtual] ?? ROUTE[0];

  return (
    <>
      <div className={s.app}>
        {/* Barra lateral: ícones no tablet, completa no PC */}
        <aside className={s.side} aria-label="Menu da área de membros">
          <Link href="/dashboard" className={s.brand} aria-label="Início da área de membros">
            <Image src="/brand/hs-simbolo.svg" alt="" width={36} height={36} className={s.brandIcon} />
            <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} className={s.brandFull} />
          </Link>

          <Link href="/dashboard/perfil" className={s.me}>
            <span className={s.avatar}>{membro.iniciais}</span>
            <span className={s.meTxt}>
              <b>{nome}</b>
              <small>
                Nível {nivel} · {stop.country.toUpperCase()}
              </small>
            </span>
          </Link>

          <nav className={s.nav}>
            {gruposDo(membro.cargo).map((g, gi) => (
              <div key={g.g ?? gi} className={s.grp}>
                {g.g && <span className={s.grpT}>{g.g}</span>}
                {g.itens.map((i) =>
                  i.soon ? (
                    <span key={i.href} className={`${s.navItem} ${s.navSoon}`} title={`${i.t} · em breve`}>
                      <Icon name={i.icon} />
                      <span>{i.t}</span>
                      <em className={s.soonTag}>em breve</em>
                    </span>
                  ) : (
                    <Link
                      key={i.href}
                      href={i.href}
                      className={s.navItem}
                      aria-current={ativo(pathname, i.href) ? "page" : undefined}
                      title={i.t}
                    >
                      <Icon name={i.icon} />
                      <span>{i.t}</span>
                      {i.badge && <em className={s.badge}>{i.badge}</em>}
                    </Link>
                  ),
                )}
              </div>
            ))}
          </nav>

          <div className={s.season}>
            <small>Temporada fecha em</small>
            <b>{temporadaFim}</b>
          </div>

          <button type="button" className={s.navItem} onClick={membro.sair} title="Sair">
            <Icon name="out" />
            <span>Sair</span>
          </button>
        </aside>

        {/* Topo: celular e tablet */}
        <header className={s.top}>
          <Link href="/dashboard" className={s.topLogo} aria-label="Início da área de membros">
            <Image src="/brand/hs-logo.svg" alt="HOT SOCIETY" width={1253} height={170} />
          </Link>
          <div className={s.topRight}>
            <span className={s.xp}>
              <Icon name="fire" size={16} /> {perfil.streak}
            </span>
            <span className={s.xp}>
              {perfil.xp.toLocaleString("pt-BR")} XP
            </span>
            <Link href="/dashboard/perfil" className={s.avatarSm} aria-label="Meu perfil">
              {membro.iniciais}
            </Link>
          </div>
        </header>

        <main className={s.main} id="conteudo">
          {children}
        </main>
        <Toaster />
        {!pathname.startsWith("/dashboard/painel") && <HotPhone />}

        {/* Barra inferior: só celular */}
        <nav className={s.bottom} aria-label="Navegação principal">
          {NAV.filter((i) => BOTTOM.includes(i.href)).map((i) => (
            <Link key={i.href} href={i.href} aria-current={ativo(pathname, i.href) ? "page" : undefined}>
              <Icon name={i.icon} size={22} />
              <span>{i.t}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMais(true)}
            aria-expanded={mais}
            aria-current={!BOTTOM.some((h) => ativo(pathname, h)) ? "page" : undefined}
          >
            <Icon name="more" size={22} />
            <span>Mais</span>
          </button>
        </nav>

        {mais && (
          <div className={s.sheetWrap} role="dialog" aria-modal="true" aria-label="Mais opções">
            <button type="button" className={s.scrim} onClick={() => setMais(false)} aria-label="Fechar" />
            <div className={s.sheet}>
              <div className={s.sheetHead}>
                <b>Menu</b>
                <button type="button" onClick={() => setMais(false)} aria-label="Fechar menu">
                  <Icon name="close" />
                </button>
              </div>
              <div className={s.sheetGrid}>
                {navDo(membro.cargo).filter((i) => !BOTTOM.includes(i.href)).map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setMais(false)}
                    aria-current={ativo(pathname, i.href) ? "page" : undefined}
                  >
                    <Icon name={i.icon} size={24} />
                    <span>{i.t}</span>
                  </Link>
                ))}
                <button type="button" onClick={membro.sair}>
                  <Icon name="out" size={24} />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
