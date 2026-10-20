import type { Metadata } from "next";
import LegalPage from "../_components/legal/LegalPage";
import { SITE } from "../_lib/site";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <LegalPage title="Termos de uso" updated={`19/10/2026 (versão ${SITE.versaoTermos})`}>
      <h2>1. Quem somos</h2>
      <p>
        A {SITE.name} é uma plataforma de assinatura de conteúdo educacional sobre negócios digitais, operada por{" "}
        {SITE.razaoSocial}, CNPJ {SITE.cnpj}
        {SITE.endereco ? `, com endereço em ${SITE.endereco}` : ""}. Contato: {SITE.supportEmail}.
      </p>

      <h2>2. Idade mínima</h2>
      <p>O acesso é exclusivo para maiores de 18 anos. Ao comprar, você declara ter 18 anos ou mais. Contas de menores são encerradas.</p>

      <h2>3. Planos, pagamento e acesso</h2>
      <ul>
        <li>Plano mensal: 30 dias de acesso. Plano anual: 12 meses de acesso.</li>
        <li>O pagamento é feito por Pix ou, quando disponível, cartão de crédito na página segura do processador de pagamento. Não existe cobrança recorrente nem renovação automática.</li>
        <li>O acesso é liberado assim que o pagamento é confirmado e fica ligado ao e-mail da sua conta.</li>
        <li>Se você pagar de novo antes de vencer, o tempo novo é somado ao que você ainda tem.</li>
        <li>A conta é pessoal. Compartilhar login pode levar ao bloqueio do acesso, sem reembolso.</li>
      </ul>

      <h2>4. Arrependimento e reembolso (7 dias)</h2>
      <ul>
        <li>
          Você pode desistir da compra em até 7 dias corridos a partir do pagamento, sem precisar explicar o motivo (Código de
          Defesa do Consumidor, art. 49).
        </li>
        <li>O pedido é feito em Perfil → Minhas compras → Pedir reembolso. Você recebe um número de protocolo na hora.</li>
        <li>Devolvemos o valor integral pelo mesmo meio de pagamento, e o acesso é encerrado.</li>
        <li>Também atendemos pelo e-mail {SITE.supportEmail}.</li>
      </ul>

      <h2>5. Regras de conteúdo</h2>
      <ul>
        <li>Operação com modelo real somente com pessoas maiores de 18 anos, contrato assinado e consentimento por escrito.</li>
        <li>É proibido usar rosto ou imagem de pessoa real sem autorização, inclusive deepfake.</li>
        <li>Conteúdo gerado por IA deve ser identificado como tal.</li>
        <li>É proibido publicar conteúdo explícito, ofensivo ou ilegal nos espaços da comunidade.</li>
        <li>Respeite as leis e as regras das plataformas onde você atua.</li>
      </ul>

      <h2>6. Resultados</h2>
      <p>
        Os resultados dependem do trabalho de cada assinante. Metas, valores, rankings e placas citados na plataforma não são
        promessa de ganho. Faturamento só é considerado &quot;verificado&quot; depois que o time confere os comprovantes.
      </p>

      <h2>7. Recursos em evolução</h2>
      <p>
        Alguns recursos estão marcados como &quot;beta&quot; ou &quot;em breve&quot; e podem mudar. Telas marcadas como &quot;exemplo&quot;
        mostram dados ilustrativos, não resultados reais.
      </p>

      <h2>8. Cappu Coins</h2>
      <p>Cappu Coins são pontos de fidelidade sem valor monetário. Não podem ser sacados, vendidos ou transferidos.</p>

      <h2>9. Propriedade do conteúdo</h2>
      <p>Aulas, materiais e marcas são da {SITE.name}. É proibido copiar, gravar, revender ou distribuir o conteúdo.</p>

      <h2>10. Atendimento</h2>
      <p>
        Dúvidas, reclamações e pedidos: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>. Respondemos em até 5
        dias úteis.
      </p>

      <h2>11. Lei aplicável</h2>
      <p>Estes termos seguem as leis brasileiras. Fica eleito o foro do domicílio do consumidor.</p>
    </LegalPage>
  );
}
