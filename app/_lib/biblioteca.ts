// Produtos da Biblioteca (aba Módulos). O 01 é a Hot Academy, incluída na assinatura.
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
};

export const BIBLIOTECA: ProdutoBib[] = [
  {
    id: "hot-academy",
    no: "01",
    titulo: "Hot Academy",
    sub: "Produto 1",
    desc: "O passo a passo do Cappu, do absoluto zero à operação na gringa. Todas as aulas liberadas na sua assinatura.",
    img: IMG.academy,
    tom: "#C9A24E",
    tipo: "curso",
    incluso: true,
  },
  { id: "p2", no: "02", titulo: "Produto 2", sub: "Em breve", desc: "Um novo produto da HOT SOCIETY está chegando. Quando abrir, você desbloqueia por aqui.", img: IMG.teleferico, tom: "#D98A3D", tipo: "curso" },
  { id: "p3", no: "03", titulo: "Produto 3", sub: "Em breve", desc: "Um novo produto da HOT SOCIETY está chegando. Quando abrir, você desbloqueia por aqui.", img: IMG.chile, tom: "#3E7C86", tipo: "curso" },
  { id: "p4", no: "04", titulo: "Produto 4", sub: "Em breve", desc: "Um novo produto da HOT SOCIETY está chegando. Quando abrir, você desbloqueia por aqui.", img: IMG.m4, tom: "#8E2F45", tipo: "curso" },
  {
    id: "ht",
    no: "05",
    titulo: "Mentoria High Ticket",
    sub: "Mônaco",
    desc: "Acompanhamento direto com o Cappu, turma pequena. O topo da rota: entrada por aplicação.",
    img: IMG.mentoria,
    tom: "#E6C978",
    tipo: "mentoria",
  },
];

export const CHAVE_QUEBRADO = (id: string) => `hs-bib-quebrado-${id}`;
