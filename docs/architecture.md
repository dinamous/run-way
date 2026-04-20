# Arquitetura — Capacity Dashboard

## Estrutura do Projeto

```
src/
├── App.tsx                    # Root: providers, roteamento, inicialização do cliente
├── main.tsx                   # Entry point
├── components/
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
│   ├── useTaskStore.ts        # Cache de tasks, fetchTasks, invalidate
│   └── useMemberStore.ts      # Cache de members por cliente, fetchMembers, invalidate
├── hooks/
│   ├── useSupabase.ts         # Mutations CRUD (createTask, updateTask, deleteTask)
│   ├── useHolidays.ts         # Feriados
│   └── useFormState.ts        # Estado do formulário TaskModal
├── contexts/
│   └── AuthContext.tsx        # Sessão, member, clients, isAdmin, refreshProfile
├── lib/
│   ├── supabase.ts            # Cliente Supabase
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
App.tsx (inicialização, roteamento)
    ├── useClientStore  → selectedClientId (persist)
    ├── useTaskStore    → tasks, loading (lido pelas views diretamente)
    ├── useMemberStore  → members, loading (lido pelas views diretamente)
    ├── useUIStore      → view, isTaskModalOpen
    ├── useSupabase({ memberId, clientId, isAdmin }) → mutations CRUD
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
Cache de tasks. Fetch lazy — nenhum dado é buscado no boot. Guard: retorna imediatamente se `clientId === undefined` ou se já há dados para o mesmo `cacheKey`.
```ts
tasks: Task[]
loading: boolean
error: string | null
cacheKey: string | undefined       // `${clientId ?? 'all'}:${isAdmin}`
fetchTasks(clientId, isAdmin)      // idempotente; guard se loading=true ou cacheKey inalterado
invalidate()                       // reseta tasks, cacheKey, error e loading=false
```

> **Importante:** `invalidate()` reseta `loading: false`. Sem isso, um fetch em andamento no momento da troca de cliente deixaria `loading` preso em `true`, bloqueando todos os fetches seguintes via o guard `if (state.loading) return`.

### `useMemberStore`
Cache de members filtrados por cliente. Fetch lazy por view.
```ts
members: Member[]
loading: boolean
error: string | null
cachedClientId: string | null | undefined
fetchMembers(clientId)             // idempotente; guard se loading=true ou clientId inalterado
invalidate()                       // reseta members, cachedClientId, error e loading=false
```

## Fluxo de Autenticação — Retornos Condicionais em App.tsx

Antes do layout principal (sidebar + header), `App.tsx` aplica retornos condicionais em ordem:

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
2. App.tsx useEffect: selectedClientId===undefined && hasClients
   → setClient(clients[0].id)  ← só corre depois de auth estar pronto
3. useClientStore persiste clientId no localStorage
4. Cada view ao montar chama fetchTasks/fetchMembers com o effectiveClientId
   ← fetch lazy: nenhum dado é buscado antes da view abrir
```

**Chave:** `App.tsx` usa `AuthContext.clients` diretamente (não `useUserClients`). `useUserClients` existe apenas em `UserClientsView` para `linkToClient`/`unlinkFromClient`.

## Troca de Cliente

A troca de cliente exibe um overlay de transição animado antes de efetivar a mudança:

```
handleSelectClient(newId)
  → setTransitionClient({ id, name })   ← exibe ClientTransitionOverlay (~3.2s)
  → após 650ms: setClient(newId)        ← persiste no localStorage
               invalidateTasks()        ← reseta tasks + loading=false
               invalidateMembers()      ← reseta members + loading=false
               setView("home")
      ↓ onComplete (após fade-out do overlay)
  → toast cinza "Trocado para <Cliente>" (sonner, 3s)
  → setTransitionClient(null)
```

> `invalidate` dos dois stores é chamado com `loading: false` para evitar o bug de loading eterno: se um fetch estava em andamento no momento da troca, o guard `if (state.loading) return` bloquearia todos os fetches seguintes sem o reset.

> A store e o fetch são disparados **imediatamente** ao clicar, antes do overlay fechar. Quando a animação termina, os dados já chegaram ou estão a caminho — sem espera visível após a transição.

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

## Views lendo da store

`DashboardView`, `MembersView`, `ReportsView` e `TasksView` leem `tasks` e `members` diretamente de `useTaskStore()` e `useMemberStore()`. Não recebem essas props via `App.tsx`. Cada view dispara `fetchTasks`/`fetchMembers` no mount com o `effectiveClientId` atual.

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

## Decisões

- Sem router — navegação via `useUIStore.view` (poucas views)
- State manager: Zustand (4 stores separadas por responsabilidade: UI, Client, Tasks, Members)
- `any` intencional em dados do DB sem schema fixo em runtime
