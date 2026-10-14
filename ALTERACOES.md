# HOT SOCIETY · front completo

Como aplicar: apague a pasta `app` do projeto, descompacte este zip na raiz do `hot-academy-v2` substituindo tudo, e faça `git add -A`, `git commit` e `git push`.

## Mapa do site

| Rota | O que é | Dados |
|---|---|---|
| `/` | Homepage: hero, rota, recursos, módulos, cursos, placas, comandante, planos, FAQ | Cursos vêm do Supabase (tabela `cursos`) |
| `/login` | Entrar, criar conta, esqueci a senha, Google | Supabase Auth (real) |
| `/curso/[id]` | Página de venda de um curso avulso | Supabase (real) |
| `/termos`, `/privacidade` | Páginas legais (modelo para o advogado revisar) | Texto fixo |
| `/dashboard` | Início da área de membros: passaporte, números, continuar aula, missões, live, ranking, vitórias, cursos avulsos | Cursos reais, o resto exemplo |
| `/dashboard/aulas` | Módulos da Hot Academy com filtro e progresso | Exemplo |
| `/dashboard/aulas/[modulo]` | Player do módulo com lista de aulas e "Concluir aula" | Exemplo |
| `/dashboard/jornada` | Rota GRU → SCL → LIS → DXB, faturamento verificado e pedido de placa | Exemplo |
| `/dashboard/comunidade` | Chat por canais, online agora e regras | Exemplo |
| `/dashboard/cappuia` | Assistente com modos, sugestões e créditos | Respostas fixas de exemplo |
| `/dashboard/ferramentas` | Prompts, scripts e playbooks com busca e botão Copiar | Exemplo |
| `/dashboard/conquistas` | Nível, medalhas e ranking (temporada e geral) | Exemplo |
| `/dashboard/suporte` | Temas, perguntas frequentes, abrir chamado, seus chamados | Exemplo |
| `/dashboard/perfil` | Dados da conta, troca de senha, assinatura e sair | Nome e senha salvam de verdade no Supabase Auth |

Tudo em `/dashboard` é protegido: sem login, volta para `/login` e depois retorna para a mesma página.

## Responsividade

- Celular (até 640 px): topo com XP e avatar, barra inferior com Início, Aulas, Comunidade, CappuIA e "Mais".
- Tablet (641 a 1024 px): trilho de ícones à esquerda.
- PC (1025 px ou mais): barra lateral completa com nome, nível e temporada.

## Onde mexer

| Arquivo | Para quê |
|---|---|
| `app/_lib/site.ts` | Textos da home, preços, planos, módulos da vitrine, FAQ e links de checkout |
| `app/_lib/demo.ts` | **Todos os dados de exemplo da área de membros.** Troque por consultas ao Supabase tela por tela |
| `app/_lib/supabase.ts` | Cliente do Supabase (lê as variáveis de ambiente) |
| `app/_lib/cursos.ts` | Tipo `Curso`, preço em R$ e checagem do `callback` |
| `app/_components/membros/MemberShell.tsx` | Menu da área de membros e proteção de login. A lista `NAV` define os itens |
| `app/_components/membros/ui.module.css` | Cartões, botões, abas e selos usados em todas as telas de membros |
| `app/globals.css` | Cores e fontes da marca (`--gold`, `--breu` etc.) |

## Variáveis de ambiente (Vercel e `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_CHECKOUT_MENSAL=https://link-do-gateway/mensal
NEXT_PUBLIC_CHECKOUT_ANUAL=https://link-do-gateway/anual
```

## Tabela `cursos`

Colunas usadas: `id`, `titulo`, `descricao` (opcional), `preco` (número em reais; vazio ou 0 aparece como "Grátis"). No RLS, libere só `select` público.

## Pode apagar

- A pasta `lib/` da raiz (agora está em `app/_lib`).
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`.

## Cuidados com o Next 16 deste projeto

- Sem Tailwind: o visual é todo em CSS Modules.
- Imports relativos (`../_lib/...`) em vez de `@/`, então o build não depende do `tsconfig`.
- `cacheComponents: true`: nenhum Server Component lê data/hora fora do `<Suspense>`.
- `next/image` usa `preload` no lugar de `priority`.
- Nenhuma dependência nova no `package.json`.

## Próximos passos (backend)

1. Tabelas de progresso: `aulas`, `progresso_aulas`, `missoes_feitas`, `xp`.
2. Comunidade em tempo real: tabela `mensagens` + Supabase Realtime.
3. CappuIA real: uma rota `/api/cappuia` chamando a IA.
4. Assinatura: webhook do gateway gravando o plano e liberando `/dashboard` só para quem paga.
