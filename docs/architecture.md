# Arquitetura — Capacity Dashboard

## Estrutura do Projeto

```
src/
├── App.tsx                    # Root: gates de auth + composição declarativa — ~80 linhas
├── main.tsx                   # Entry point
├── components/
│   ├── AppRouter.tsx                  # Mapeia view → componente; guards de cliente
│   ├── AppLayout.tsx                  # Shell do layout: AppHeader + AppSidebar + main/AppRouter
│   ├── AppModals.tsx                  # TaskModal + ConfirmModal + ClientTransitionOverlay agrupados
│   ├── TaskModal.tsx                  # Modal criar/editar demanda
│   ├── AppHeader.tsx                  # Header: logo, hamburger mobile, NotificationBell, theme toggle (desktop)
│   ├── AppSidebar.tsx                 # Sidebar de navegação; theme toggle no footer mobile
│   ├── ClientTransitionOverlay.tsx    # Overlay animado exibido ao trocar de cliente
│   └── ui/                            # Design system (Button, Input, Label, Badge)
├── views/
│   ├── home/                  # HomeView — saudação, SearchLauncher, QuickAccess
│   ├── dashboard/             # DashboardView → Calendar/Timeline
│   ├── calendar/              # CalendarView — calendário mensal com drag-drop
│   ├── timeline/              # TimelineView — Gantt com drag-drop por fase
│   ├── MembersView/           # Capacidade por membro
│   ├── reports/               # ReportsView — relatórios
│   ├── tools/                 # ToolsView — ferramentas utilitárias (skeleton/mocks)
│   ├── admin/                 # AdminView (apenas admins)
│   ├── login/                 # LoginView
│   ├── onboarding/            # OnboardingView — usuário autenticado sem cliente associado
│   ├── user/                  # UserClientsView + useUserClients
│   └── profile/               # ProfileView — perfil do usuário + preferências
├── store/
│   ├── useUIStore.ts          # Estado de UI: view ativa, modal aberto/fechado
│   ├── useClientStore.ts      # Cliente selecionado (persist localStorage)
│   ├── useTaskStore.ts        # Estado local para update otimista (applyOptimisticUpdate/clearOptimistic)
│   └── useMemberStore.ts      # Stub de compatibilidade (sem fetch — migrado para useMembersQuery)
├── hooks/
│   ├── useAppOrchestrator.ts  # Agrega toda a lógica de orquestração do App (cliente, views, notificações, task actions)
│   ├── useSupabase.ts         # Mutations CRUD (createTask, updateTask, deleteTask) via TanStack Query
│   ├── useTasksQuery.ts       # Query hook TanStack Query para tasks
│   ├── useMembersQuery.ts     # Query hook TanStack Query para members
│   ├── useHolidays.ts         # Feriados
│   ├── useFormState.ts        # Estado do formulário TaskModal
│   ├── useAppTheme.ts         # Dark mode: estado + sync com localStorage e <html>
│   ├── useAppSidebar.ts       # Sidebar desktop (persist) e mobile open/close
│   ├── useTaskActions.ts      # Estado e handlers de create/update/delete de tasks
│   └── useClientTransition.ts # Fluxo animado de troca de cliente (overlay + TanStack Query invalidate)
├── contexts/
│   ├── AuthContext.tsx        # Sessão, member, clients, isAdmin, refreshProfile
│   └── LayoutContext.tsx      # Contexto do shell de layout (header, sidebar, router) — elimina prop drilling em AppLayout
├── lib/
│   ├── supabase.ts            # Cliente Supabase
│   ├── queries.ts             # fetchTasksFromDb, fetchMembersFromDb, queryKeys — valida rows com Zod antes do mapeamento
│   ├── validators.ts          # Schemas Zod para rows do banco (DbTaskRowSchema, DbStepRowSchema, DbStepAssigneeSchema)
│   ├── steps.ts               # Definição e lógica de steps
│   └── utils.ts               # Utilitários gerais
├── types/
│   ├── props.ts               # Props de componentes
│   └── db.ts                  # Tipos Supabase/DB
└── utils/
    └── dateUtils.ts           # Dias úteis, cascata de fases
```

## Fluxo de Dados

