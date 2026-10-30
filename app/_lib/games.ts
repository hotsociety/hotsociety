// Games da área de membros: catálogo, bancos de perguntas (cada partida sorteia 6) e geradores.
// Os pontos máximos de cada jogo precisam bater com o "maxp" de registrar_partida no banco.

export type JogoId = "quiz" | "hook" | "funil" | "persona" | "chat" | "conta" | "mito" | "duelo" | "memoria";

export type InfoJogo = {
  k: JogoId;
  t: string;
  d: string;
  max: number;
  ic: string; // emoji do card
  cat: "Conhecimento" | "Conteúdo" | "Vendas" | "Números";
  dur: string;
  cor: string; // tom do card (hex)
  novo?: boolean;
};

export const CATALOGO: InfoJogo[] = [
  { k: "quiz", t: "Quiz relâmpago", d: "6 perguntas sobre as aulas, 15 segundos cada. Responda rápido.", max: 6, ic: "⚡", cat: "Conhecimento", dur: "2 min", cor: "#C9A24E" },
  { k: "hook", t: "Gancho ou mico", d: "Esse gancho segura o scroll ou é mico? Você decide.", max: 6, ic: "🎣", cat: "Conteúdo", dur: "1 min", cor: "#E0714F" },
  { k: "funil", t: "Monte o funil", d: "Coloque as etapas na ordem certa. Cada erro custa um ponto.", max: 5, ic: "🧩", cat: "Vendas", dur: "1 min", cor: "#5BA3E0" },
  { k: "persona", t: "Desafio da persona", d: "Leia o briefing do público e escolha a persona que vai converter.", max: 6, ic: "🎭", cat: "Conteúdo", dur: "3 min", cor: "#B47BE0", novo: true },
  { k: "chat", t: "Objeção na DM", d: "O lead mandou mensagem. Escolha a resposta que fecha a venda.", max: 6, ic: "💬", cat: "Vendas", dur: "3 min", cor: "#3ECF72", novo: true },
  { k: "conta", t: "Calcula o caixa", d: "Conta de cabeça: ticket, churn, conversão. 20 segundos cada.", max: 6, ic: "🧮", cat: "Números", dur: "2 min", cor: "#E8C35A", novo: true },
  { k: "mito", t: "Verdade ou mito", d: "O que todo mundo repete no digital: é verdade ou é mito? 10 segundos cada.", max: 6, ic: "🕵️", cat: "Conhecimento", dur: "1 min", cor: "#4FC3C9", novo: true },
  { k: "duelo", t: "Duelo de posts", d: "Dois posts, um teste A/B. Qual deles performa melhor?", max: 6, ic: "⚔️", cat: "Conteúdo", dur: "2 min", cor: "#E05B8F", novo: true },
  { k: "memoria", t: "Memória do operador", d: "Ache os pares de termo e significado. Errou muito, perde ponto.", max: 6, ic: "🧠", cat: "Conhecimento", dur: "2 min", cor: "#8A9BFF", novo: true },
];

export const POR_RODADA = 6;

