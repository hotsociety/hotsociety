// Produtos da Biblioteca (aba Módulos). Cada um tem uma cor neon (tom). O 01 é a Hot Academy, incluída na assinatura.
// Os demais ficam presos por corrente e cadeado até o aluno ter acesso.
//
// Para colocar um produto à venda: crie o item com o mesmo id em ITENS_PAGOS (_lib/loja.ts),
// com título e preço. A compra usa o checkout de sempre (/assinar?item=<id>) e, paga,
// o produto aparece desbloqueado (a corrente quebra na primeira vez que o aluno o vê).
import { IMG } from "./demo";

export type ProdutoBib = {
  id: string; // também é o id do item da loja (ex.: "p2")
  no: string;
  titulo: string;
  sub?: string;
  desc: string;
  img: string;
  tom: string;
  tipo: "curso" | "mentoria";
  incluso?: boolean; // vem com a assinatura
  destaques: { k: string; t: string; d: string }[]; // blocos que passam ao rolar a página
};

const EM_BREVE = [
  { k: "Em preparação", t: "Um produto novo", d: "O time está gravando e montando este produto. Quando abrir, ele aparece aqui com tudo o que tem dentro." },
  { k: "Como liberar", t: "Quebre a corrente", d: "Na abertura você vê o preço, paga o acesso no Pix ou no cartão e a corrente quebra na hora. As aulas ficam liberadas na sua conta." },
  { k: "Na sua conta", t: "Fica com você", d: "O que você libera aparece na Biblioteca e no Inventário, junto com o seu progresso, XP e certificado." },
];

export const BIBLIOTECA: ProdutoBib[] = [
  {
    id: "hot-academy",
    no: "01",
    titulo: "Hot Academy",
    sub: "Produto 1",
    desc: "O passo a passo do Cappu, do absoluto zero à operação na gringa: 9 módulos e 85 aulas, todos liberados na sua assinatura.",
    img: IMG.academy,
    tom: "#FFC83D",
    tipo: "curso",
    incluso: true,
    destaques: [
      { k: "Do zero", t: "9 módulos, 85 aulas", d: "Da introdução com o Cappu até a operação na gringa: prospecção, X1, modelos de IA, operacional, white, tráfego e agência." },
      { k: "Com IA do lado", t: "CappuIA nas aulas", d: "Travou numa aula? A CappuIA responde na hora e aponta o módulo e a aula certos para você rever." },
      { k: "Na assinatura", t: "Tudo liberado", d: "Todas as aulas já estão abertas para você. Seu progresso, XP e placas contam a cada aula concluída." },
    ],
  },
  { id: "p2", no: "02", titulo: "Produto 2", sub: "Em breve", desc: "Novo produto da HOT SOCIETY em preparação. Quando abrir, ele aparece aqui com o preço: você paga o acesso, a corrente quebra e todas as aulas ficam liberadas.", img: IMG.teleferico, tom: "#2FF3FF", tipo: "curso", destaques: EM_BREVE },
  { id: "p3", no: "03", titulo: "Produto 3", sub: "Em breve", desc: "Novo produto da HOT SOCIETY em preparação. Quando abrir, ele aparece aqui com o preço: você paga o acesso, a corrente quebra e todas as aulas ficam liberadas.", img: IMG.chile, tom: "#FF3DD1", tipo: "curso", destaques: EM_BREVE },
  { id: "p4", no: "04", titulo: "Produto 4", sub: "Em breve", desc: "Novo produto da HOT SOCIETY em preparação. Quando abrir, ele aparece aqui com o preço: você paga o acesso, a corrente quebra e todas as aulas ficam liberadas.", img: IMG.m4, tom: "#9D6BFF", tipo: "curso", destaques: EM_BREVE },
  {
    id: "ht",
    no: "05",
    titulo: "Mentoria High Ticket",
    sub: "Mônaco",
    desc: "Acompanhamento direto com o Cappu, em turma pequena. O topo da rota: você aplica, o time conversa com você e, aprovado, a corrente quebra e a mentoria abre.",
    img: IMG.mentoria,
    tom: "#3DFF9A",
    tipo: "mentoria",
    destaques: [
      { k: "Turma pequena", t: "Direto com o Cappu", d: "Encontros ao vivo, plano de ação e acompanhamento de perto, com poucas vagas por turma." },
      { k: "Por aplicação", t: "Você aplica", d: "Conte onde está e onde quer chegar. O time responde em até 48 horas e conversa com você antes de abrir a vaga." },
      { k: "O topo da rota", t: "Mônaco", d: "Aprovado, a corrente quebra e a mentoria abre: encontros, gravações e chat da turma, tudo dentro da plataforma." },
    ],
  },
];

export const CHAVE_QUEBRADO = (id: string) => `hs-bib-quebrado-${id}`;
