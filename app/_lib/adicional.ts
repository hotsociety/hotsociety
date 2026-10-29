// Adicional no checkout dos planos ("order bump"): Arsenal do Cappu + Networking.
// Quem marca paga junto com o plano e recebe o convite do Discord depois que o pagamento é aprovado.
// O convite em si fica só no servidor (pagamentos.ts → ARSENAL_CONVITE) e só é mostrado para quem pagou.
export const ADICIONAL = {
  id: "arsenal",
  titulo: "Arsenal do Cappu + Networking",
  chamada: "Quero os funis + materiais prontos!",
  texto:
    "Não fica só na teoria: pega junto o Kit de Execução e tenha acesso a tudo que eu usei, validei e testei na prática. Funis validados, scripts pra prospectar e fechar modelos, precificações, ferramentas, respostas pra objeções, checklists e materiais prontos pra copiar, adaptar e executar. E mais o acesso à comunidade de networking no Discord pra trocar ideia com quem tá no corre também.",
  preco: 57,
  de: 87,
  img: "/img/arsenal-cappu.jpg",
} as const;

export type AdicionalId = typeof ADICIONAL.id;
export const adicionalValido = (v: unknown): AdicionalId | null => (v === ADICIONAL.id ? ADICIONAL.id : null);