export function embaralhar<T>(a: readonly T[]): T[] {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

export const sortear = <T,>(a: readonly T[], n = POR_RODADA) => embaralhar(a).slice(0, n);

/* Pergunta de múltipla escolha. As opções são embaralhadas a cada partida. */
export type Pergunta = { q: string; ops: string[]; certa: number; porque: string; ctx?: string };

export function misturarOpcoes(p: Pergunta): Pergunta {
  const idx = embaralhar(p.ops.map((_, i) => i));
  return { ...p, ops: idx.map((i) => p.ops[i]), certa: idx.indexOf(p.certa) };
}

/* ---------- Quiz relâmpago ---------- */
export const QUIZ: Pergunta[] = [
  { q: "Qual é o primeiro passo para criar uma modelo IA?", ops: ["Gerar o rosto direto", "Definir a persona", "Comprar tráfego"], certa: 1, porque: "Persona primeiro: nome, idade aparente sempre adulta, estilo e história. O rosto vem depois." },
  { q: "O que é obrigatório antes de fotografar uma modelo real?", ops: ["Só um combinado no WhatsApp", "Contrato, prova de 18+ e consentimento por escrito", "Nada, se ela topar"], certa: 1, porque: "Contrato assinado, documento que comprove 18+ e consentimento escrito do que pode ser publicado." },
  { q: "Para quem está começando, qual tráfego vem primeiro?", ops: ["Orgânico", "Pago", "Os dois juntos"], certa: 0, porque: "Orgânico valida a persona sem queimar dinheiro e sem risco de bloqueio." },
  { q: "Conteúdo feito com IA deve…", ops: ["Fingir ser pessoa real", "Ser identificado como IA", "Usar rosto de famosa"], certa: 1, porque: "Sempre identificado como IA. Nada de rosto real nem deepfake." },
  { q: "Quanto faturamento verificado carimba o Chile?", ops: ["R$ 1 mil", "R$ 10 mil", "R$ 100 mil"], certa: 1, porque: "R$ 10 mil verificados carimbam o Chile e liberam a placa 10K." },
  { q: "Qual métrica mostra se a assinatura está saudável?", ops: ["Seguidores", "Cancelamento mensal (churn)", "Curtidas"], certa: 1, porque: "Recorrência vive de retenção: acompanhe quantos cancelam por mês." },
  { q: "O que mais mantém uma persona com cara de real?", ops: ["Mudar o rosto toda semana", "Consistência de rosto, estilo e rotina", "Postar 20 vezes por dia"], certa: 1, porque: "Consistência gera reconhecimento. Rosto, cenário e tom de voz precisam se repetir." },
  { q: "Onde fica o link que leva o seguidor para a venda?", ops: ["Na legenda de cada post", "Na bio, apontando para a página da persona", "Só no direct"], certa: 1, porque: "Bio com um link só, levando para uma página que explica e direciona para a assinatura." },
  { q: "Qual é o melhor momento para oferecer o upsell?", ops: ["Antes da primeira compra", "Logo depois da compra, enquanto o cliente está quente", "Nunca"], certa: 1, porque: "Quem acabou de comprar já confia. É o momento de maior conversão para uma oferta complementar." },
  { q: "Antes de colocar dinheiro em anúncio você precisa…", ops: ["De um logo bonito", "De um funil que já converte no orgânico", "De 100 mil seguidores"], certa: 1, porque: "Tráfego pago só acelera o que já funciona. Sem conversão no orgânico, você paga para perder." },
  { q: "Um bom roteiro de Reels começa com…", ops: ["Apresentação pessoal", "Um gancho nos 2 primeiros segundos", "A logo da marca"], certa: 1, porque: "Os primeiros 2 segundos decidem se a pessoa fica. Gancho primeiro, contexto depois." },
  { q: "O que é ticket médio?", ops: ["O preço do plano mais caro", "Faturamento dividido pelo número de vendas", "Quanto você gasta em anúncio"], certa: 1, porque: "Ticket médio = faturamento ÷ número de vendas. Sobe com upsell e plano anual." },
  { q: "Por que o plano anual é bom para a operação?", ops: ["Porque é mais caro", "Porque antecipa caixa e reduz o churn", "Porque o cliente esquece de cancelar"], certa: 1, porque: "Caixa adiantado e menos cancelamento. Mas só com vantagem real para o cliente." },
  { q: "Qual é a função da página da persona?", ops: ["Mostrar todos os conteúdos de graça", "Explicar o que a pessoa recebe e levar à assinatura", "Coletar senha do Instagram"], certa: 1, porque: "Ela converte: promessa clara, prova e um botão para assinar." },
  { q: "Prazo de uma oferta deve ser…", ops: ["Prorrogado sempre que vender pouco", "Real e cumprido", "Escondido"], certa: 1, porque: "Prazo falso queima a confiança. Fechou, fechou." },
  { q: "Qual sinal mostra que um conteúdo foi bem?", ops: ["Só curtidas", "Salvamentos, compartilhamentos e cliques no link", "Número de hashtags"], certa: 1, porque: "Salvar e compartilhar indicam valor real. Clique no link indica intenção de compra." },
  { q: "Como usar print de resultado com ética?", ops: ["Editar o valor para parecer maior", "Só print real, sem dados de clientes", "Pegar print de outra pessoa"], certa: 1, porque: "Prova social só funciona se for verdade. Esconda nomes e dados de quem comprou." },
  { q: "Qual é o papel do conteúdo gratuito?", ops: ["Entregar tudo para viralizar", "Atrair e gerar desejo pelo conteúdo pago", "Nenhum, só o pago importa"], certa: 1, porque: "Gratuito atrai e aquece. O pago aprofunda. Um alimenta o outro." },
];

/* ---------- Gancho ou mico ---------- */
export type Gancho = { f: string; ok: boolean; porque: string };
export const GANCHOS: Gancho[] = [
  { f: "Ninguém te conta isso sobre a primeira semana…", ok: true, porque: "Curiosidade + promessa de bastidor. Segura o scroll." },
  { f: "Oi gente, tudo bem? Hoje vou falar um pouquinho sobre…", ok: false, porque: "Começo lento. Os primeiros 2 segundos precisam de tensão, não de saudação." },
  { f: "3 erros que fazem sua persona parecer falsa", ok: true, porque: "Número + dor específica. Clássico que funciona." },
  { f: "Compra aí que é bom", ok: false, porque: "Sem contexto, sem desejo, sem prova. Mico." },
  { f: "O print que eu não queria mostrar", ok: true, porque: "Quebra de expectativa e bastidor. Gancho forte (só com print real)." },
  { f: "Post de hoje é sobre motivação", ok: false, porque: "Genérico. Não diz por que a pessoa deveria parar." },
  { f: "Eu errei isso por 6 meses. Você não precisa.", ok: true, porque: "Confissão + atalho. A pessoa fica para não repetir o erro." },
  { f: "Segue a página pra mais conteúdo!", ok: false, porque: "Pedido sem motivo. Primeiro entregue valor, depois peça." },
  { f: "Se você posta todo dia e não vende, assiste até o fim", ok: true, porque: "Fala com uma dor exata e promete a resposta no final." },
  { f: "Vídeo novo no canal", ok: false, porque: "Não dá nenhum motivo para assistir." },
  { f: "Testei 3 estilos de foto. Só um vendeu.", ok: true, porque: "Experimento + resultado escondido. Cria curiosidade real." },
  { f: "Hoje acordei meio assim…", ok: false, porque: "Vago. Sem tensão nem promessa." },
  { f: "Para de fazer isso na sua bio agora", ok: true, porque: "Comando direto + medo de estar errando. Para o scroll." },
  { f: "Promoção imperdível!!! 🔥🔥🔥", ok: false, porque: "Todo mundo diz isso. Sem oferta clara vira ruído." },
  { f: "O que muda quando você sai de 10 para 100 assinantes", ok: true, porque: "Transformação concreta com números. Desperta desejo." },
  { f: "Bom dia! Mais um dia de trabalho", ok: false, porque: "Não entrega nada para quem está rolando o feed." },
  { f: "A pergunta que mais chega no meu direct (e a resposta)", ok: true, porque: "Prova de demanda + resposta prometida." },
  { f: "Não sei se vocês vão gostar, mas…", ok: false, porque: "Insegurança no começo derruba a retenção." },
];

/* ---------- Monte o funil (5 etapas, várias versões) ---------- */
export type Funil = { t: string; etapas: string[] };
export const FUNIS: Funil[] = [
  { t: "Funil da persona", etapas: ["Conteúdo gratuito no perfil", "Link na bio", "Página da persona", "Assinatura na plataforma", "Upsell de pacote"] },
  { t: "Funil do Reels", etapas: ["Gancho nos 2 primeiros segundos", "Entrega de valor no vídeo", "Chamada para o perfil", "Clique no link da bio", "Compra"] },
  { t: "Funil do direct", etapas: ["Story com caixinha de pergunta", "Resposta no direct", "Entender o que a pessoa quer", "Mandar a oferta certa", "Confirmar o pagamento"] },
  { t: "Funil da pré-venda", etapas: ["Anunciar a novidade", "Abrir lista de espera", "Liberar pré-venda com bônus", "Lembrete das últimas horas", "Entregar no prazo"] },
  { t: "Funil de retenção", etapas: ["Boas-vindas ao assinante", "Primeiro conteúdo exclusivo", "Rotina de postagens", "Oferta do plano anual", "Pedido de indicação"] },
];

/* ---------- Desafio da persona ---------- */
export const PERSONAS: Pergunta[] = [
  { ctx: "Fitness", q: "Público: homens 25–40 que treinam e seguem perfis de academia. Qual persona converte?", ops: ["Persona fitness com rotina de treino, dieta e bastidores da academia", "Persona gamer que faz live à noite", "Persona de viagens de luxo"], certa: 0, porque: "Persona e público precisam dividir o mesmo universo. Treino fala com quem treina." },
  { ctx: "Games", q: "Público: jovens adultos que assistem lives e jogam online. Qual persona?", ops: ["Persona executiva de terno", "Persona gamer, setup aparente, linguagem de chat", "Persona de culinária"], certa: 1, porque: "Setup, gírias e horários de live criam identificação imediata com esse público." },
  { ctx: "Luxo", q: "Público: quem consome conteúdo de viagens, carros e lifestyle premium. Qual persona?", ops: ["Persona lifestyle com viagens, hotéis e estética clean", "Persona universitária de república", "Persona de pesca"], certa: 0, porque: "Desejo aspiracional: o cenário vende tanto quanto a persona." },
  { ctx: "Consistência", q: "Sua persona tem cabelo loiro nos posts e ruivo nos stories. O que fazer?", ops: ["Deixar assim, ninguém repara", "Fixar as características e refazer o que destoa", "Mudar a cor a cada semana para variar"], certa: 1, porque: "Inconsistência quebra a ilusão de pessoa única. Ficha da persona fixa e sempre consultada." },
  { ctx: "Idade", q: "Qual idade aparente a persona deve ter?", ops: ["Qualquer uma, é IA", "Sempre claramente adulta", "Quanto mais jovem, melhor"], certa: 1, porque: "Regra inegociável: aparência sempre claramente adulta. Sem exceção." },
  { ctx: "Nome", q: "Qual nome funciona melhor para a persona?", ops: ["Um nome curto, fácil de lembrar e de buscar", "Nome de uma famosa real", "Uma sequência de números e letras"], certa: 0, porque: "Fácil de lembrar e de digitar na busca. Nunca use nome ou rosto de pessoa real." },
  { ctx: "Bio", q: "Qual bio converte mais?", ops: ["Só emojis", "Quem ela é + o que a pessoa recebe + link", "A história completa da vida dela"], certa: 1, porque: "Identidade, promessa e direção. Em 3 linhas." },
  { ctx: "Estilo", q: "Público: seguidores de moda alternativa, tatuagem e rock. Qual estética?", ops: ["Clean, tons pastel e roupa social", "Alternativa: preto, tatuagens, cenários urbanos", "Estética de escritório corporativo"], certa: 1, porque: "Estética é filtro de público. Fale a língua visual de quem você quer atrair." },
  { ctx: "Rotina", q: "O que deixa a persona mais crível no dia a dia?", ops: ["Postar só fotos produzidas", "Mostrar rotina: café, treino, bastidores, opiniões", "Não responder ninguém"], certa: 1, porque: "Rotina gera proximidade. É o que transforma seguidor em assinante." },
  { ctx: "Transparência", q: "Um seguidor pergunta se a persona é IA. Qual postura?", ops: ["Negar e dizer que é real", "Ser transparente: é uma persona criada com IA", "Bloquear o seguidor"], certa: 1, porque: "Conteúdo de IA é sempre identificado. Transparência protege a conta e a marca." },
  { ctx: "Nicho", q: "Você quer testar uma persona nova. Qual é o jeito certo?", ops: ["Criar 10 personas de uma vez", "Uma persona, um nicho, 30 dias de postagem e medir", "Copiar a persona de um concorrente"], certa: 1, porque: "Foco e tempo de teste. Muitas personas ao mesmo tempo dividem sua energia." },
  { ctx: "Voz", q: "Como deve ser o tom de voz da persona?", ops: ["Muda conforme o humor do operador", "Definido na ficha e igual em post, story e direct", "Sempre formal"], certa: 1, porque: "Tom de voz é parte da identidade. Se muda, a persona parece outra pessoa." },
];

/* ---------- Objeção na DM ---------- */
export const CHATS: Pergunta[] = [
  { q: "Tá caro demais 😅", ops: ["Entendo! Por esse valor você recebe [entregáveis]. Dá menos de R$ 1 por dia. Quer o link?", "Caro é ficar sem kkkk", "Então não compra."], certa: 0, porque: "Acolha e traduza o preço em valor e em custo diário. Nunca desdenhe da objeção." },
  { q: "Vou pensar e depois te falo", ops: ["Ok, tchau.", "Claro! Ficou alguma dúvida que eu possa responder agora?", "Se não comprar hoje vai se arrepender"], certa: 1, porque: "\"Vou pensar\" quase sempre esconde uma dúvida. Descubra qual é, sem pressão." },
  { q: "Isso é real ou é IA?", ops: ["É real, juro", "É uma persona criada com IA, e o conteúdo é exclusivo daqui. Quer conhecer?", "Não posso falar"], certa: 1, porque: "Transparência sempre. Conteúdo de IA é identificado como IA." },
  { q: "Tem algum desconto?", ops: ["Não.", "Tenho! O anual sai mais em conta e ainda vem com bônus. Te mando?", "Pra você faço de graça"], certa: 1, porque: "Em vez de baixar preço, direcione para uma condição que também é boa para você." },
  { q: "Como eu pago?", ops: ["Te mando o link aqui. Pix ou cartão, cai na hora. Quer?", "Procura aí no perfil", "Me manda os dados do seu cartão por aqui"], certa: 0, porque: "Facilite. E nunca peça dados de cartão no direct: o pagamento é sempre pelo link seguro." },
  { q: "Já assinei antes e cancelei", ops: ["Por que você cancelou?? 😤", "Que bom te ver de volta! Tem muita coisa nova desde então. Quer ver?", "Então não adianta"], certa: 1, porque: "Ex-cliente é o lead mais quente. Mostre o que mudou." },
  { q: "Tem como ver uma prévia antes?", ops: ["Não, só assinando", "Tem sim! Os destaques do perfil mostram o estilo. Lá dentro é exclusivo.", "Te mando tudo de graça"], certa: 1, porque: "Prévia gera desejo sem entregar o produto. Use o conteúdo gratuito a seu favor." },
  { q: "Posso cancelar quando quiser?", ops: ["Pode sim, sem multa, direto na plataforma.", "Não pode", "Depois a gente vê"], certa: 0, porque: "Responder com clareza e honestidade reduz o medo de comprar." },
  { q: "Não tenho cartão de crédito", ops: ["Então não dá", "Tranquilo, aceita Pix também. Te mando o link?", "Pede o cartão de alguém"], certa: 1, porque: "Tenha alternativa de pagamento pronta e ofereça na hora." },
  { q: "Vi outra parecida mais barata", ops: ["A outra é fake", "Cada uma tem seu estilo. Aqui você tem [diferencial]. Quer ver?", "Então vai lá"], certa: 1, porque: "Não fale mal da concorrência. Mostre seu diferencial." },
  { q: "Responde rápido assim sempre?", ops: ["Sempre que posso! Assinante tem prioridade nas respostas 😉", "Não", "É robô"], certa: 0, porque: "Use a pergunta para mostrar um benefício de assinar." },
  { q: "Me manda o link", ops: ["Aqui: [link]. Qualquer dúvida no pagamento me chama!", "Tá na bio", "Depois mando"], certa: 0, porque: "Lead pediu o link: mande na hora e se coloque disponível. Cada segundo conta." },
];

/* ---------- Verdade ou mito ---------- */
export type Binario = { f: string; ok: boolean; porque: string };
export const MITOS: Binario[] = [
  { f: "Precisa de muitos seguidores para começar a vender.", ok: false, porque: "Mito. Perfil pequeno com público certo e oferta clara já vende." },
  { f: "Conteúdo feito com IA deve ser identificado como IA.", ok: true, porque: "Verdade. Transparência é regra da Society e protege sua conta." },
  { f: "Postar todo dia garante crescimento.", ok: false, porque: "Mito. Frequência ajuda, mas sem gancho e sem consistência de persona não adianta." },
  { f: "Quem já comprou uma vez é o lead mais fácil de vender de novo.", ok: true, porque: "Verdade. Cliente que confia compra mais barato e mais rápido." },
  { f: "Tráfego pago resolve um funil que não converte.", ok: false, porque: "Mito. Anúncio só acelera o que já funciona. Funil ruim + tráfego = prejuízo maior." },
  { f: "Os 2 primeiros segundos decidem se a pessoa assiste ao Reels.", ok: true, porque: "Verdade. Por isso o gancho vem antes de qualquer apresentação." },
  { f: "Dá para usar o rosto de uma famosa se for só inspiração.", ok: false, porque: "Mito. Rosto ou nome de pessoa real é proibido. Persona 100% original." },
  { f: "Plano anual ajuda a diminuir o cancelamento.", ok: true, porque: "Verdade. Quem paga o ano tem menos momentos para desistir." },
  { f: "Prazo de oferta pode ser prorrogado sem problema.", ok: false, porque: "Mito. Prazo falso ensina o cliente a esperar e queima a confiança." },
  { f: "Ticket médio sobe com upsell logo depois da compra.", ok: true, porque: "Verdade. É o momento de maior confiança do cliente." },
  { f: "Hashtag é o que mais faz um post viralizar.", ok: false, porque: "Mito. Retenção, salvamentos e compartilhamentos pesam muito mais." },
  { f: "A persona deve ter aparência sempre claramente adulta.", ok: true, porque: "Verdade. Regra inegociável." },
  { f: "Se o print do resultado for editado ninguém percebe.", ok: false, porque: "Mito e antiético. Prova social só vale se for real." },
  { f: "Responder rápido no direct aumenta a conversão.", ok: true, porque: "Verdade. Lead quente esfria em minutos." },
  { f: "Ter várias personas ao mesmo tempo acelera o resultado de quem está começando.", ok: false, porque: "Mito. Uma persona bem feita e testada por 30 dias rende mais que cinco pela metade." },
  { f: "Pedir dados de cartão pelo direct é normal.", ok: false, porque: "Mito. Pagamento só por link seguro. Nunca peça dados de cartão no chat." },
];

/* ---------- Duelo de posts ---------- */
export type Duelo = { ctx: string; a: string; b: string; certa: 0 | 1; porque: string };
export const DUELOS: Duelo[] = [
  { ctx: "Legenda", a: "Bom dia! Mais um post pra vocês 💕", b: "Eu quase desisti no mês 2. O que me fez continuar 👇", certa: 1, porque: "B cria curiosidade e conta uma história. A não dá motivo para ler." },
  { ctx: "Capa do Reels", a: "3 erros que travam sua primeira venda", b: "Vídeo sobre vendas", certa: 0, porque: "Número + dor específica na capa vence o genérico." },
  { ctx: "Chamada para ação", a: "Link na bio 😉", b: "Comenta QUERO que eu te mando o link no direct", certa: 1, porque: "CTA com ação simples gera comentários e conversa no direct, que converte mais." },
  { ctx: "Story de oferta", a: "Promoção! Corre!", b: "Só até 23h59 de hoje: anual com bônus. Depois volta ao normal.", certa: 1, porque: "Prazo real e oferta clara. A não diz o quê nem até quando." },
  { ctx: "Bio", a: "Persona criada com IA ✨ Bastidores, rotina e conteúdo exclusivo ↓", b: "Sou eu 😜", certa: 0, porque: "A diz quem é, o que a pessoa recebe e já é transparente sobre IA." },
  { ctx: "Carrossel", a: "Slide 1: Meu método completo (leia tudo)", b: "Slide 1: Você está perdendo assinantes por ISSO →", certa: 1, porque: "O primeiro slide é um gancho. B promete uma resposta e puxa o próximo slide." },
  { ctx: "Horário", a: "Postar quando o seu público está online (vi nos insights)", b: "Postar quando der tempo", certa: 0, porque: "Insights mostram quando seu público está ativo. Use os dados." },
  { ctx: "Prova social", a: "Print real de um feedback, com nome escondido", b: "\"Todo mundo ama meu conteúdo\"", certa: 0, porque: "Prova concreta vence afirmação vaga. E proteja os dados de quem comprou." },
  { ctx: "Reels", a: "Começa com logo animada de 4 segundos", b: "Começa já na frase mais forte do vídeo", certa: 1, porque: "Ninguém espera a logo. A frase forte segura nos 2 primeiros segundos." },
  { ctx: "Mensagem de boas-vindas", a: "Obrigado por assinar! Comece por aqui: [3 conteúdos favoritos]", b: "Obrigado.", certa: 0, porque: "Boas-vindas guiadas fazem o assinante consumir logo e reduzem o cancelamento." },
  { ctx: "Preço", a: "R$ 29,90/mês", b: "R$ 29,90/mês · ou R$ 0,99 por dia, menos que um café", certa: 1, porque: "Ancorar o preço no custo diário reduz a percepção de caro." },
  { ctx: "Sequência de stories", a: "10 stories seguidos de foto sem texto", b: "Pergunta na caixinha → resposta → bastidor → oferta", certa: 1, porque: "Sequência com narrativa e interação aquece até a oferta." },
];

/* ---------- Memória do operador (pares termo ↔ significado) ---------- */
export type Par = { t: string; d: string };
export const PARES: Par[] = [
  { t: "Churn", d: "% de assinantes que cancelam no mês" },
  { t: "Ticket médio", d: "Faturamento ÷ número de vendas" },
  { t: "CPA", d: "Quanto custa cada venda no anúncio" },
  { t: "Upsell", d: "Oferta extra logo após a compra" },
  { t: "Gancho", d: "Frase que segura nos 2 primeiros segundos" },
  { t: "CTA", d: "A chamada para a ação: comente, clique, assine" },
  { t: "Funil", d: "Caminho do seguidor até a compra" },
  { t: "Persona", d: "Personagem com nome, estilo e rotina definidos" },
  { t: "Recorrência", d: "Receita que se repete todo mês" },
  { t: "Prova social", d: "Resultado real que gera confiança" },
  { t: "Conversão", d: "% de visitantes que viram clientes" },
  { t: "Orgânico", d: "Alcance sem pagar anúncio" },
  { t: "Lead", d: "Pessoa interessada que ainda não comprou" },
  { t: "Retenção", d: "Quanto tempo o assinante continua pagando" },
];

/* ---------- Calcula o caixa (geradas a cada partida) ---------- */
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const inteiro = (min: number, max: number, passo = 1) => min + passo * Math.floor(Math.random() * ((max - min) / passo + 1));

function opcoesNumero(certo: number, fmt: (v: number) => string, desvios: number[]) {
  const set = new Set<number>([certo]);
  for (const d of embaralhar(desvios)) {
    const v = Math.round(certo * d * 100) / 100;
    if (v > 0 && !set.has(v)) set.add(v);
    if (set.size === 4) break;
  }
  const ops = embaralhar([...set]);
  return { ops: ops.map(fmt), certa: ops.indexOf(certo) };
}

const GERADORES: (() => Pergunta)[] = [
  () => {
    const n = inteiro(40, 300, 10);
    const p = pick([19.9, 29.9, 39.9, 49.9]);
    const r = Math.round(n * p * 100) / 100;
    return { ctx: "Faturamento", q: `${n} assinantes pagando ${brl(p)} por mês. Quanto entra no mês?`, ...opcoesNumero(r, brl, [0.5, 0.9, 1.1, 2, 10]), porque: `${n} × ${brl(p)} = ${brl(r)}. Assinantes × ticket = faturamento recorrente.` };
  },
  () => {
    const v = inteiro(1000, 9000, 500);
    const c = pick([2, 3, 4, 5]);
    const r = (v * c) / 100;
    return { ctx: "Conversão", q: `${v.toLocaleString("pt-BR")} visitas na página e ${c}% de conversão. Quantas vendas?`, ...opcoesNumero(r, (x) => String(x), [0.5, 2, 10, 1.5]), porque: `${v.toLocaleString("pt-BR")} × ${c}% = ${r} vendas.` };
  },
  () => {
    const n = inteiro(100, 500, 50);
    const c = pick([5, 10, 20]);
    const r = n - (n * c) / 100;
    return { ctx: "Churn", q: `Você tem ${n} assinantes e ${c}% cancelam no mês. Quantos ficam?`, ...opcoesNumero(r, (x) => String(x), [0.8, 0.9, 1.1, 0.5]), porque: `${c}% de ${n} = ${(n * c) / 100} cancelamentos. ${n} − ${(n * c) / 100} = ${r}.` };
  },
  () => {
    const fat = inteiro(2000, 20000, 1000);
    const vendas = pick([20, 40, 50, 80, 100]);
    const r = Math.round((fat / vendas) * 100) / 100;
    return { ctx: "Ticket médio", q: `${brl(fat)} de faturamento em ${vendas} vendas. Qual é o ticket médio?`, ...opcoesNumero(r, brl, [0.5, 2, 1.25, 0.8]), porque: `${brl(fat)} ÷ ${vendas} = ${brl(r)}.` };
  },
  () => {
    const m = pick([19.9, 29.9, 39.9]);
    const d = pick([20, 30]);
    const anual = Math.round(m * 12 * (1 - d / 100) * 100) / 100;
    const r = Math.round((m * 12 - anual) * 100) / 100;
    return { ctx: "Plano anual", q: `Mensal a ${brl(m)}. O anual tem ${d}% de desconto. Quanto o cliente economiza no ano?`, ...opcoesNumero(r, brl, [0.5, 2, 1.5, 0.25]), porque: `12 × ${brl(m)} = ${brl(Math.round(m * 1200) / 100)}. ${d}% disso = ${brl(r)} de economia.` };
  },
  () => {
    const gasto = inteiro(200, 2000, 100);
    const vendas = pick([10, 20, 25, 40, 50]);
    const r = Math.round((gasto / vendas) * 100) / 100;
    return { ctx: "Custo por venda", q: `Você gastou ${brl(gasto)} em anúncio e fez ${vendas} vendas. Quanto custou cada venda?`, ...opcoesNumero(r, brl, [0.5, 2, 1.5, 10]), porque: `${brl(gasto)} ÷ ${vendas} = ${brl(r)} por venda (CPA). Precisa ser menor que o lucro por venda.` };
  },
  () => {
    const meta = pick([5000, 10000, 20000]);
    const p = pick([25, 40, 50]);
    const r = Math.ceil(meta / p);
    return { ctx: "Meta", q: `Meta de ${brl(meta)} por mês com plano de ${brl(p)}. Quantos assinantes você precisa?`, ...opcoesNumero(r, (x) => String(x), [0.5, 2, 1.25, 0.8]), porque: `${brl(meta)} ÷ ${brl(p)} = ${r} assinantes.` };
  },
  () => {
    const v = inteiro(20, 80, 5);
    const u = pick([10, 20, 25]);
    const pu = pick([30, 50, 70]);
    const r = Math.round(((v * u) / 100) * pu * 100) / 100;
    return { ctx: "Upsell", q: `${v} vendas no mês. ${u}% compram o upsell de ${brl(pu)}. Quanto o upsell rende?`, ...opcoesNumero(r, brl, [0.5, 2, 1.5, 10]), porque: `${u}% de ${v} = ${(v * u) / 100} compras × ${brl(pu)} = ${brl(r)} a mais.` };
  },
];

export const gerarContas = () => sortear(GERADORES).map((g) => g());
