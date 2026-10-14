import type { Metadata } from "next";
import LegalPage from "../_components/legal/LegalPage";
import { SITE } from "../_lib/site";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <LegalPage title="Política de privacidade" updated="outubro de 2026">
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail e dados de pagamento processados pelo gateway.</li>
        <li>Uso da plataforma: aulas assistidas, missões, XP e mensagens na comunidade.</li>
        <li>Dados técnicos: dispositivo, navegador e cookies essenciais de login.</li>
      </ul>
      <h2>2. Para que usamos</h2>
      <ul>
        <li>Liberar e manter seu acesso.</li>
        <li>Processar pagamentos, renovações e reembolsos.</li>
        <li>Calcular progresso, ranking e prêmios.</li>
        <li>Enviar avisos sobre a sua conta.</li>
      </ul>
      <h2>3. Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com prestadores necessários para operar a plataforma, como hospedagem, banco de
        dados e gateway de pagamento. Não vendemos dados pessoais.
      </p>
      <h2>4. Seus direitos (LGPD)</h2>
      <p>
        Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados a qualquer momento pelo e-mail{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
      <h2>5. Segurança</h2>
      <p>Usamos conexão criptografada e controle de acesso aos dados. Nunca pedimos sua senha por mensagem.</p>
    </LegalPage>
  );
}
