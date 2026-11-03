"use client";

// Painel → Alunos → Localizar aluno: digita e-mail, nome ou telefone, escolhe a conta e vê a ficha completa.
import { useEffect, useRef, useState } from "react";
import { NOME_CARGO, PODE, useMembro } from "../../../_components/membros/MemberContext";
import { toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";
import { ACESSO, METODO, STATUS_VENDA, data, dataHora, erroAmigavel, reais, type Aluno, type StatusVenda } from "../../../_lib/painel";
import MudarAcesso, { type Acao } from "./MudarAcesso";

type Compra = { criado_em: string; produto: string; plano: string | null; valor: number; metodo: string | null; status: StatusVenda; plataforma: string };
type Ficha = {
  id: string;
  email: string;
  email_confirmado: boolean;
  criado_em: string;
  ultimo_login: string | null;
  entra_com: string;
  nome: string | null;
  telefone: string | null;
  cargo: Aluno["cargo"];
  xp: number;
  coins: number;
  streak: number;
  escala: string | null;
  faturado: number;
  acesso: Aluno["acesso"];
  acesso_origem: string | null;
  acesso_plano: string | null;
  valido_ate: string | null;
  acesso_motivo: string | null;
  aulas_feitas: number;
  ultima_aula: string | null;
  compras: Compra[];
  pedidos_abertos: number;
};

const ENTRA_COM: Record<string, string> = { email: "E-mail e senha", google: "Google" };

export default function LocalizarAluno() {
  const { cargo, user } = useMembro();
  const [busca, setBusca] = useState("");
  const [res, setRes] = useState<Aluno[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [carregandoFicha, setCarregandoFicha] = useState(false);
  const [acao, setAcao] = useState<Acao | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const termo = busca.trim();

  useEffect(() => campo.current?.focus(), []);

  // Busca enquanto digita (a partir de 2 letras), com uma pausa curta para não pesar.
  useEffect(() => {
    if (termo.length < 2) {
      setRes(null);
      setErro("");
      return;
    }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(() => {
      supabase.rpc("painel_alunos", { p_busca: termo.slice(0, 80), p_limite: 20 }).then(({ data, error }) => {
        if (!vivo) return;
        setBuscando(false);
        setErro(error ? erroAmigavel(error) : "");
        const lista = (data ?? []) as Aluno[];
        setRes(lista);
        // E-mail exato: já abre a ficha.
        if (lista.length && lista[0].email.toLowerCase() === termo.toLowerCase()) setSel(lista[0].id);
      });
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [termo]);

  function carregarFicha(id: string) {
    setCarregandoFicha(true);
    supabase.rpc("painel_aluno_ficha", { p_user: id }).then(({ data, error }) => {
      setCarregandoFicha(false);
      if (error) {
        setFicha(null);
        return toast(erroAmigavel(error));
      }
      setFicha(data as Ficha);
    });
  }
  useEffect(() => {
    if (sel) carregarFicha(sel);
    else setFicha(null);
  }, [sel]);

  async function copiar(t: string) {
    try {
      await navigator.clipboard.writeText(t);
      toast("Copiado");
    } catch {}
  }

  const podeMudar = PODE.mudarAcesso(cargo);
  const zap = ficha?.telefone?.replace(/\D/g, "");

  return (
    <div className="hs-pn-loc">
      <div className="hs-pn-loc-busca">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={campo}
          type="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setSel(null);
          }}
          placeholder="Digite o e-mail, o nome ou o telefone do aluno"
          aria-label="Localizar aluno"
          autoComplete="off"
          spellCheck={false}
        />
        {buscando && <span className="hs-pn-loc-sp" aria-hidden="true" />}
      </div>
      {erro && <p className="hs-pn-erro">{erro}</p>}

      {termo.length < 2 ? (
        <p className="hs-pn-vazio">Digite pelo menos 2 letras. Dá para buscar por parte do e-mail (ex.: “joao@”), do nome ou pelo telefone com DDD.</p>
      ) : res && res.length === 0 && !buscando ? (
        <p className="hs-pn-vazio">Nenhuma conta com “{termo}”. Confira a grafia ou tente só uma parte do e-mail.</p>
      ) : (
        <div className="hs-pn-loc-grid">
          <ul className="hs-pn-loc-lista" aria-label="Contas encontradas">
            {res?.map((a) => (
              <li key={a.id}>
                <button type="button" aria-pressed={sel === a.id} onClick={() => setSel(a.id)}>
                  <span className="hs-pn-av" aria-hidden="true">
                    {(a.nome || a.email)[0]?.toUpperCase()}
                  </span>
                  <span className="tx">
                    <b>{a.nome || "Sem nome"}</b>
                    <small>{a.email}</small>
                  </span>
                  <span className={"hs-pn-st " + (a.acesso === "sem acesso" ? "sem" : a.acesso)}>{a.cargo ? ACESSO.equipe : ACESSO[a.acesso]}</span>
                </button>
              </li>
            ))}
            {res && res.length === 20 && <li className="hs-pn-nota">Mostrando as 20 primeiras. Digite mais para afinar.</li>}
          </ul>

          <section className="hs-pn-loc-ficha" aria-live="polite">
            {!sel ? (
              <p className="hs-pn-vazio">{res?.length ? "Escolha uma conta na lista para ver a ficha." : "Buscando…"}</p>
            ) : carregandoFicha && !ficha ? (
              <p className="hs-pn-vazio">Abrindo a ficha…</p>
            ) : ficha ? (
              <>
                <header className="hs-pn-loc-cab">
                  <span className="hs-pn-av g" aria-hidden="true">
                    {(ficha.nome || ficha.email)[0]?.toUpperCase()}
                  </span>
                  <div>
                    <h3>{ficha.nome || "Sem nome"}</h3>
                    <button type="button" className="hs-pn-link" onClick={() => copiar(ficha.email)} title="Copiar e-mail">
                      {ficha.email}
                    </button>
                    <div className="hs-pn-loc-tags">
                      <span className={"hs-pn-st " + (ficha.acesso === "sem acesso" ? "sem" : ficha.acesso)}>
                        {ficha.cargo ? `${ACESSO.equipe} · ${NOME_CARGO[ficha.cargo]}` : ACESSO[ficha.acesso]}
                      </span>
                      {!ficha.email_confirmado && <span className="hs-pn-pill off">E-mail não confirmado</span>}
                      {ficha.pedidos_abertos > 0 && <span className="hs-pn-pill wait">Pagamento gerado, aguardando</span>}
                    </div>
                  </div>
                </header>

                <dl className="hs-pn-loc-dados">
                  <div>
                    <dt>Acesso</dt>
                    <dd>
                      {ficha.cargo
                        ? "Pelo cargo"
                        : ficha.valido_ate
                          ? `${ficha.acesso === "vencido" ? "Venceu" : "Até"} ${data(ficha.valido_ate)}`
                          : ficha.acesso === "ativo"
                            ? "Sem prazo"
                            : "—"}
                      {ficha.acesso_plano && <small>Plano {ficha.acesso_plano} · {ficha.acesso_origem === "manual" ? "liberado pela equipe" : "venda"}</small>}
                      {ficha.acesso_motivo && <small>{ficha.acesso_motivo}</small>}
                    </dd>
                  </div>
                  <div>
                    <dt>Conta criada</dt>
                    <dd>{dataHora(ficha.criado_em)}</dd>
                  </div>
                  <div>
                    <dt>Último login</dt>
                    <dd>
                      {ficha.ultimo_login ? dataHora(ficha.ultimo_login) : "Nunca entrou"}
                      <small>{ENTRA_COM[ficha.entra_com] ?? ficha.entra_com}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>
                      {ficha.telefone || "—"}
                      {zap && zap.length >= 10 && (
                        <a className="hs-pn-link" href={`https://wa.me/${zap.length <= 11 ? "55" + zap : zap}`} target="_blank" rel="noopener noreferrer">
                          Abrir conversa
                        </a>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Progresso</dt>
                    <dd>
                      {ficha.aulas_feitas} {ficha.aulas_feitas === 1 ? "aula vista" : "aulas vistas"}
                      <small>{ficha.ultima_aula ? `Última em ${data(ficha.ultima_aula)}` : "Ainda não assistiu"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Gamificação</dt>
                    <dd>
                      {ficha.xp.toLocaleString("pt-BR")} XP · {ficha.coins.toLocaleString("pt-BR")} coins
                      <small>
                        {ficha.streak} {ficha.streak === 1 ? "dia seguido" : "dias seguidos"}
                        {ficha.escala ? ` · escala ${ficha.escala}` : ""}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Faturado verificado</dt>
                    <dd>{reais(ficha.faturado)}</dd>
                  </div>
                </dl>

                <h4 className="hs-pn-loc-sub">Compras ({ficha.compras.length})</h4>
                {ficha.compras.length === 0 ? (
                  <p className="hs-pn-nota">Nenhuma compra registrada para esta conta ou e-mail.</p>
                ) : (
                  <ul className="hs-pn-loc-compras">
                    {ficha.compras.map((c, i) => (
                      <li key={i}>
                        <span>
                          <b>{c.produto}</b>
                          <small>
                            {dataHora(c.criado_em)} · {c.metodo ? (METODO[c.metodo] ?? c.metodo) : c.plataforma}
                          </small>
                        </span>
                        <span className="v">
                          {reais(c.valor)}
                          <span className={"hs-pn-st " + c.status}>{STATUS_VENDA[c.status] ?? c.status}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {podeMudar && !ficha.cargo && ficha.id !== user.id && (
                  <div className="hs-pn-bar">
                    {ficha.acesso !== "ativo" && (
                      <button type="button" className="hs-pn-btn hs-pn-btn-p" onClick={() => setAcao({ aluno: { id: ficha.id, email: ficha.email }, tipo: "ativo" })}>
                        Liberar acesso
                      </button>
                    )}
                    {ficha.acesso !== "bloqueado" && ficha.acesso !== "sem acesso" && (
                      <button type="button" className="hs-pn-btn hs-pn-btn-d" onClick={() => setAcao({ aluno: { id: ficha.id, email: ficha.email }, tipo: "bloqueado" })}>
                        Bloquear acesso
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      )}

      {acao && (
        <MudarAcesso
          acao={acao}
          onClose={() => setAcao(null)}
          onFeito={() => {
            setAcao(null);
            if (sel) carregarFicha(sel);
          }}
        />
      )}
    </div>
  );
}
