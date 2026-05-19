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

**Status:** Substituído por ADR-016 (Abr 2026)
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

---

## ADR-016: Roteamento via React Router DOM com slugs de cliente

**Status:** Aceito (Abr 2026)
**Decisão:** React Router DOM v6 substituiu o roteamento manual (ADR-003); cada view tem uma URL própria baseada no slug do cliente; `useAppNavigation` encapsula URL ↔ ViewType; `BrowserRouter` wraps o `App` no `main.tsx`
**Racional:** deep linking (compartilhar link de uma task, de uma view específica), navegação pelo browser (botões voltar/avançar), abertura de tasks por URL (`/:clientSlug/tasks/:subview/id/:taskId`) — todos impossíveis sem URL-based routing; o crescimento da app tornou a manutenção do roteamento manual custosa
**Consequências:** slug do cliente é lido do campo `slug` da tabela `clients` (já existente); `useUIStore.view` e `useClientStore` são mantidos para compatibilidade com código legado mas a source of truth é a URL; fechar o modal de task limpa o segmento `/id/:taskId` da URL; `vercel.json` já possuía rewrite `/*` → `/` (sem mudança necessária)

---

## ADR-017: ClientPickerView como tela obrigatória de seleção de cliente

**Status:** Aceito (Abr 2026) — parcialmente supersedido por ADR-023
**Decisão:** qualquer rota sem `effectiveClientId` válido (sem slug, slug inválido, `/clients`, etc.) exibe `ClientPickerView` com cards dos clientes disponíveis — exceto `/profile` e `/home`, que são globais; se houver um cliente válido em cache (`cachedClient` de `useClientStore`), o redirect ocorre automaticamente sem exibir a tela de seleção; `App.tsx` renderiza `ClientPickerLayout` quando `!effectiveClientId && !isProfileView && !isHomeView`
**Racional:** o guard anterior (`!clientSlug`) só cobria ausência de slug, deixando rotas como `/clients` ou slugs inválidos caírem no `AppLayout` sem cliente, causando estado ambíguo; expandir o guard para `!effectiveClientId` cobre todos os casos estruturalmente; o redirect via `cachedClient` preserva a experiência de retorno sem fricção
**Consequências:** `/clients` não é mais uma rota global tratada separadamente — redireciona para o cliente em cache preservando a view (ex: `/clients` → `/:slug/client-info`) ou exibe a tela de seleção; `useAppOrchestrator` expõe `cachedClient`, `navigateTo` e `navigateToClient`; o redirect usa `useEffect` para evitar loop de re-render (`selectClient` durante render causava "Too many re-renders"); `isGlobalView` foi simplificado para `isProfileView` em `App.tsx`; ver ADR-023 para a exceção da `home`

---

## ADR-018: AdminView com rota escopada por cliente (`/:clientSlug/admin`)

**Status:** Aceito (Abr 2026)
**Decisão:** a `AdminView` passa a ser acessada via `/:clientSlug/admin` em vez de `/admin` (rota global sem slug); `admin` foi removido de `GLOBAL_ROUTES` em `useAppNavigation`; a regra em `accessControl.ts` passou a ter `requiresClient: true`
**Racional:** admin gerencia dados (clientes, membros, notificações) que pertencem a uma empresa específica; ter o `clientSlug` na URL mantém consistência com o restante da aplicação, permite deep links contextuais e prepara a estrutura para um futuro multi-tenant onde cada empresa terá seu próprio escopo de admin
**Consequências:** a URL `/admin` deixa de existir (redireciona para `/` via wildcard); é necessário ter um cliente selecionado para acessar admin; `isGlobalView` em `App.tsx` não inclui mais `"admin"`, logo admin usa o `AppLayout` normal com sidebar

---

## ADR-019: Steps → Subtasks (modelo flexível por demanda)

**Status:** Aceito (Mai 2026)
**Decisão:** o modelo de `Step` (8 tipos fixos por task, identidade = tipo) foi substituído por `Subtask` (N subtasks livres por task, identidade = `id`, tipo expresso como campo `status`). Tabelas: `task_subtasks` + `subtask_assignees` (substituem `task_steps` + `step_assignees`). Tipo domínio: `Subtask` com campos `id, title, status: SubtaskStatus, start, end, assignees, active, order`. `StepType` passou a ser alias de `SubtaskStatus` para compatibilidade temporária.
**Racional:** o modelo fixo de 8 steps impedia nomear etapas de forma contextual (ex: "Homepage — Design" vs "Design"); uma demanda pode ter múltiplas subtasks do mesmo tipo em paralelo; a flexibilidade de N subtasks livres é mais adequada a diferentes tipos de projeto
**Consequências:** nova task nasce sem subtasks — usuário adiciona livremente via TaskModal; dados existentes migrados automaticamente (`title = type`, `status = type`); `Planning View` exibe a demanda em todos os grupos onde tiver subtask ativa (não apenas o grupo "atual"); drag/drop no Calendar e Timeline indexado por `subtaskId` em vez de `stepType`; `task_steps` e `step_assignees` mantidas no banco para rollback até uma migration de drop futura

---

## ADR-020: Prioridade manual das demandas-pai

