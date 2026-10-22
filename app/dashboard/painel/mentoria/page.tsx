"use client";

import { useEffect, useState } from "react";
import MentoriaChat from "../../../_components/membros/MentoriaChat";
import { PODE, useMembro } from "../../../_components/membros/MemberContext";
import { Modal, toast } from "../../../_components/membros/Toast";
import { data, dataHora, erroAmigavel } from "../../../_lib/painel";
import { supabase } from "../../../_lib/supabase";

type Turma = { id: string; nome: string; inicio: string | null; ativa: boolean; qtd: number };
type Mentorado = { user_id: string; email: string; nome: string; turma_id: string | null; ativo: boolean; desde: string };
type Encontro = {
  id: string;
  titulo: string;
  inicio: string;
  duracao_min: number;
  turma_id: string | null;
  turma: string | null;
  mentorado_id: string | null;
  mentorado: string | null;
  gravacao_url: string | null;
};
type Conversa = { conversa: string; nome: string; email: string; ultima: string; ultima_em: string; do_mentor: boolean };
type Dados = { turmas: Turma[]; mentorados: Mentorado[]; encontros: Encontro[]; conversas: Conversa[] };

const H2 = { margin: "8px 0 0", font: "800 18px/1.2 var(--f-d)" } as const;
const TZ = "America/Sao_Paulo";
// Data e hora de Brasília (sem horário de verão) para ISO.
const paraIso = (d: string, h: string) => `${d}T${h}:00-03:00`;
const partes = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((a, x) => ((a[x.type] = x.value), a), {});
  return { d: `${p.year}-${p.month}-${p.day}`, h: `${p.hour}:${p.minute}` };
};
const aberta = (e: Encontro) => {
  const ini = new Date(e.inicio).getTime();
  return Date.now() >= ini - 3600e3 && Date.now() <= ini + e.duracao_min * 60e3 + 3600e3;
};

