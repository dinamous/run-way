# CLAUDE.md — Capacity Dashboard

Aplicação web de capacity planning. Gerir demandas com fases de entrega, visualizar em calendário/Gantt, dados no Supabase.

**Stack:** React 19 · TypeScript 5.9 · Vite 8 · Tailwind CSS 4 · Supabase

## Comandos

```bash
npm run dev       # localhost:5173
npm run build     # tsc + vite build
npm run lint      # ESLint
```

## Modelo de Dados

**Task:** `id, title, clickupLink?, assignee, status ('backlog'|'em andamento'|'bloqueado'|'concluído'), phases {design,approval,dev,qa} cada com {start,end} YYYY-MM-DD, createdAt`

**Member:** `id, name, role ('Designer'|'Developer'), avatar (iniciais)`

**Fases:** Design (5d, violeta) → Approval (3d, laranja) → Dev (7d, azul) → QA (3d, esmeralda). Cascata automática.

## Convenções

- UI em Português PT-BR; código em inglês
- Datas: `YYYY-MM-DD`, parse com `new Date(str + 'T00:00:00')`
- Tailwind v4 (plugin Vite, sem tailwind.config.js)
- Commits: Conventional Commits + gitmoji, em português
- Usar `src/components/ui/` antes de criar novos componentes
- Estado global em `App.tsx`; local no componente
- Imports: usar alias `@/` para paths fora do módulo local (ex: `@/hooks/useAuth`, `@/components/ui`). Manter `./` apenas para imports dentro do mesmo módulo/pasta
- Sem abstrações prematuras
- Views devem ser pastas (`src/views/<nome>/`) com componentes, hooks e `index.ts` — nunca arquivos monolíticos
- **Co-location:** componentes e hooks **privados** de uma view ficam dentro dela (`views/<nome>/components/`, `views/<nome>/hooks/`). Só sobem para `src/components/` ou `src/hooks/` quando usados por 2+ views
- `.env` nunca commitado

## Docs (ler sob demanda — NÃO carregar tudo de uma vez)

| Quando precisar de... | Ler |
|---|---|
| Estrutura, fluxo de dados, decisões | [docs/architecture.md](docs/architecture.md) |
| DashboardView, Calendar, Timeline, drag-drop | [docs/views/dashboard.md](docs/views/dashboard.md) |
| MembersView, capacidade | [docs/views/members.md](docs/views/members.md) |
| TaskModal, cascata de fases | [docs/components/task-modal.md](docs/components/task-modal.md) |
| Design system (Button, Input, Label, Badge) | [docs/components/ui.md](docs/components/ui.md) |
| useSupabase, CRUD, steps | [docs/hooks/supabase.md](docs/hooks/supabase.md) |
| useAuth, login | [docs/hooks/auth.md](docs/hooks/auth.md) |
| useFormState | [docs/hooks/form-state.md](docs/hooks/form-state.md) |
| dateUtils, dias úteis, cascadePhases | [docs/utils/date-utils.md](docs/utils/date-utils.md) |
| Convenções, padrões, env vars | [docs/guidelines.md](docs/guidelines.md) |
| TODOs e melhorias pendentes | [docs/todo/melhorias.md](docs/todo/melhorias.md) |
| TODO: upsert steps (detalhado) | [docs/todo/upsert-steps.md](docs/todo/upsert-steps.md) |
