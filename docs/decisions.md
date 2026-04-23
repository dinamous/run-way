# Architecture Decision Records

Registro de decisões arquiteturais significativas do projeto Run/Way.

---

## ADR-001: Zustand vs Redux

**Status:** Aceito (Abr 2026)
**Decisão:** 5 stores Zustand independentes (useTaskStore, useUIStore, useAdminStore, useClientStore, useMemberStore)
**Racional:** minimal boilerplate, bundle ~2 KB, devtools built-in, sem necessidade de Provider/Context aninhado, middleware `persist` e `devtools` via composição simples
**Consequências:** sem time-travel debug nativo; logging manual necessário quando necessário

---

## ADR-002: TanStack Query para estado servidor

**Status:** Aceito (Abr 2026)
**Decisão:** Dados do Supabase gerenciados via TanStack Query (hooks `use*Query`), não diretamente em Zustand
**Racional:** cache automático, refetch em background, stale-while-revalidate, deduplicação de requests — eliminam boilerplate de loading/error manual
**Consequências:** dois sistemas de estado em paralelo (Zustand para UI local, TanStack Query para servidor); `useMemberStore` foi depreciado após migração

---

## ADR-003: Roteamento manual sem React Router

**Status:** Aceito (Abr 2026)
**Decisão:** Roteamento implementado via `useUIStore` (view string enum) + renderização condicional em `App.tsx`
**Racional:** a aplicação é um SPA com estados bem definidos (loading → não autenticado → onboarding → app); o grafo de navegação é simples e não se beneficia de URLs parametrizadas ou lazy-loading por rota
**Consequências:** sem URLs navegáveis por deep link; adicionar URL-based routing no futuro exigiria refatoração da orquestração em `App.tsx`

---

## ADR-004: Vite sem Next.js

**Status:** Aceito (Abr 2026)
**Decisão:** SPA puro com Vite 8; sem SSR, sem Next.js
**Racional:** aplicação interna de capacity planning — SEO e SSR não são requisitos; Vite oferece HMR instantâneo e build simples; Supabase provê o backend
**Consequências:** sem SSR/SSG; sem roteamento baseado em sistema de arquivos; carregamento inicial depende do bundle client-side

---

## ADR-005: Tailwind CSS v4 sem tailwind.config.js

**Status:** Aceito (Abr 2026)
**Decisão:** Tailwind v4 via plugin Vite (`@tailwindcss/vite`), configuração inline em `src/index.css` com variáveis CSS no espaço de cor OKLch
**Racional:** v4 elimina o arquivo de config; OKLch permite inversão de paleta (light/dark) com uma variável; plugin Vite integra ao pipeline sem PostCSS separado
**Consequências:** sem `tailwind.config.js` para referenciar tokens via JS; configuração distribuída entre `index.css` e classes utilitárias

---

## ADR-006: Supabase como backend

**Status:** Aceito (Abr 2026)
**Decisão:** Supabase (PostgreSQL + Auth + Realtime) como única camada de backend; sem API server próprio
**Racional:** elimina custo de manter servidor; Row Level Security garante isolamento de dados por usuário; cliente JS tipado gerado automaticamente; suporte a realtime via WebSocket nativo
**Consequências:** lógica de negócio fica no cliente ou em Edge Functions; migrações de schema são arquivos SQL versionados em `supabase/migrations/`

---

## ADR-007: Radix UI como base de componentes

**Status:** Aceito (Abr 2026)
**Decisão:** Primitivos Radix UI (Dialog, Select, DropdownMenu, etc.) com estilização via Tailwind; sem biblioteca de componentes completa (ex: MUI, Chakra)
**Racional:** componentes headless, acessíveis por padrão (ARIA, keyboard), sem estilos embutidos — composição livre com Tailwind; bundle tree-shakeable por pacote
**Consequências:** mais código de estilização por componente; sem temas prontos; acessibilidade delegada ao Radix em vez de implementada manualmente

---

## ADR-008: Co-location de componentes por view

**Status:** Aceito (Abr 2026)
**Decisão:** componentes e hooks privados de uma view ficam em `views/<nome>/components/` e `views/<nome>/hooks/`; sobem para `src/components/` ou `src/hooks/` apenas quando usados por 2+ views
**Racional:** reduz acoplamento acidental; facilita deletar uma feature inteira; explicita qual código é compartilhado vs. específico
**Consequências:** alguma duplicação temporária aceitável antes de promover componentes; imports internos usam `./` enquanto externos usam `@/`

---

## ADR-009: Testes co-localizados com Vitest

