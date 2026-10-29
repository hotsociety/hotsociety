// Ferramentas: material pronto para copiar. Campos entre [COLCHETES] podem ser preenchidos na tela antes de copiar.
// Regras de todo o material: maiores de 18, sem nudez em perfil/anúncio/prévia, modelo IA sempre identificada como IA,
// nada que imite pessoa real, e respeito às regras de cada plataforma.

export type ItemFerramenta = { id: string; cat: string; t: string; texto: string; dica?: string };
export type Ferramenta = { id: string; n: string; t: string; d: string; unidade: [string, string]; icon: string; itens: ItemFerramenta[] };

export const FERRAMENTAS: Ferramenta[] = [
  {
    id: "prompts",
    n: "01",
    t: "Prompts de modelo IA",
    d: "Persona, visual e rotina",
    unidade: ["prompt", "prompts"],
    icon: "bot",
    itens: [
      { id: "p1", cat: "Persona", t: "Persona base", texto: "Crie uma persona original, maior de 18 anos, para o nicho [NICHO]. Defina nome, idade, cidade fictícia, rotina, 3 traços de personalidade e o tom de voz. Ela deve ser identificada como IA.", dica: "Comece por aqui. Guarde a resposta: ela vira a base de todos os outros prompts." },
      { id: "p2", cat: "Persona", t: "Ficha completa da persona", texto: "A partir desta persona: [RESUMO DA PERSONA]\nMonte uma ficha com: história de vida em 5 linhas, 10 gostos, 5 coisas que ela não faz, 10 frases típicas, emojis que usa, horários em que costuma postar e 3 assuntos que ela evita. Mantenha tudo coerente e original." },
      { id: "p3", cat: "Persona", t: "Bio do perfil", texto: "Escreva 5 opções de bio com até 150 caracteres para [NOME DA PERSONA], nicho [NICHO]. Tom [TOM DE VOZ], no máximo 2 emojis, uma chamada para o link e a menção \"perfil criado com IA\".", dica: "Teste uma bio por semana e fique com a que der mais cliques no link." },
      { id: "p4", cat: "Visual", t: "Visual consistente", texto: "Retrato editorial de [DESCRIÇÃO DA PERSONA], luz natural, fundo [CENÁRIO], mesma fisionomia da referência, sem semelhança com pessoas reais." },
      { id: "p5", cat: "Visual", t: "Folha de referência", texto: "Folha de referência de personagem: [DESCRIÇÃO DA PERSONA], adulta, vista de frente, perfil e 3/4, mesma roupa casual, fundo neutro cinza, iluminação de estúdio uniforme. Sem logos, sem marcas, sem semelhança com pessoas reais.", dica: "Use essa imagem como referência fixa em todas as gerações para não perder o rosto." },
      { id: "p6", cat: "Visual", t: "Mesma persona em 6 cenários", texto: "Gere 6 imagens de [DESCRIÇÃO DA PERSONA] mantendo o mesmo rosto da referência: 1) café da manhã em casa, 2) academia, 3) praia ao entardecer, 4) viagem em [CIDADE], 5) trabalhando no notebook, 6) jantar com amigas. Roupas do dia a dia, fotos estilo celular, sem nudez." },
      { id: "p7", cat: "Visual", t: "Checagem de consistência", texto: "Compare estas imagens com a referência da persona [NOME DA PERSONA] e aponte: diferenças de rosto, cabelo, tom de pele e proporções; qualquer sinal de idade aparente abaixo de 18; logos ou marcas visíveis; e semelhança com alguém famoso. Liste o que refazer.", dica: "Rode antes de postar qualquer lote novo." },
      { id: "p8", cat: "Rotina", t: "Rotina de 7 dias", texto: "Monte um calendário de 7 dias de conteúdo para [PERSONA]: 1 post de feed, 3 stories e 1 prévia por dia, com tema e chamada para assinar." },
      { id: "p9", cat: "Rotina", t: "Calendário de 30 dias por temas", texto: "Crie um calendário de 30 dias para [PERSONA] dividido em 4 semanas temáticas: [TEMA 1], [TEMA 2], [TEMA 3], [TEMA 4]. Para cada dia: ideia de post, ideia de story interativo e o gancho da prévia. Sem nudez no que vai para o perfil aberto." },
      { id: "p10", cat: "Rotina", t: "Stories interativos", texto: "Liste 15 ideias de stories interativos para [PERSONA] no nicho [NICHO]: 5 enquetes, 5 caixinhas de pergunta e 5 quizzes. Cada uma com o texto pronto e o objetivo (engajar, conhecer o público ou levar ao link)." },
      { id: "p11", cat: "Legenda", t: "10 legendas de prévia", texto: "Escreva 10 legendas curtas para prévias de [PERSONA] sobre [TEMA DO CONTEÚDO]. Cada uma com curiosidade, sem descrever conteúdo explícito, e uma chamada clara para assinar. Varie o início de cada legenda." },
      { id: "p12", cat: "Chat", t: "Guia de voz no chat", texto: "Escreva um guia de como [PERSONA] conversa no chat: como cumprimenta, como responde elogios, como apresenta o conteúdo pago sem pressionar, como encerra a conversa e o que ela nunca diz. Ela sempre confirma que é uma IA quando perguntada." },
    ],
  },
  {
    id: "abordagens",
    n: "02",
    t: "Abordagens modelo real",
    d: "Conversas que vendem sem nudez",
    unidade: ["script", "scripts"],
    icon: "chat",
    itens: [
      { id: "a1", cat: "Boas-vindas", t: "Boas-vindas ao assinante", texto: "Oi, [NOME]! Que bom te ver por aqui. Separei um conteúdo especial pra quem chegou hoje. Me conta: o que te trouxe até mim?", dica: "Mande nos primeiros minutos. A pergunta no final abre a conversa." },
      { id: "a2", cat: "Boas-vindas", t: "Conhecer o gosto do assinante", texto: "[NOME], quero caprichar no que eu posto pra você. Qual desses você curte mais: [OPÇÃO 1], [OPÇÃO 2] ou [OPÇÃO 3]? Responde só com o número 😉" },
      { id: "a3", cat: "Objeção", t: "Resposta para \"tá caro\"", texto: "Entendo! Por isso a assinatura tem o primeiro mês com valor de entrada. Se não curtir, cancela quando quiser. Bora testar?" },
      { id: "a4", cat: "Objeção", t: "\"Vou pensar\"", texto: "Tranquilo, [NOME], sem pressa! Só pra você saber: o conteúdo de [TEMA] fica disponível até [DATA]. Se tiver qualquer dúvida, me chama aqui." },
      { id: "a5", cat: "Venda", t: "Oferta de conteúdo exclusivo", texto: "[NOME], gravei um conteúdo novo de [TEMA] e lembrei de você. Fica por [VALOR] e já vai direto aqui no chat. Quer que eu te mande?", dica: "Valor claro e uma pergunta simples. Se a resposta for não, agradeça e siga a conversa normal." },
      { id: "a6", cat: "Venda", t: "Pedido personalizado", texto: "Amei a ideia! Pra fazer do jeito certo, combina comigo: 1) o tema: [TEMA], 2) a duração: [DURAÇÃO], 3) o prazo de entrega: [PRAZO]. O valor fica [VALOR], pago antes de eu começar. Fechado?" },
      { id: "a7", cat: "Limites", t: "Recusar pedido fora dos seus limites", texto: "[NOME], esse tipo de pedido eu não faço, tá? Mas tenho [ALTERNATIVA] que muita gente curte. Se quiser, te mostro." },
      { id: "a8", cat: "Limites", t: "Mensagem desrespeitosa", texto: "Aqui a conversa é sempre com respeito. Se continuar nesse tom, vou precisar encerrar o chat. Se quiser recomeçar numa boa, tô aqui." },
      { id: "a9", cat: "Retenção", t: "Lembrete de renovação", texto: "Oi, [NOME]! Sua assinatura renova em [DIAS] dias. Esse mês vem aí: [NOVIDADE 1] e [NOVIDADE 2]. Quero muito você comigo nessa!" },
      { id: "a10", cat: "Retenção", t: "Reativar quem cancelou", texto: "[NOME], senti sua falta por aqui! Muita coisa nova desde que você saiu: [NOVIDADE]. Pra voltar, liberei [CONDIÇÃO ESPECIAL] até [DATA]." },
      { id: "a11", cat: "Retenção", t: "Agradecer gorjeta", texto: "Nossa, [NOME], obrigada de verdade! Isso me ajuda demais a continuar criando. Tem algum tema que você quer ver no próximo post?" },
      { id: "a12", cat: "Engajamento", t: "Enquete do próximo conteúdo", texto: "Votação aberta! O próximo conteúdo vai ser: 1) [OPÇÃO 1] 2) [OPÇÃO 2] 3) [OPÇÃO 3]. O mais votado até [DATA] sai primeiro!" },
    ],
  },
  {
    id: "trafego-pago",
    n: "03",
    t: "Tráfego pago",
    d: "Estruturas e criativos",
    unidade: ["playbook", "playbooks"],
    icon: "target",
    itens: [
      { id: "t1", cat: "Estrutura", t: "Estrutura de campanha", texto: "1 campanha · 3 conjuntos (interesses, amplo, lookalike) · 3 criativos por conjunto · orçamento igual · avaliar em 72 h." },
      { id: "t2", cat: "Regras", t: "Checklist de política antes de subir", texto: "☐ Criativo sem nudez e sem insinuação explícita\n☐ Texto sem promessas de conteúdo adulto\n☐ Página de destino de acordo com as regras da plataforma de anúncio\n☐ Público configurado só para maiores de 18\n☐ Nenhuma imagem de pessoa real sem autorização\n☐ Link testado e abrindo no celular", dica: "Anúncio reprovado várias vezes pode travar a conta inteira. Confira tudo antes de publicar." },
      { id: "t3", cat: "Criativo", t: "Roteiro de vídeo de 15 s", texto: "0–3 s: gancho visual + frase \"[GANCHO]\"\n3–10 s: mostre o dia a dia / bastidor de [TEMA]\n10–15 s: chamada \"[CHAMADA]\" com o @ na tela\nFormato vertical 9:16, legenda na tela, sem música com direitos autorais." },
      { id: "t4", cat: "Criativo", t: "10 ganchos de abertura", texto: "Escreva 10 ganchos de até 7 palavras para um vídeo de [NICHO], focados em curiosidade e bastidor, sem conteúdo adulto e sem promessas exageradas. Varie o formato: pergunta, número, contraste, segredo, erro comum." },
      { id: "t5", cat: "Copy", t: "3 copies curtas de anúncio", texto: "Versão 1 (curiosidade): \"[GANCHO]. O resto eu mostro no perfil.\"\nVersão 2 (rotina): \"Um dia comigo em [CIDADE]. Vem acompanhar 👇\"\nVersão 3 (convite): \"Se você curte [TEMA], vai gostar do meu perfil.\"" },
      { id: "t6", cat: "Teste", t: "Teste A/B de criativos", texto: "Mude uma coisa por vez: primeiro o gancho, depois a imagem/vídeo, depois o texto. Mesmo público e mesmo orçamento nos dois. Decida pelo custo por clique no link depois de [NÚMERO DE CLIQUES] cliques em cada versão.", dica: "Testar duas mudanças ao mesmo tempo esconde o que realmente funcionou." },
      { id: "t7", cat: "Orçamento", t: "Começar e escalar", texto: "Comece com [VALOR DIÁRIO] por conjunto. Depois de 3 dias, pause o pior conjunto. Aumente o orçamento do melhor em até 20% a cada 48 h enquanto o custo por assinante continuar dentro da sua meta de [META CPA]." },
      { id: "t8", cat: "Métricas", t: "O que olhar todo dia", texto: "CTR (taxa de clique) · CPC (custo por clique) · CPM (custo por mil) · cliques no link · custo por assinante.\nCompare sempre com a média dos seus últimos 7 dias, não com números de outras pessoas." },
      { id: "t9", cat: "Métricas", t: "Quando pausar um anúncio", texto: "Pause se: gastou [X] vezes o valor da assinatura sem nenhum assinante · CTR caiu pela metade em relação à primeira semana · comentários negativos ou denúncias começaram a aparecer." },
      { id: "t10", cat: "Estrutura", t: "Remarketing", texto: "Crie um público com quem visitou o perfil ou clicou no link nos últimos [DIAS] dias. Mostre um criativo diferente, com prova (bastidor, rotina) e chamada direta. Exclua quem já assina." },
    ],
  },
  {
    id: "trafego-organico",
    n: "04",
    t: "Tráfego orgânico",
    d: "Perfis, rotina e alcance",
    unidade: ["rotina", "rotinas"],
    icon: "fire",
    itens: [
      { id: "o1", cat: "Rotina", t: "Rotina diária", texto: "Manhã: 1 reels + 3 stories. Tarde: responder comentários e DMs. Noite: 1 prévia com chamada para o link da bio." },
      { id: "o2", cat: "Rotina", t: "30 minutos de interação", texto: "10 min: responder todos os comentários do último post\n10 min: comentar em 10 perfis do mesmo nicho (comentário de verdade, não emoji)\n10 min: responder DMs e caixinhas", dica: "Faça logo depois de postar: o começo define o alcance do post." },
      { id: "o3", cat: "Perfil", t: "Bio que converte", texto: "Linha 1: quem é você em 5 palavras ([NICHO])\nLinha 2: o que a pessoa encontra ([BENEFÍCIO])\nLinha 3: prova ou detalhe pessoal ([DETALHE])\nLinha 4: chamada para o link 👇" },
      { id: "o4", cat: "Perfil", t: "5 destaques do perfil", texto: "1) Comece aqui (quem sou) · 2) Rotina · 3) Bastidores · 4) Perguntas frequentes · 5) Link (como assinar).\nCapas no mesmo estilo e cores do perfil." },
      { id: "o5", cat: "Conteúdo", t: "10 ideias de reels sem nudez", texto: "1) Arrume-se comigo 2) Um dia na minha rotina 3) O que eu como em um dia 4) Treino rápido 5) Bastidor de uma sessão de fotos 6) Respondendo perguntas 7) Antes e depois de um look 8) Trend do momento adaptada 9) Viagem/passeio 10) Erros que eu cometi no começo" },
      { id: "o6", cat: "Conteúdo", t: "Carrossel que salva", texto: "Slide 1: título-gancho ([GANCHO])\nSlides 2–6: uma dica por slide, frase curta + imagem\nSlide 7: resumo\nSlide 8: chamada (\"salva pra não esquecer\" e o @)" },
      { id: "o7", cat: "Conteúdo", t: "Semana por pilares", texto: "Seg: rotina · Ter: dica do nicho [NICHO] · Qua: bastidor · Qui: pergunta/enquete · Sex: trend · Sáb: lifestyle · Dom: resumo da semana + chamada para o link" },
      { id: "o8", cat: "Alcance", t: "Palavras-chave e hashtags", texto: "Use 3 a 5 hashtags específicas de [NICHO] e coloque as palavras-chave do nicho na legenda e no nome do perfil: a busca das redes lê o texto, não só as hashtags." },
      { id: "o9", cat: "Alcance", t: "Collab com outros perfis", texto: "Oi, [NOME DO PERFIL]! Curto muito seu conteúdo de [TEMA]. Topa fazer um post em collab? Pensei em [IDEIA]. A gente divide o alcance e as duas ganham seguidoras." },
      { id: "o10", cat: "Alcance", t: "Um conteúdo, várias redes", texto: "Grave uma vez em 9:16 sem marca d'água. Publique em [REDE 1] primeiro; depois de 24 h, poste em [REDE 2] e [REDE 3] com legenda adaptada para cada uma." },
      { id: "o11", cat: "Segurança", t: "Proteger a conta", texto: "☐ Verificação em duas etapas ligada\n☐ E-mail e telefone de recuperação atualizados\n☐ Nada de nudez nem link proibido no perfil aberto\n☐ Backup mensal dos seus conteúdos\n☐ Um perfil reserva já criado e aquecido", dica: "Se a conta cair, abra um chamado \"Conta banida\" no Suporte." },
    ],
  },
  {
    id: "funil",
    n: "05",
    t: "Funil operacional",
    d: "Do perfil ao saque",
    unidade: ["checklist", "checklists"],
    icon: "grid",
    itens: [
      { id: "f1", cat: "Mapa", t: "Mapa do funil", texto: "Perfil → prévia → link da bio → página de assinatura → boas-vindas → conteúdo fechado → upsell → renovação." },
      { id: "f2", cat: "Checklist", t: "Perfil pronto", texto: "☐ Foto e nome fáceis de reconhecer\n☐ Bio com chamada para o link\n☐ Link testado no celular\n☐ 5 destaques organizados\n☐ 9 primeiros posts no mesmo estilo" },
      { id: "f3", cat: "Checklist", t: "Prévia que leva ao link", texto: "☐ Mostra contexto e corta antes do ponto alto\n☐ Sem nudez\n☐ Uma chamada clara para assinar\n☐ Não repete o que está no conteúdo fechado" },
      { id: "f4", cat: "Checklist", t: "Página de assinatura", texto: "☐ Preço definido ([PREÇO]) e promoção de entrada, se tiver\n☐ Bio da página explicando o que a pessoa recebe\n☐ Post fixado de boas-vindas\n☐ Mensagem automática de boas-vindas ligada" },
      { id: "f5", cat: "Checklist", t: "Primeiras 24 h do assinante", texto: "☐ Boas-vindas enviada\n☐ Pergunta para conhecer o gosto dele\n☐ Um conteúdo de presente\n☐ Anotação do que ele curte (para ofertas futuras)" },
      { id: "f6", cat: "Checklist", t: "Retenção do mês", texto: "☐ Calendário do mês publicado para os assinantes\n☐ 1 enquete por semana\n☐ Lembrete 3 dias antes da renovação\n☐ Mensagem para quem cancelou" },
      { id: "f7", cat: "Checklist", t: "Saque e financeiro", texto: "☐ Conferir as taxas da plataforma no extrato\n☐ Separar a parte dos impostos assim que o dinheiro entrar\n☐ Guardar o extrato do mês\n☐ Enviar o comprovante em Prêmios → Comprovar faturamento para subir de país na rota" },
      { id: "f8", cat: "Métricas", t: "Números da semana", texto: "Visitas no perfil: [VISITAS] · Cliques no link: [CLIQUES] · Novos assinantes: [NOVOS] · Cancelamentos: [CANCELAMENTOS] · Faturamento: R$ [VALOR]\nConversão do link = novos assinantes ÷ cliques no link." },
    ],
  },
];

export const FUNIL = [
  ["Perfil", "Orgânico e pago atraem"],
  ["Prévia", "Desperta curiosidade"],
  ["Conversa", "Script e relacionamento"],
  ["Assinatura", "Página e preço"],
  ["Retenção", "Conteúdo e renovação"],
] as const;

// Campos [ASSIM] dentro do texto.
export const camposDe = (t: string) => [...new Set(t.match(/\[[^\]]+\]/g) ?? [])];