```
AuthContext (AuthProvider)
    ↓ session, member, clients (filtrado por access_role), isAdmin, refreshProfile
App.tsx (gates de auth + composição)
    └── useAppOrchestrator (toda a lógica de orquestração)
          ├── useClientStore    → selectedClientId (persist)
          ├── useMembersQuery   → members com cache TanStack Query
          ├── useUIStore        → view, isTaskModalOpen
          ├── useSupabase({ memberId, clientId, isAdmin }) → mutations CRUD
          └── QueryClientProvider (main.tsx) → staleTime 5min, gcTime 30min
    ├── view="home"                    → HomeView
    ├── view="clients"                 → UserClientsView
    ├── view="overview"                → DashboardView (subview="overview") — métricas e resumo
    ├── view="calendar"                → DashboardView (subview="calendar") — calendário mensal
    ├── view="timeline"                → DashboardView (subview="timeline") — Gantt
    ├── view="list"                    → DashboardView (subview="list") — tabela
    ├── view="members"                 → MembersView
    ├── view="reports"                 → ReportsView
    ├── view="tools"                   → ToolsView (grid de ferramentas)
    ├── view="tools-briefing-analyzer" → ToolsView com subview (BriefingAnalyzerView)
    ├── view="tools-import/export/integrations" → ToolsView com subview (em breve)
    ├── view="profile"                 → ProfileView — perfil + preferências
          └── TaskModal → criar/editar (useFormState → cascata de fases)
    ├── AppLayout    → shell do layout; fornece LayoutContext (AppHeader + AppSidebar + main/AppRouter sem prop drilling)
    └── AppModals    → TaskModal + ConfirmModal + ClientTransitionOverlay
```

## Stores (`src/store/`)

### `useUIStore`
Estado de navegação e modal. Não persiste.
```ts
view: ViewType
// 'home' | 'overview' | 'calendar' | 'timeline' | 'list'
// | 'members' | 'reports' | 'admin' | 'clients'
// | 'tools' | 'tools-briefing-analyzer' | 'tools-import' | 'tools-export' | 'tools-integrations'
// | 'profile'
setView(view)
isTaskModalOpen: boolean
openTaskModal() / closeTaskModal()
```

### `useClientStore`
Cliente selecionado. **Persiste no localStorage** (`client-store`). Não persiste `undefined`.
```ts
selectedClientId: string | null | undefined
setClient(id)
```
| Valor | Significado |
|---|---|
| `undefined` | Não inicializado — aguarda resolução da auth |
| `null` | Admin vê todos os clientes (sem filtro no fetch) |
| `string` | Cliente específico selecionado |

### `useTaskStore`
Estado local mínimo para suporte a **update otimista**. O fetch de tasks foi migrado para `useTasksQuery` (TanStack Query).
```ts
optimisticTasks: Task[] | null
applyOptimisticUpdate(tasks)  // aplica snapshot otimista durante updateTask
clearOptimistic()             // limpa após sucesso ou rollback
```

### `useMemberStore`
Stub de compatibilidade de imports. O fetch de members foi migrado para `useMembersQuery` (TanStack Query). Pode ser removido quando não houver mais imports.

### `useTasksQuery` / `useMembersQuery`
Query hooks baseados em TanStack Query v5. Configuração global: `staleTime: 5min`, `gcTime: 30min`, `retry: 2`.
```ts
// src/hooks/useTasksQuery.ts
const { data: tasks, isLoading, error } = useTasksQuery(clientId, isAdmin)

// src/hooks/useMembersQuery.ts
const { data: members, isLoading, error } = useMembersQuery(clientId)
```

**Invalidação após mutação:**
```ts
queryClient.invalidateQueries({ queryKey: ['tasks'] })   // invalida todas as queries de tasks
queryClient.invalidateQueries({ queryKey: ['members'] }) // invalida todas as queries de members
```

As query keys estão centralizadas em `src/lib/queries.ts` (`queryKeys.tasks`, `queryKeys.members`).

## Fluxo de Autenticação — Gates em App.tsx

`App.tsx` delega toda a lógica ao `useAppOrchestrator` e aplica retornos condicionais em ordem antes de montar o layout:

| Condição | View renderizada |
|---|---|
| `authLoading` | Spinner fullscreen |
| `!session` | `LoginView` |
| `session && !hasClients` | `OnboardingView` — usuário sem cliente associado |
| _(nenhuma das anteriores)_ | Layout completo com sidebar, header e views |

### OnboardingView (`src/views/onboarding/`)

