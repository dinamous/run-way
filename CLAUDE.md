# CLAUDE.md — Run/Way

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

**Member:** `id, name, role ('Designer'|'Developer'), avatar (iniciais), avatar_url?, email?, auth_user_id?, access_role ('admin'|'user'), is_active?, created_at?, deactivated_at?`

**Fases:** Design (5d, violeta) → Approval (3d, laranja) → Dev (7d, azul) → QA (3d, esmeralda). Cascata automática.

## Branding

- **Nome:** Run/Way
- **Fonte do logo:** Syne 800 (Google Fonts) — usada exclusivamente no nome da marca (`AppHeader`, `LoginView`)
- **Fonte base:** DM Sans (Google Fonts) — aplicada no `body` via `index.css`, usada em todo o restante da UI
- **Ícone do logo:** `LayoutDashboard` (Lucide) — box preta (`bg-black dark:bg-white`), ícone branco (`text-white dark:text-black`) — inverte no dark mode via Tailwind variant
- **Cor primária:** preto (`oklch(0.145 0 0)`) no light mode; branco (`oklch(0.985 0 0)`) no dark mode — definido em `src/index.css` via `--primary` e `--ring`

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
- **Testes:** toda nova feature ou bugfix deve ter testes unitários com Vitest. Rodar com `npm run test:run`. Arquivos de teste ficam em `src/**/__tests__/` co-localizados com o módulo testado

## CI/CD (.github/workflows/)

| Workflow | Trigger | O que faz |
|---|---|---|
| `secrets.yml` | push (todas branches) + PR→main/develop | Scan de secrets com Gitleaks |
| `test.yml` | push (todas branches) + PR→main/develop | Vitest + ESLint em paralelo |
| `codeql.yml` | push/PR→main + domingo 00h UTC | Análise de vulnerabilidades CodeQL |
| `tag-version.yml` | push→main | Tag git automática ao bumpar versão no package.json |
| `no-friday-deploy.yml` | PR→main | Bloqueia merge às sextas-feiras |
| `setup-node.yml` | (workflow reutilizável) | Node 20 + cache npm + npm ci |

## Docs (ler sob demanda — NÃO carregar tudo de uma vez)

| Quando precisar de... | Ler |
|---|---|
| Estrutura, fluxo de dados, decisões | [docs/architecture.md](docs/architecture.md) |
| DashboardView, Calendar, Timeline, drag-drop | [docs/views/dashboard.md](docs/views/dashboard.md) |
| TasksView, filtros, badge de prazo, ActionMenu | [docs/views/tasks.md](docs/views/tasks.md) |
| MembersView, capacidade | [docs/views/members.md](docs/views/members.md) |
| AdminView, UsersPanel, useAdminData, useAdminStore | [docs/views/admin.md](docs/views/admin.md) |
| TaskModal, cascata de fases | [docs/components/task-modal.md](docs/components/task-modal.md) |
| Design system (Button, Input, Label, Badge) | [docs/components/ui.md](docs/components/ui.md) |
| useSupabase, CRUD, steps | [docs/hooks/supabase.md](docs/hooks/supabase.md) |
| useAuth, login | [docs/hooks/auth.md](docs/hooks/auth.md) |
| useFormState | [docs/hooks/form-state.md](docs/hooks/form-state.md) |
| useNotifications, NotificationBell, fetchNotifications | [docs/hooks/notifications.md](docs/hooks/notifications.md) |
| dateUtils, dias úteis, cascadePhases | [docs/utils/date-utils.md](docs/utils/date-utils.md) |
| ToolsView, BriefingAnalyzerView, padrão de subview | [docs/views/tools.md](docs/views/tools.md) |
| Convenções, padrões, env vars | [docs/guidelines.md](docs/guidelines.md) |
| TODOs e melhorias pendentes | [docs/todo/melhorias.md](docs/todo/melhorias.md) |
| TODO: upsert steps (detalhado) | [docs/todo/upsert-steps.md](docs/todo/upsert-steps.md) |
