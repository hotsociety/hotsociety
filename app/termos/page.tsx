import type { Metadata } from "next";
import LegalPage from "../_components/legal/LegalPage";
import { SITE } from "../_lib/site";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <LegalPage title="Termos de uso" updated="outubro de 2026">
      <h2>1. Quem somos</h2>
      <p>
        A {SITE.name} é uma plataforma de assinatura de conteúdo educacional sobre negócios digitais, operada pela
        empresa inscrita no CNPJ {SITE.cnpj}.
      </p>
      <h2>2. Idade mínima</h2>
      <p>O acesso é exclusivo para maiores de 18 anos. Ao assinar, você declara ter 18 anos ou mais.</p>
      <h2>3. Assinatura, renovação e cancelamento</h2>
      <ul>
        <li>Planos mensal e anual, com renovação automática no fim de cada período.</li>
        <li>Avisamos por e-mail antes da renovação do plano anual.</li>
        <li>Você cancela a qualquer momento na sua conta. O acesso segue até o fim do período pago.</li>
        <li>Garantia de 7 dias: pedidos de reembolso feitos nesse prazo são devolvidos integralmente.</li>
      </ul>
      <h2>4. Regras de conteúdo</h2>
      <ul>
        <li>Operação com modelo real somente com pessoas maiores de 18 anos, contrato assinado e consentimento por escrito.</li>
        <li>É proibido usar rosto ou imagem de pessoa real sem autorização, inclusive deepfake.</li>
        <li>Conteúdo gerado por IA deve ser identificado como tal.</li>
        <li>É proibido publicar conteúdo explícito nos espaços da comunidade.</li>
      </ul>
      <h2>5. Resultados</h2>
      <p>
        Os resultados dependem do trabalho de cada assinante. Metas, valores e placas citados na plataforma não são
        promessa de ganho.
      </p>
      <h2>6. Cappu Coins</h2>
      <p>
        Cappu Coins são pontos de fidelidade sem valor monetário. Não podem ser sacados, vendidos ou transferidos.
      </p>
      <h2>7. Contato</h2>
      <p>
        Dúvidas: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
      </p>
    </LegalPage>
  );
}