Tela fullscreen exibida quando o usuário está autenticado mas não foi associado a nenhum cliente pelo gestor. Características:
- Sem sidebar e sem header
- Ilustração SVG de pista de decolagem com avião animado (keyframe `runway-float`)
- Mensagem explicativa e botão de logout
- **Polling automático** a cada 30s: consulta `user_clients` no Supabase; ao detectar clientes, chama `refreshProfile()` do `AuthContext` para recarregar o estado sem reiniciar o fluxo de auth

### `refreshProfile` (AuthContext)

```ts
refreshProfile: () => Promise<void>
```

Relê o perfil do usuário atual (member + clients) sem reiniciar o ciclo de autenticação. Usado pela `OnboardingView` após detectar que o usuário foi associado a um cliente.

---

## Fluxo de Inicialização (sem race condition)

```
1. AuthContext resolve → loading=false, clients=[...] (já filtrado por access_role)
2. useAppOrchestrator useEffect: selectedClientId===undefined && hasClients
   → setClient(clients[0].id) + fetchTasks/fetchMembers disparados imediatamente
   ← fetch eager: dados começam a carregar antes da view montar
3. useClientStore persiste clientId no localStorage
4. Cada view ao montar lê tasks/members dos stores (já em loading ou com cache)
```

**Chave:** `App.tsx` usa `AuthContext.clients` diretamente (não `useUserClients`). `useUserClients` existe apenas em `UserClientsView` para `linkToClient`/`unlinkFromClient`.

## Troca de Cliente

A troca de cliente exibe um overlay de transição animado antes de efetivar a mudança:

```
handleSelectClient(newId)
  → setTransitionClient({ id, name })   ← exibe ClientTransitionOverlay (~3.2s)
  → após 650ms: setClient(newId)        ← persiste no localStorage
               queryClient.invalidateQueries(['tasks'])   ← TanStack Query refetch automático
               queryClient.invalidateQueries(['members']) ← TanStack Query refetch automático
               setView("home")
      ↓ onComplete (após fade-out do overlay)
  → toast cinza "Trocado para <Cliente>" (sonner, 3s)
  → setTransitionClient(null)
```

> O TanStack Query revalida automaticamente ao mudar as queries keys (clientId muda) — o `invalidateQueries` força refetch imediato mesmo que ainda esteja dentro do `staleTime`.

### `ClientTransitionOverlay` (`src/components/ClientTransitionOverlay.tsx`)

Overlay fullscreen (`z-[9999]`) exibido ao trocar de cliente. Duração total ~3.8s.

**Camadas visuais (profundidade):**
- Gradiente radial fixo no fundo (`--muted`) simulando luminosidade de céu — não anima
- 8 nuvens SVG com posição, escala e opacidade fixas no `style`; cada nuvem anima **apenas `translateX`** via keyframe único gerado dinamicamente por valor de `dx` (`ct-cloud-8`, `ct-cloud-10`, etc.) — isso evita que o `scale` do style seja sobrescrito e mantém o drift orgânico e independente
- Linha de horizonte + pista SVG posicionadas em `bottom: 24-26%`, criando perspectiva de chão

**Avião lateral (`PlaneSide`) + rastro:**
- SVG de vista lateral: fuselagem em perspectiva, asa principal, cauda vertical e horizontal, janelas
- Percorre da esquerda para a direita em arco de decolagem (`ct-takeoff`): táxi → inclinação suave → saída diagonal em ~25°
- Rastro de condensação duplo com gradiente linear atrás do avião

**Conteúdo central (sem card):**
- Label "DESTINO" em uppercase + tracking largo
- Nome do cliente em `text-5xl` bold, fonte Syne
- Separador decorativo `✦`
- Mensagens rotativas com fade + `translateY(3px)` suave (350ms): `🛂 Verificando passaporte` → `🎫 Confirmando embarque` → `🛫 Decolando agora` → `✈️ Em rota de cruzeiro`

Ao fechar, dispara `onComplete` → efetiva a troca no store e exibe toast de confirmação.

## `ClientOption` (tipo em `src/contexts/AuthContext.ts`)

```ts
interface ClientOption {
  id: string
  name: string
  slug?: string
}
```

`AuthContext.clients` já vem filtrado por `access_role`:
- **admin** → todos os clientes
- **user** → apenas os associados via `user_clients`

