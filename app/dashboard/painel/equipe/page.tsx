"use client";

import { useEffect, useState } from "react";
import { NOME_CARGO, PODE, useMembro, type Cargo } from "../../../_components/membros/MemberContext";
import { m } from "../../../_components/membros/proto";
import { Modal, toast } from "../../../_components/membros/Toast";
import { supabase } from "../../../_lib/supabase";
import { dataHora, erroAmigavel } from "../../../_lib/painel";

type Membro = { id: string; email: string; nome: string | null; cargo: Cargo; ultimo_login: string | null };

const O_QUE_FAZ: Record<Cargo, string> = {
  admin: "Tudo: vendas, valores, alunos, cargos e histórico.",
  financeiro: "Vendas, valores e repasses. Lança venda manual e registra reembolso. Consulta alunos.",
  suporte: "Libera e bloqueia alunos. Vê os pedidos sem valores.",
};

export default function Equipe() {
  const { cargo, user } = useMembro();
  const [lista, setLista] = useState<Membro[] | null>(null);
  const [erro, setErro] = useState("");
  const [email, setEmail] = useState("");
  const [novo, setNovo] = useState<Cargo>("suporte");
  const [salvando, setSalvando] = useState(false);
  const [tirar, setTirar] = useState<Membro | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    if (!PODE.darCargo(cargo)) return;
    let vivo = true;
    supabase.rpc("painel_equipe").then(({ data, error }) => {
      if (!vivo) return;
      setErro(error ? erroAmigavel(error) : "");
      setLista((data ?? []) as Membro[]);
    });
    return () => {
      vivo = false;
    };
  }, [cargo, recarregar]);

  async function definir(alvo: string, c: Cargo | null) {
    setSalvando(true);
    setErro("");
    const { error } = await supabase.rpc("definir_cargo", { p_email: alvo, p_cargo: c });
    setSalvando(false);
    if (error) {
      setErro(erroAmigavel(error));
      return false;
    }
    toast(c ? `${alvo} agora é ${NOME_CARGO[c]}` : `Cargo removido de ${alvo}`);
    setRecarregar((n) => n + 1);
    return true;
  }

  async function dar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro("Digite um e-mail válido.");
    if (await definir(email.trim(), novo)) setEmail("");
  }

  if (!PODE.darCargo(cargo)) return null;

  return (
    <>
      <div className={m("card")}>
        <h2>Dar cargo</h2>
        <form className="hs-pn-form" onSubmit={dar}>
          <div className="hs-pn-bar">
            <input
              className="hs-pn-in"
              type="email"
              placeholder="E-mail da pessoa (precisa ter conta confirmada no site)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="E-mail"
              required
            />
            <select className="hs-pn-sel" value={novo} onChange={(e) => setNovo(e.target.value as Cargo)} aria-label="Cargo">
              <option value="suporte">Suporte</option>
              <option value="financeiro">Financeiro</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="hs-pn-btn hs-pn-btn-p" disabled={salvando}>
              {salvando ? "Salvando…" : "Dar cargo"}
            </button>
          </div>
          <p className="hs-pn-nota">
            <b>{NOME_CARGO[novo]}:</b> {O_QUE_FAZ[novo]}
          </p>
          {erro && <p className="hs-pn-erro">{erro}</p>}
        </form>
      </div>

      <div className="hs-pn-tw">
        <table className="hs-pn-t" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Cargo</th>
              <th>Último login</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {lista?.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.nome || "—"}
                  <small style={{ overflowWrap: "anywhere" }}>{p.email}</small>
                </td>
                <td>
                  <span className="hs-pn-role">{NOME_CARGO[p.cargo]}</span>
                  <small>{O_QUE_FAZ[p.cargo]}</small>
                </td>
                <td>{p.ultimo_login ? dataHora(p.ultimo_login) : "Nunca"}</td>
                <td>
                  {p.id === user.id ? (
                    <small>Você</small>
                  ) : (
                    <div className="hs-pn-acts">
                      <button type="button" className="hs-pn-btn hs-pn-btn-sm hs-pn-btn-d" onClick={() => setTirar(p)}>
                        Tirar cargo
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista === null && <p className="hs-pn-vazio">Carregando equipe…</p>}
      </div>
      <p className="hs-pn-nota">Você não consegue tirar o próprio cargo de Admin. Assim o painel nunca fica sem dono.</p>

      {tirar && (
        <Modal title="Tirar cargo" onClose={() => setTirar(null)}>
          <div className="hs-pn-form">
            <p style={{ margin: 0 }}>
              Tirar o cargo de <b>{NOME_CARGO[tirar.cargo]}</b> de <b style={{ overflowWrap: "anywhere" }}>{tirar.email}</b>? A pessoa perde o painel na hora e, se não tiver
              assinatura, também perde a área de membros.
            </p>
            <div className="hs-pn-bar">
              <button
                type="button"
                className="hs-pn-btn hs-pn-btn-d"
                disabled={salvando}
                onClick={async () => {
                  if (await definir(tirar.email, null)) setTirar(null);
                }}
              >
                Tirar cargo
              </button>
              <button type="button" className="hs-pn-btn" onClick={() => setTirar(null)}>
                Cancelar
              </button>
            </div>
            {erro && <p className="hs-pn-erro">{erro}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