// Mentoria High Ticket: turmas, mentorados, encontros (sala de vídeo) e conversas. Só Admin (mentor).
export default function PainelMentoria() {
  const { cargo } = useMembro();
  const pode = PODE.darCargo(cargo);
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [n, setN] = useState(0);
  const [editT, setEditT] = useState<Turma | "novo" | null>(null);
  const [editM, setEditM] = useState<Mentorado | "novo" | null>(null);
  const [editE, setEditE] = useState<Encontro | "novo" | null>(null);
  const [conversa, setConversa] = useState<{ id: string; titulo: string } | null>(null);
  const recarregar = () => setN((x) => x + 1);

  useEffect(() => {
    if (!pode) return;
    let vivo = true;
    supabase.rpc("painel_mentoria").then(({ data, error }) => {
      if (!vivo) return;
      if (error) setErro(erroAmigavel(error));
      setD((data as Dados) ?? { turmas: [], mentorados: [], encontros: [], conversas: [] });
    });
    return () => {
      vivo = false;
    };
  }, [n, pode]);

  if (!pode) return <p className="hs-pn-nota">Só o Admin (mentor) gerencia a mentoria.</p>;

  const turmaNome = (id: string | null) => d?.turmas.find((t) => t.id === id)?.nome ?? "Sem turma";
  const futuros = d?.encontros.filter((e) => new Date(e.inicio).getTime() + e.duracao_min * 60e3 + 3600e3 >= Date.now()) ?? [];
  const passados = d?.encontros.filter((e) => !futuros.includes(e)).reverse() ?? [];

  async function apagarEncontro(e: Encontro) {
    if (!window.confirm(`Apagar o encontro "${e.titulo}"?`)) return;
    const { error } = await supabase.rpc("mentoria_apagar_encontro", { p_id: e.id });
    if (error) return toast(erroAmigavel(error));
    toast("Encontro apagado");
    recarregar();
  }

  async function tirar(mt: Mentorado) {
    const { error } = await supabase.rpc("mentoria_definir_mentorado", { p_email: mt.email, p_turma: mt.turma_id, p_ativo: !mt.ativo });
    if (error) return toast(erroAmigavel(error));
    toast(mt.ativo ? "Acesso à mentoria retirado" : "Acesso à mentoria liberado");
    recarregar();
  }

  const tabelaEncontros = (lista: Encontro[], passado: boolean) => (
    <div className="hs-pn-tw">
      <table className="hs-pn-t" style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th>Encontro</th>
            <th>Para</th>
            <th>Quando</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {lista.map((e) => (
            <tr key={e.id}>
              <td>
                <b>{e.titulo}</b>
                <small>
                  {e.duracao_min} min{e.gravacao_url ? " · com gravação" : passado ? " · sem gravação" : ""}
                </small>
              </td>
              <td style={{ overflowWrap: "anywhere" }}>
                {e.turma_id ? <>Turma {e.turma}</> : <>1:1 · {e.mentorado}</>}
              </td>
              <td className="nw">{dataHora(e.inicio)}</td>
              <td>
                <div className="hs-pn-acts">
                  {!passado && aberta(e) && (
                    <a className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" href={`/dashboard/mentoria/sala/${e.id}`}>
                      Entrar
                    </a>
                  )}
                  <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEditE(e)}>
                    {passado ? "Gravação" : "Editar"}
                  </button>
                  <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => apagarEncontro(e)}>
                    Apagar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lista.length === 0 && <p className="hs-pn-vazio">{passado ? "Nenhum encontro nos últimos 60 dias." : "Nenhum encontro marcado."}</p>}
    </div>
  );

  return (
    <>
      {erro && <p className="hs-pn-erro">{erro}</p>}
      {!d && <p className="hs-pn-vazio">Carregando…</p>}

      {d && (
        <>
          <div className="hs-pn-bar" style={{ justifyContent: "space-between" }}>
            <h2 style={H2}>Próximos encontros</h2>
            <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" onClick={() => setEditE("novo")} disabled={!d.turmas.length && !d.mentorados.length}>
              Marcar encontro
            </button>
          </div>
          {tabelaEncontros(futuros, false)}
          <p className="hs-pn-nota">A sala de vídeo abre aqui dentro da plataforma: para o mentor 1 h antes, para os alunos 15 min antes.</p>

          <div className="hs-pn-bar" style={{ justifyContent: "space-between" }}>
            <h2 style={H2}>Conversas privadas</h2>
          </div>
          <div className="hs-pn-tw">
            <table className="hs-pn-t">
              <thead>
                <tr>
                  <th>Mentorado</th>
                  <th>Última mensagem</th>
                  <th>Quando</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.conversas.map((c) => (
                  <tr key={c.conversa}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <b>{c.nome}</b>
                      <small>{c.email}</small>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      {!c.do_mentor && <span className="hs-pn-st pendente">Aguardando resposta</span>} {c.ultima}
                    </td>
                    <td className="nw">{dataHora(c.ultima_em)}</td>
                    <td>
                      <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setConversa({ id: c.conversa, titulo: `${c.nome} · ${c.email}` })}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.conversas.length === 0 && <p className="hs-pn-vazio">Nenhum mentorado mandou mensagem ainda.</p>}
          </div>

          <div className="hs-pn-bar" style={{ justifyContent: "space-between" }}>
            <h2 style={H2}>Mentorados</h2>
            <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" onClick={() => setEditM("novo")}>
              Liberar mentorado
            </button>
          </div>
          <div className="hs-pn-tw">
            <table className="hs-pn-t">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.mentorados.map((mt) => (
                  <tr key={mt.user_id}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <b>{mt.nome}</b>
                      <small>
                        {mt.email} · desde {data(mt.desde)}
                      </small>
                    </td>
                    <td>{turmaNome(mt.turma_id)}</td>
                    <td>
                      <span className={"hs-pn-st " + (mt.ativo ? "ativo" : "sem")}>{mt.ativo ? "Ativo" : "Sem acesso"}</span>
                    </td>
                    <td>
                      <div className="hs-pn-acts">
                        <button
                          type="button"
                          className="hs-pn-btn hs-pn-btn-sm"
                          onClick={() => setConversa({ id: `dm:${mt.user_id}`, titulo: `${mt.nome} · ${mt.email}` })}
                        >
                          Conversa
                        </button>
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEditM(mt)}>
                          Turma
                        </button>
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => tirar(mt)}>
                          {mt.ativo ? "Tirar acesso" : "Liberar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.mentorados.length === 0 && <p className="hs-pn-vazio">Ninguém liberado ainda. A pessoa precisa ter conta no site.</p>}
          </div>

          <div className="hs-pn-bar" style={{ justifyContent: "space-between" }}>
            <h2 style={H2}>Turmas</h2>
            <button type="button" className="hs-pn-btn hs-pn-btn-p hs-pn-btn-sm" onClick={() => setEditT("novo")}>
              Criar turma
            </button>
          </div>
          <div className="hs-pn-tw">
            <table className="hs-pn-t">
              <thead>
                <tr>
                  <th>Turma</th>
                  <th className="n">Mentorados</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.turmas.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <b>{t.nome}</b>
                      {t.inicio && <small>Início {data(t.inicio + "T12:00:00-03:00")}</small>}
                    </td>
                    <td className="n">{t.qtd}</td>
                    <td>
                      <span className={"hs-pn-st " + (t.ativa ? "ativo" : "sem")}>{t.ativa ? "Ativa" : "Encerrada"}</span>
                    </td>
                    <td>
                      <div className="hs-pn-acts">
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setConversa({ id: `turma:${t.id}`, titulo: `Chat da turma · ${t.nome}` })}>
                          Chat
                        </button>
                        <button type="button" className="hs-pn-btn hs-pn-btn-sm" onClick={() => setEditT(t)}>
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.turmas.length === 0 && <p className="hs-pn-vazio">Crie a primeira turma para liberar mentorados e marcar encontros em grupo.</p>}
          </div>

          <h2 style={H2}>Encontros anteriores</h2>
          {tabelaEncontros(passados, true)}
          <p className="hs-pn-nota">Para a gravação aparecer para os alunos, cole o link (Panda, Vimeo, YouTube não listado ou Drive) em &quot;Gravação&quot;.</p>
        </>
      )}

      {editT && <EditarTurma t={editT === "novo" ? null : editT} onClose={() => setEditT(null)} onFeito={() => (setEditT(null), recarregar())} />}
      {editM && d && (
        <EditarMentorado mt={editM === "novo" ? null : editM} turmas={d.turmas} onClose={() => setEditM(null)} onFeito={() => (setEditM(null), recarregar())} />
      )}
      {editE && d && (
        <EditarEncontro
          e={editE === "novo" ? null : editE}
          turmas={d.turmas}
          mentorados={d.mentorados.filter((x) => x.ativo)}
          onClose={() => setEditE(null)}
          onFeito={() => (setEditE(null), recarregar())}
        />
      )}
      {conversa && (
        <Modal title={conversa.titulo} onClose={() => (setConversa(null), recarregar())}>
          <MentoriaChat conversa={conversa.id} titulo={conversa.id.startsWith("dm:") ? "Conversa privada" : "Chat da turma"} sub="Você responde como Mentor." />
        </Modal>
      )}
    </>
  );
}

