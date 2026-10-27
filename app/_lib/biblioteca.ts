// Trilha de produtos da aba Módulos. O 01 é a Hot Academy (na assinatura).
// Cada produto libera quando o aluno conclui o anterior (100% das aulas).
// A Mentoria também libera para quem for aprovado na aplicação (mentorado).
//
// Para dar nome e conteúdo a um produto novo: troque título, sub e descrição aqui
// e preencha `previa` com os nomes dos módulos (o aluno vê, travados, antes de liberar).

export type ProdutoBib = {
  id: string;
  no: string;
  titulo: string;
  sub: string;
  desc: string;
  tipo: "curso" | "mentoria";
  incluso?: boolean;
  previa: string[]; // módulos que o aluno vê travados (os da Hot Academy vêm do curso)
};

const EM_BREVE = ["Módulo 01", "Módulo 02", "Módulo 03", "Módulo 04", "Módulo 05"];

export const BIBLIOTECA: ProdutoBib[] = [
  {
    id: "hot-academy",
    no: "01",
    titulo: "Hot Academy",
    sub: "Do zero à gringa",
    desc: "O passo a passo do Cappu: 9 módulos e 85 aulas, liberados na sua assinatura.",
    tipo: "curso",
    incluso: true,
    previa: [],
  },
  { id: "p2", no: "02", titulo: "Produto 2", sub: "Em breve", desc: "O próximo passo depois da Hot Academy. Conteúdo em preparação.", tipo: "curso", previa: EM_BREVE },
  { id: "p3", no: "03", titulo: "Produto 3", sub: "Em breve", desc: "Libera quando você concluir o Produto 2. Conteúdo em preparação.", tipo: "curso", previa: EM_BREVE },
  { id: "p4", no: "04", titulo: "Produto 4", sub: "Em breve", desc: "Libera quando você concluir o Produto 3. Conteúdo em preparação.", tipo: "curso", previa: EM_BREVE },
  {
    id: "ht",
    no: "05",
    titulo: "Mentoria High Ticket",
    sub: "Mônaco",
    desc: "O topo da rota: acompanhamento direto com o Cappu, em turma pequena.",
    tipo: "mentoria",
    previa: ["Encontros ao vivo", "Plano de ação", "Gravações", "Chat da turma"],
  },
];

export const CHAVE_LIBERADO = (id: string) => `hs-prod-liberado-${id}`;
