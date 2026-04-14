# Arquitetura — Capacity Dashboard

## Estrutura do Projeto

```
src/
├── App.tsx                    # Root: providers, roteamento, inicialização do cliente
├── main.tsx                   # Entry point
├── components/
│   ├── TaskModal.tsx          # Modal criar/editar demanda
│   ├── AppHeader.tsx          # Header com seletor de cliente
│   ├── AppSidebar.tsx         # Sidebar de navegação
│   └── ui/                    # Design system (Button, Input, Label, Badge)
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
│   └── user/                  # UserClientsView + useUserClients
├── store/
│   ├── useUIStore.ts          # Estado de UI: view ativa, modal aberto/fechado
│   ├── useClientStore.ts      # Cliente selecionado (persist localStorage)
│   ├── useDataStore.ts        # Cache de tasks/members, fetchData, invalidate
│   └── appStore.ts            # Re-export de compatibilidade: useAppStore = useDataStore
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
App.tsx (inicialização, roteamento, clientMembers)
    ├── useClientStore  → selectedClientId (persist)
    ├── useDataStore    → tasks, members, fetchData, invalidate
    ├── useUIStore      → view, isTaskModalOpen
    ├── useSupabase({ memberId, clientId, isAdmin }) → mutations CRUD
    ├── clientMembers (useMemo) → membros filtrados pelo cliente ativo
    ├── view="home"      → HomeView
    ├── view="clients"   → UserClientsView
    ├── view="dashboard" → DashboardView → Calendar/Timeline
    ├── view="members"   → MembersView (recebe clientMembers)
    ├── view="reports"   → ReportsView (recebe clientMembers)
    ├── view="tools"     → ToolsView (grid de ferramentas; navegação interna por activeTool)
    └── TaskModal → criar/editar (useFormState → cascata de fases)
```

## Stores (`src/store/`)

### `useUIStore`
Estado de navegação e modal. Não persiste.
```ts
view: ViewType                  // 'home' | 'dashboard' | 'members' | 'reports' | 'admin' | 'clients' | 'tools'
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

### `useDataStore`
Cache de dados. Guard: `fetchData` retorna imediatamente se `clientId === undefined`.
```ts
tasks: Task[]
members: Member[]
loading: boolean
error: string | null
fetchData(clientId, isAdmin)    // guard: não fetcha se clientId === undefined
invalidate()                    // limpa cache (tasks, members, cachedClientId)
```

### `appStore.ts`
Re-export de compatibilidade: `useAppStore = useDataStore`. Consumers existentes (views, `useSupabase`) não precisam de alteração.

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
4. useEffect separado: effectiveClientId !== undefined
   → fetchData(clientId, isAdmin)  ← nunca dispara com clientId=undefined
5. useDataStore popula tasks/members → views renderizam
```

**Chave:** `App.tsx` usa `AuthContext.clients` diretamente (não `useUserClients`). `useUserClients` existe apenas em `UserClientsView` para `linkToClient`/`unlinkFromClient`.

## Troca de Cliente

```
handleSelectClient(newId)
  → invalidate()          ← limpa tasks/members imediatamente (sem vazamento)
  → setClient(newId)      ← persiste no localStorage
  → setView("home")
  → useEffect dispara fetchData(newId)
```

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

## Membros filtrados por cliente (`clientMembers` em `App.tsx`)

`clientMembers` é derivado via `useMemo` a partir de `tasks` e `members`:
- Filtra `members` para mostrar apenas quem tem steps atribuídos nas tarefas do cliente ativo.
- Quando `effectiveClientId === null` (admin vê todos), retorna `members` completo.
- Passado para `MembersView` e `ReportsView`. O `TaskModal` recebe `members` completo.

## Views lendo da store

`DashboardView`, `MembersView` e `ReportsView` leem `tasks` e `members` diretamente de `useAppStore()` (alias de `useDataStore`). Não recebem essas props via `App.tsx`.

## Papéis de Acesso

- **admin** (`access_role = 'admin'`): vê todos os clientes; pode selecionar cliente específico ou `null` (todos)
- **user**: vê apenas os clientes associados via `user_clients`

## Animação de Transição de Views

`<main>` usa `key={view}` + classe `.animate-blur-fade-in` (definida em `src/index.css`) para transição blur+fade de 300ms ao trocar de view.

## Persistência

- **Primária:** Supabase (PostgreSQL) — fonte de verdade
- **Auth:** Supabase Auth — sessão gerida pelo SDK
- **Cliente selecionado:** localStorage via `zustand/persist` (`client-store`)

## Decisões

- Sem router — navegação via `useUIStore.view` (poucas views)
- State manager: Zustand (3 stores separadas por responsabilidade)
- `any` intencional em dados do DB sem schema fixo em runtime