## Views lendo dados

`DashboardView`, `MembersView`, `ReportsView`, `TasksView`, `ListView` e `TaskModal` leem `tasks` e `members` via `useTasksQuery` e `useMembersQuery` diretamente. O TanStack Query deduplica fetches automaticamente — múltiplas views usando a mesma query key compartilham o mesmo cache sem requests duplicados.

## Papéis de Acesso

- **admin** (`access_role = 'admin'`): vê todos os clientes; pode selecionar cliente específico ou `null` (todos)
- **user**: vê apenas os clientes associados via `user_clients`

### Permissões disponíveis (`AppPermission` em `src/lib/accessControl.ts`)

| Permissão | admin | user |
|---|---|---|
| `view:home` | ✓ | ✓ |
| `view:clients` | ✓ | ✓ |
| `view:dashboard` | ✓ | ✓ |
| `view:members` | ✓ | ✓ |
| `view:reports` | ✓ | ✓ |
| `view:tools` | ✓ | ✓ |
| `view:profile` | ✓ | ✓ |
| `view:admin` | ✓ | — |

### RLS — Visibilidade de Members

A policy de `members` é `members_authenticated_read` (`USING (true)` para autenticados) — qualquer usuário autenticado vê todos os members.

Tentativas de restringir visibilidade por cliente diretamente em `members` (migration `20260415000001_members_rls_same_client.sql`) resultaram em `infinite recursion` no Supabase em todas as abordagens (subquery em `members`, `SECURITY DEFINER`, tabela auxiliar `member_roles`).

### RLS — Visibilidade de user_clients

A tabela `user_clients` tem duas policies de leitura:

- `user_read_own_user_clients` — usuário lê apenas suas próprias linhas (`user_id` = seu member id)
- `user_read_same_client_user_clients` — usuário lê todas as linhas cujo `client_id` seja um cliente ao qual ele pertence (migration `20260415000002_user_clients_rls_same_client.sql`)

A segunda policy é necessária para que `fetchMembersFromDb` consiga buscar todos os membros de um cliente: sem ela, a query `SELECT user_id FROM user_clients WHERE client_id = :id` retornava apenas o próprio usuário, fazendo `MembersView` exibir somente ele mesmo. Não há recursão pois `members` usa `USING (true)`.

## Animação de Transição de Views

`<main>` usa `key={view}` + classe `.animate-blur-fade-in` (definida em `src/index.css`) para transição blur+fade de 300ms ao trocar de view.

## Persistência

- **Primária:** Supabase (PostgreSQL) — fonte de verdade
- **Auth:** Supabase Auth — sessão gerida pelo SDK
- **Cliente selecionado:** localStorage via `zustand/persist` (`client-store`)

## LayoutContext (`src/contexts/LayoutContext.tsx`)

Agrupa as props do shell de layout em três namespaces para eliminar prop drilling:

```ts
interface LayoutCtx {
  view: ViewType
  header: HeaderCtx   // darkMode, notifications, onToggleDark, …
  sidebar: SidebarCtx // sidebarOpen, view, role, selectedClient, …
  router: RouterCtx   // effectiveClientId, holidays, onEditTask, …
}
```

- **`AppLayout`** cria o `LayoutContext.Provider` com os valores agrupados; não passa props para filhos diretos
- **`AppHeader`**, **`AppSidebar`** e **`AppRouter`** são zero-props — consomem o contexto via `useLayoutContext()`
- `useLayoutContext()` lança erro se usado fora do `AppLayout`

## Decisões

- Sem router — navegação via `useUIStore.view` (poucas views)
- State manager: Zustand (UI + Client) + TanStack Query v5 (fetch/cache de tasks e members)
- Query keys centralizadas em `src/lib/queries.ts`; template para novos hooks em `src/hooks/__templates__/`
- Validação runtime de rows do banco via Zod (`src/lib/validators.ts`): schemas para tasks, members, clients, user_preferences e user_clients — aplicados em `queries.ts` (dbRowToTask), `AuthContext` (loadProfile), `useAdminStore` (fetchClients/fetchUsers/fetchUserClientsMap) e `useProfile` (fetchPreferences). Erros de schema lançam exceção com mensagem clara.
- `AppLayout` usa Context API em vez de prop drilling para isolar concerns do shell — `AppHeader`, `AppSidebar` e `AppRouter` não recebem props