function Rodape({ salvando, onClose }: { salvando: boolean; onClose: () => void }) {
  return (
    <div className="hs-pn-bar">
      <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" className="hs-pn-btn" onClick={onClose}>
        Cancelar
      </button>
    </div>
  );
}

function EditarTurma({ t, onClose, onFeito }: { t: Turma | null; onClose: () => void; onFeito: () => void }) {
  const [nome, setNome] = useState(t?.nome ?? "");
  const [inicio, setInicio] = useState(t?.inicio ?? "");
  const [ativa, setAtiva] = useState(t?.ativa ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) return setErro("Dê um nome para a turma.");
    setSalvando(true);
    const { error } = await supabase.rpc("mentoria_salvar_turma", { p_id: t?.id ?? null, p_nome: nome, p_inicio: inicio || null, p_ativa: ativa });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast(t ? "Turma atualizada" : "Turma criada");
    onFeito();
  }

  return (
    <Modal title={t ? `Turma · ${t.nome}` : "Nova turma"} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <label className="hs-pn-fld">
          Nome
          <input className="hs-pn-in" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Turma Novembro" />
        </label>
        <label className="hs-pn-fld">
          Início
          <input className="hs-pn-in" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label className="hs-pn-fld" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} /> Turma ativa
        </label>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <Rodape salvando={salvando} onClose={onClose} />
      </form>
    </Modal>
  );
}

function EditarMentorado({ mt, turmas, onClose, onFeito }: { mt: Mentorado | null; turmas: Turma[]; onClose: () => void; onFeito: () => void }) {
  const [email, setEmail] = useState(mt?.email ?? "");
  const [turma, setTurma] = useState(mt?.turma_id ?? turmas.find((t) => t.ativa)?.id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro("Digite o e-mail da conta do aluno.");
    setSalvando(true);
    const { error } = await supabase.rpc("mentoria_definir_mentorado", { p_email: email.trim(), p_turma: turma || null, p_ativo: true });
    setSalvando(false);
    if (error) return setErro(/nenhuma conta/.test(error.message) ? "Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar no site antes." : erroAmigavel(error));
    toast("Mentorado liberado");
    onFeito();
  }

  return (
    <Modal title={mt ? `Mentorado · ${mt.email}` : "Liberar mentorado"} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <label className="hs-pn-fld">
          E-mail da conta
          <input className="hs-pn-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!mt} />
        </label>
        <label className="hs-pn-fld">
          Turma
          <select className="hs-pn-sel" value={turma} onChange={(e) => setTurma(e.target.value)}>
            <option value="">Sem turma (só calls 1:1 e conversa privada)</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
                {t.ativa ? "" : " (encerrada)"}
              </option>
            ))}
          </select>
        </label>
        <p className="hs-pn-nota">Libera a área Minha Mentoria: encontros, gravações, chat da turma e conversa privada com o mentor.</p>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <Rodape salvando={salvando} onClose={onClose} />
      </form>
    </Modal>
  );
}