**Status:** Aceito (Mai 2026)
**Decisão:** demandas têm `priority_order` persistido na tabela `tasks`; a subview `Demandas` ordena por esse campo e permite reordenar linhas-pai via drag-and-drop quando não há filtros ativos.
**Racional:** prioridade manual é uma decisão de planejamento da lista, não derivada apenas do prazo da subtask ativa; persistir a ordem no banco garante consistência entre sessões e usuários.
**Consequências:** novas demandas entram no fim da fila do cliente; reordenação aplica update otimista no cache TanStack Query e grava os novos índices no Supabase; filtros desativam o drag para evitar gravar uma ordem parcial acidental.

---

## ADR-022: OverviewView substitui HomeView como tela inicial padrão

**Status:** Aceito (Mai 2026)
**Decisão:** A view `home` passa a renderizar `OverviewView` (dashboard pessoal com KPIs, lista de subtasks do assignee, clientes ativos e inbox de notificações) em vez da `HomeView` anterior (saudação + SearchLauncher + QuickAccess). A `HomeView` é mantida no codebase mas não está mais acessível pela navegação padrão.
**Racional:** a tela de boas-vindas não agregava valor recorrente; o dashboard pessoal entrega dados contextuais (subtasks atrasadas, vencimentos, notificações) a cada abertura do app, reduzindo o número de cliques para atingir informação relevante.
**Consequências:** `LayoutContext.RouterCtx` foi estendido com `userId`, `memberId`, `isAdmin`, `availableClients`, `notificationsLoading`, `onSelectClient` e `onMarkNotificationAsRead` para eliminar prop drilling. `useOverviewData` faz fetch próprio de subtasks (`subtask_assignees → task_subtasks → tasks → clients`) e contagem de tasks ativas por cliente — não existe hook global para essas queries. Notificações vêm via prop (reutilizando o `useNotifications` já subscrito no App).

---

## ADR-021: Status de andamento separado da etapa da subtask

**Status:** Aceito (Mai 2026)
**Decisão:** `task_subtasks` passa a ter `progress_status`, separado de `status` (que continua representando a etapa/tipo: Design, QA, Publicação etc.). O domínio expõe `Subtask.progressStatus` com os valores `todo`, `ready`, `in-progress`, `in-review`, `waiting`, `blocked`, `needs-changes`, `paused`, `done` e `canceled`.
**Racional:** o campo `status` já era usado como categoria visual e filtro de etapa; reaproveitá-lo para andamento quebraria calendário, timeline e legenda. Separar andamento permite gerir subtasks esquecidas, bloqueadas ou concluídas sem perder a fase de entrega.
**Consequências:** a tabela de demandas ganhou uma coluna "Status" com popover de edição inline; o modal de demanda também salva o andamento; o progresso da demanda agora considera subtasks `done` e ignora subtasks `canceled`.

---

## ADR-023: OverviewView como destino pós-login sem exigir seleção de cliente

**Status:** Aceito (Mai 2026)
**Decisão:** após o login, o usuário é levado diretamente à `OverviewView` (view `home`) sem passar pelo `ClientPickerView`, mesmo que tenha múltiplos clientes. A `home` é tratada como rota global — não exige `effectiveClientId`. O `ClientPickerView` continua disponível apenas para views que requerem um cliente específico (calendar, timeline, list, etc.) sem slug na URL.
**Racional:** a `OverviewView` já exibe dados agregados de todos os clientes do usuário (`clients` prop passada pelo `AppRouter`); forçar a seleção de cliente antes de acessá-la era fricção desnecessária. O fluxo correto é: login → overview global → usuário navega para uma view específica e seleciona o cliente se necessário.
**Consequências:** `needsPicker` em `App.tsx` passou a excluir `isHomeView` (`view === "home" || !view`); o `useEffect` de restauração automática de último cliente em `useAppOrchestrator` foi removido (não há mais necessidade de redirecionar `/` para `/:slug` automaticamente); `isProfileView` renomeado conceitualmente para "rotas globais" junto com `isHomeView`; a `OverviewView` permanece sem alterações, pois já suportava múltiplos clientes.


---

## ADR-024: AppSidebar filtra itens de nav pelo contexto de cliente

**Status:** Aceito (Mai 2026)
**Decisão:** quando a view atual é `home` ou não há `selectedClient`, a `AppSidebar` exibe apenas os itens marcados com `homeOnly: true` — atualmente "Início" e "Admin" (restrito a admins). Todos os demais itens (Demandas, Membros, Relatórios, Clientes, Ferramentas) só aparecem após um cliente estar selecionado. O item "Clientes" passa a ter `requiresClient: true` (antes não tinha). O campo `homeOnly` foi adicionado à interface `NavItem`.
**Racional:** a home é uma rota global sem cliente; exibir links para views client-scoped sem contexto de cliente cria itens de nav que não têm destino válido e gera confusão. Manter apenas "Início" e "Admin" simplifica o estado inicial e reforça o fluxo login → overview → selecionar cliente → trabalhar.
**Consequências:** a lógica de `filteredItems` em `AppSidebar` passou a checar `isOnHome` (derivado de `view === "home" || !selectedClient`) antes de `requiresClient` e `canAccessView`; itens sem `homeOnly` são suprimidos na home mesmo que o usuário seja admin; "Ferramentas" e "Clientes" receberam `requiresClient: true`.