**Status:** Aceito (Abr 2026)
**Decisão:** testes unitários em `src/**/__tests__/` adjacentes ao módulo testado, rodando com Vitest
**Racional:** Vitest é ESM-nativo, compartilha config do Vite, sem duplicar transform pipeline; co-location facilita encontrar o teste junto com o módulo
**Consequências:** sem diretório `tests/` centralizado; cobertura de integração E2E não contemplada neste ADR

---

## ADR-010: LayoutContext para eliminar prop drilling no shell

**Status:** Aceito (Abr 2026)
**Decisão:** `AppLayout` cria um `LayoutContext.Provider` com três namespaces (`header`, `sidebar`, `router`); `AppHeader`, `AppSidebar` e `AppRouter` são zero-props e consomem o contexto via `useLayoutContext()`
**Racional:** o shell possui muitas props cruzadas entre header, sidebar e router — passá-las manualmente criava acoplamento frágil e dificultava adicionar novos filhos; Context API é o mecanismo idiomático do React para este padrão
**Consequências:** `useLayoutContext()` lança erro se usado fora de `AppLayout`, tornando o escopo explícito; qualquer novo componente filho do shell deve consumir o contexto em vez de receber props

---

## ADR-011: Code splitting via React.lazy em AppRouter

**Status:** Aceito (Abr 2026)
**Decisão:** `AppRouter` carrega todas as views com `React.lazy` + `Suspense`; cada view vira um chunk separado; fallback é um spinner centralizado (`ViewSkeleton`)
**Racional:** sem code splitting, todo o código de views era carregado no bundle inicial mesmo que o usuário nunca abrisse aquela view; lazy loading reduziu o bundle inicial em ~40%
**Consequências:** primeiro acesso a uma view tem latência de rede do chunk; Suspense é obrigatório ao redor de `AppRouter`

---

## ADR-012: Validação runtime de rows do banco com Zod

**Status:** Aceito (Abr 2026)
**Decisão:** schemas Zod em `src/lib/validators.ts` validam cada row retornada pelo Supabase antes de mapear para tipos internos; aplicado em `queries.ts`, `AuthContext`, `useAdminStore` e `useProfile`
**Racional:** o TypeScript não alcança o runtime — um schema de banco alterado sem atualizar os tipos faria dados silenciosamente inválidos propagarem pela UI; Zod garante falha explícita com mensagem clara
**Consequências:** erro de schema lança exceção imediatamente, superficializando bugs de contrato; custo de parse por row é negligenciável frente ao I/O de rede

---

## ADR-013: Query keys centralizadas em queries.ts

**Status:** Aceito (Abr 2026)
**Decisão:** todas as query keys do TanStack Query são exportadas de `src/lib/queries.ts` (`queryKeys.tasks`, `queryKeys.members`); nenhum hook ou componente define sua própria key inline
**Racional:** keys duplicadas ou inconsistentes causam cache miss silencioso e fetches redundantes; centralizar garante que `invalidateQueries` e os hooks de leitura sempre referenciam a mesma key
**Consequências:** adicionar uma nova entidade requer atualizar `queries.ts`; template de novo hook disponível em `src/hooks/__templates__/`

---

## ADR-014: Operações admin exclusivamente em Edge Functions

**Status:** Aceito (Abr 2026)
**Decisão:** qualquer operação que requer service role key (bypass de RLS) roda em Supabase Edge Functions server-side; o cliente chama via `supabase.functions.invoke` através de `src/lib/adminApi.ts`
**Racional:** expor a service role key no cliente comprometeria toda a segurança do banco; Edge Functions validam o JWT e o `access_role = 'admin'` antes de qualquer acesso privilegiado via `requireAdmin` em `_shared/auth.ts`
**Consequências:** novas operações admin precisam de uma Edge Function correspondente; service role key nunca chega ao bundle do cliente

---

## ADR-015: RLS de members com USING(true) após falha de recursão

**Status:** Aceito (Abr 2026)
**Decisão:** a policy de leitura de `members` usa `USING (true)` para qualquer usuário autenticado — sem filtro por cliente
**Racional:** todas as abordagens tentadas para restringir visibilidade por cliente (subquery em `members`, `SECURITY DEFINER`, tabela auxiliar `member_roles`) resultaram em `infinite recursion` no Supabase; a visibilidade plana é aceitável dado que a aplicação é interna
**Consequências:** qualquer usuário autenticado vê todos os membros; filtro por cliente é feito no cliente via `user_clients` (com policy `user_read_same_client_user_clients` que não causa recursão)
