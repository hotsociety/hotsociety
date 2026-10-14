# HOT SOCIETY

Plataforma de assinatura HOT SOCIETY, feita com Next.js 16 (App Router), React 19, TypeScript, CSS Modules e Supabase.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Variáveis de ambiente (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_CHECKOUT_MENSAL=https://link-do-gateway/mensal
NEXT_PUBLIC_CHECKOUT_ANUAL=https://link-do-gateway/anual
```

## Estrutura

- `app/page.tsx` — homepage
- `app/login`, `app/curso/[id]` — login e página de curso
- `app/dashboard/*` — área de membros (início, aulas, jornada, comunidade, CappuIA, ferramentas, conquistas, suporte, perfil)
- `app/_lib/demo.ts` — dados de exemplo da área de membros
- `app/termos`, `app/privacidade` — páginas legais
- `app/_components` — componentes (pastas com `_` não viram rota)
- `app/_lib/site.ts` — textos, preços, módulos e FAQ da homepage
- `public/brand`, `public/img` — logo, símbolo e fotos

## Scripts

- `npm run dev` — desenvolvimento
- `npm run lint` — ESLint
- `npm run build` — build de produção