function EditarEncontro({
  e,
  turmas,
  mentorados,
  onClose,
  onFeito,
}: {
  e: Encontro | null;
  turmas: Turma[];
  mentorados: Mentorado[];
  onClose: () => void;
  onFeito: () => void;
}) {
  const p = e ? partes(e.inicio) : null;
  const [titulo, setTitulo] = useState(e?.titulo ?? "");
  const [tipo, setTipo] = useState<"grupo" | "individual">(e ? (e.turma_id ? "grupo" : "individual") : turmas.length ? "grupo" : "individual");
  const [turma, setTurma] = useState(e?.turma_id ?? turmas.find((t) => t.ativa)?.id ?? turmas[0]?.id ?? "");
  const [email, setEmail] = useState(e?.mentorado ?? mentorados[0]?.email ?? "");
  const [dia, setDia] = useState(p?.d ?? "");
  const [hora, setHora] = useState(p?.h ?? "20:00");
  const [duracao, setDuracao] = useState(String(e?.duracao_min ?? 60));
  const [gravacao, setGravacao] = useState(e?.gravacao_url ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (titulo.trim().length < 2) return setErro("Dê um título para o encontro.");
    if (!dia || !hora) return setErro("Escolha dia e hora.");
    if (tipo === "grupo" && !turma) return setErro("Escolha a turma.");
    if (tipo === "individual" && !email) return setErro("Escolha o mentorado.");
    if (gravacao.trim() && !/^https:\/\//.test(gravacao.trim())) return setErro("O link da gravação precisa começar com https://");
    setSalvando(true);
    const { error } = await supabase.rpc("mentoria_salvar_encontro", {
      p_id: e?.id ?? null,
      p_titulo: titulo,
      p_inicio: paraIso(dia, hora),
      p_duracao: Number(duracao),
      p_turma: tipo === "grupo" ? turma : null,
      p_mentorado_email: tipo === "individual" ? email : null,
      p_gravacao: gravacao.trim() || null,
    });
    setSalvando(false);
    if (error) return setErro(erroAmigavel(error));
    toast(e ? "Encontro atualizado" : "Encontro marcado");
    onFeito();
  }

  return (
    <Modal title={e ? e.titulo : "Marcar encontro"} onClose={onClose}>
      <form className="hs-pn-form" onSubmit={salvar}>
        <label className="hs-pn-fld">
          Título
          <input className="hs-pn-in" value={titulo} onChange={(x) => setTitulo(x.target.value)} maxLength={120} placeholder="Hotseat: funil de 3 membros" />
        </label>
        <label className="hs-pn-fld">
          Tipo
          <select className="hs-pn-sel" value={tipo} onChange={(x) => setTipo(x.target.value as "grupo" | "individual")}>
            <option value="grupo" disabled={!turmas.length}>
              Em grupo (turma inteira)
            </option>
            <option value="individual" disabled={!mentorados.length}>
              Individual (1:1)
            </option>
          </select>
        </label>
        {tipo === "grupo" ? (
          <label className="hs-pn-fld">
            Turma
            <select className="hs-pn-sel" value={turma} onChange={(x) => setTurma(x.target.value)}>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="hs-pn-fld">
            Mentorado
            <select className="hs-pn-sel" value={email} onChange={(x) => setEmail(x.target.value)}>
              {mentorados.map((mt) => (
                <option key={mt.user_id} value={mt.email}>
                  {mt.nome} · {mt.email}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="hs-pn-bar">
          <label className="hs-pn-fld" style={{ flex: 1 }}>
            Dia
            <input className="hs-pn-in" type="date" value={dia} onChange={(x) => setDia(x.target.value)} />
          </label>
          <label className="hs-pn-fld" style={{ flex: 1 }}>
            Hora (Brasília)
            <input className="hs-pn-in" type="time" value={hora} onChange={(x) => setHora(x.target.value)} />
          </label>
          <label className="hs-pn-fld" style={{ flex: 1 }}>
            Duração
            <select className="hs-pn-sel" value={duracao} onChange={(x) => setDuracao(x.target.value)}>
              {[30, 45, 60, 90, 120, 180].map((v) => (
                <option key={v} value={v}>
                  {v} min
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="hs-pn-fld">
          Link da gravação (opcional, depois do encontro)
          <input className="hs-pn-in" value={gravacao} onChange={(x) => setGravacao(x.target.value)} placeholder="https://" />
        </label>
        {erro && <p className="hs-pn-erro">{erro}</p>}
        <Rodape salvando={salvando} onClose={onClose} />
      </form>
    </Modal>
  );
}
