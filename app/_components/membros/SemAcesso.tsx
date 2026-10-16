"use client";

import Image from "next/image";
import type { Cargo } from "./MemberContext";
import { CHECKOUT, PRICE } from "../../_lib/site";
import "./painel.css";

export type Acesso = {
  ativo: boolean;
  cargo?: Cargo | null;
  status?: string | null;
  validoAte?: string | null;
  erro?: boolean;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Tela para quem entrou com login mas não tem assinatura ativa.
export default function SemAcesso({
  acesso,
  email,
  onDeNovo,
  onSair,
}: {
  acesso: Acesso;
  email: string;
  onDeNovo: () => void;
  onSair: () => void;
}) {
  const vencido = acesso.status === "ativo" && !!acesso.validoAte;
  const titulo = acesso.erro
    ? "Não deu para conferir seu acesso."
    : acesso.status === "bloqueado"
      ? "Seu acesso está bloqueado."
      : vencido
        ? "Sua assinatura venceu."
        : "Seu passaporte ainda não está ativo.";
  const texto = acesso.erro
    ? "Pode ser a sua internet. Tente de novo em alguns segundos."
    : acesso.status === "bloqueado"
      ? "Se você acha que é um engano, fale com o suporte informando o e-mail da compra."
      : vencido
        ? "Renove para voltar às aulas, missões e comunidade. Seu progresso fica guardado."
        : "Escolha um plano para embarcar. Se você já pagou, use na compra o mesmo e-mail deste login.";

  return (
    <main className="hs-pn-gate">
      <div className="hs-pn-gatebox">
        <Image src="/brand/hs-simbolo.svg" alt="" width={56} height={56} />
        <h1>{titulo}</h1>
        <p>{texto}</p>
        <p className="hs-pn-gatemail">
          Conta: <b>{email}</b>
        </p>
        {!acesso.erro && acesso.status !== "bloqueado" && (
          <div className="hs-pn-gateplans">
            <a href={CHECKOUT.anual} className="hs-pn-btn hs-pn-btn-p">
              Anual · {BRL.format(PRICE.anual)}
            </a>
            <a href={CHECKOUT.mensal} className="hs-pn-btn">
              Mensal · {BRL.format(PRICE.mensal)}
            </a>
          </div>
        )}
        <div className="hs-pn-gatefoot">
          <button type="button" className="hs-pn-link" onClick={onDeNovo}>
            Já paguei, conferir de novo
          </button>
          <button type="button" className="hs-pn-link" onClick={onSair}>
            Sair
          </button>
        </div>
      </div>
    </main>
  );
}
