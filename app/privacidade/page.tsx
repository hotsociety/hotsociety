import type { Metadata } from "next";
import LegalPage from "../_components/legal/LegalPage";
import { SITE } from "../_lib/site";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <LegalPage title="Política de privacidade" updated={`19/10/2026 (versão ${SITE.versaoTermos})`}>
      <h2>1. Quem cuida dos seus dados</h2>
      <p>
        Controladora: {SITE.razaoSocial}, CNPJ {SITE.cnpj}, {SITE.endereco}. Encarregado de dados (LGPD, art. 41):{" "}
        {SITE.encarregado}, pelo e-mail <a href={`mailto:${SITE.privacidadeEmail}`}>{SITE.privacidadeEmail}</a>.
      </p>

      <h2>2. Dados que coletamos e por quê</h2>
      <ul>
        <li>
          <b>Conta</b> (nome, e-mail, senha protegida, foto opcional): para criar e proteger seu acesso. Base legal: execução de
          contrato.
        </li>
        <li>
          <b>Compra</b> (nome, e-mail, plano, valor, data e status). O <b>CPF</b> é enviado direto ao processador de pagamento para
          gerar o Pix e não fica guardado no nosso banco. Base legal: execução de contrato e obrigação legal/fiscal.
        </li>
        <li>
          <b>Uso</b> (aulas assistidas, missões, XP, moedas e faturamento verificado que você nos envia): para mostrar seu
          progresso, a rota e os prêmios. Base legal: execução de contrato.
        </li>
        <li>
          <b>Comprovantes de faturamento</b> (arquivos que você envia em Prêmios): para conferir e liberar escalas e placas. Ficam em
          pasta privada, vistos só por Admin e Financeiro. Base legal: execução de contrato.
        </li>
        <li>
          <b>Endereço de entrega</b> (placas e resgates da Hot Store): só para o envio. Base legal: execução de contrato.
        </li>
        <li>
          <b>Suporte</b> (chamados e mensagens): para responder e guardar o histórico do atendimento (Decreto 7.962/2013). Base legal:
          execução de contrato e obrigação legal.
        </li>
        <li>
          <b>Segurança</b> (registros de acesso, endereço IP e verificação anti-robô): para evitar fraudes e cumprir o Marco
          Civil da Internet. Base legal: legítimo interesse e obrigação legal.
        </li>
        <li>
          <b>Equipe</b>: ações feitas no painel interno ficam registradas com o autor, para auditoria.
        </li>
      </ul>

      <h2>3. Ranking e comunidade</h2>
      <p>
        No ranking, no feed e nos canais aparecem só o seu primeiro nome e a inicial do sobrenome, nunca o e-mail. O que você
        publica no feed e nos canais fica visível para os outros assinantes até você apagar. Posts denunciados são revistos pela
        equipe. Para sair do ranking, peça pelo e-mail de privacidade.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Só com empresas necessárias para a plataforma funcionar. Não vendemos dados pessoais.</p>
      <ul>
        <li>Supabase: banco de dados e login (servidores no Canadá).</li>
        <li>Vercel: hospedagem do site (servidores nos EUA e em outros países).</li>
        <li>Transfeer: processamento do pagamento por Pix (Brasil).</li>
        <li>Resend: envio de e-mails da conta.</li>
        <li>Cloudflare Turnstile: verificação anti-robô no login.</li>
        <li>Google: somente se você escolher entrar com o Google.</li>
      </ul>
      <p>
        Como alguns desses serviços ficam fora do Brasil, há transferência internacional de dados, feita com empresas que
        adotam padrões de proteção compatíveis com a LGPD (art. 33).
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados da conta, progresso, posts, chamados e comprovantes: enquanto a conta existir. Ao excluir a conta, são apagados.</li>
        <li>Registros de compra: 5 anos, por obrigação fiscal.</li>
        <li>Registros de acesso: no mínimo 6 meses, pelo Marco Civil da Internet.</li>
      </ul>

      <h2>6. Cookies e armazenamento no navegador</h2>
      <p>
        Usamos apenas o necessário para manter você logado e lembrar preferências da plataforma (como a cor do seu HOTPHONE). Não
        usamos cookies de anúncio.
      </p>

      <h2>7. Seus direitos (LGPD, art. 18)</h2>
      <p>
        Você pode pedir confirmação, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, e informações sobre
        com quem os compartilhamos. Em Perfil → Privacidade você baixa uma cópia dos seus dados e exclui a conta na hora. Para o resto, peça pelo e-mail{" "}
        <a href={`mailto:${SITE.privacidadeEmail}`}>{SITE.privacidadeEmail}</a>. Respondemos em até 15 dias. Se não ficar satisfeito,
        você pode procurar a ANPD.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexão criptografada, controle de acesso por cargo, verificação anti-robô e registros de auditoria. Nunca pedimos
        sua senha por mensagem. Se houver incidente que traga risco a você, avisaremos você e a ANPD.
      </p>
    </LegalPage>
  );
}
