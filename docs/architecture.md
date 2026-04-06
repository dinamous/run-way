# Arquitetura — Capacity Dashboard

## Estrutura do Projeto

```
src/
├── App.tsx                    # Root: providers, estado global, header, roteamento
├── main.tsx                   # Entry point
├── pages/
│   └── LoginPage.tsx          # Página de login (Supabase Auth)
├── components/
│   ├── TaskModal.tsx          # Modal criar/editar demanda
│   └── ui/                    # Design system (Button, Input, Label, Badge)
├── views/
│   ├── DashboardView.tsx      # Header + filtros + toggle Calendar/Timeline
│   ├── CalendarView.tsx       # Calendário mensal com drag-drop
│   ├── TimelineView.tsx       # Gantt com drag-drop por fase
│   ├── dashboardUtils.ts     # Constantes, helpers, tipos partilhados
│   ├── MembersView.tsx        # Capacidade por membro
│   └── ReportsView.tsx        # Relatórios
├── hooks/
│   ├── useSupabase.ts         # CRUD tarefas via Supabase
│   ├── useAuth.ts             # Autenticação Supabase
│   └── useFormState.ts        # Estado do formulário TaskModal
├── lib/
│   ├── supabase.ts            # Cliente Supabase
│   ├── steps.ts               # Definição e lógica de steps
│   └── utils.ts               # Utilitários gerais
├── types/
│   ├── index.ts               # Barrel export
│   ├── task.ts                # Tipo Task
│   ├── member.ts              # Tipo Member
│   ├── props.ts               # Props de componentes
│   └── db.ts                  # Tipos Supabase/DB
├── utils/
│   └── dateUtils.ts           # Dias úteis, cascata de fases
└── data/
    └── mock.ts                # Dados mock
```

## Fluxo de Dados

```
AuthContext (AuthProvider)
    ↓ sessão válida + member + clients do utilizador (id, name, slug)
App.tsx (estado global: tasks, members, view, selectedClientId)
    ├── useUserClients() → lista de clientes do utilizador (id, name, slug)
    ├── useSupabase({ memberId, clientId, isAdmin }) → CRUD tasks ↔ Supabase DB
    ├── clientMembers (useMemo) → membros filtrados pelo cliente ativo
    ├── AppHeader → seletor de cliente (ver abaixo)
    ├── view="clients"  → UserClientsView (perfil do cliente ativo)
    ├── view="dashboard" → DashboardView → Calendar/Timeline
    ├── view="members"  → MembersView (recebe clientMembers)
    ├── view="reports"  → ReportsView (recebe clientMembers)
    └── TaskModal → criar/editar (useFormState → cascata de fases)
```

## `ClientOption` (tipo em `src/contexts/AuthContext.ts`)

```ts
interface ClientOption {
  id: string
  name: string
  slug?: string   // identificador de URL (ex: "minha-empresa")
}
```

Usado em `AuthContext.clients`, `useUserClients.userClients` e `useUserClients.availableClients`. Ambos os fetches incluem `slug` na query Supabase.

## View "Clientes" (`src/views/user/UserClientsView.tsx`)

Página de perfil do cliente ativo. Recebe `client: ClientOption | null` e exibe:
- Nome e domínio (slug) do cliente
- Seções placeholder para Gerente, Contactos, Acessos, Contas e Documentação (a implementar futuramente)

Não tem CRUD nem listagem de clientes — é uma página informativa do cliente selecionado no momento.

## Seleção de Cliente (`selectedClientId` em `App.tsx`)

O estado `selectedClientId` tem três valores semânticos distintos:

| Valor | Significado |
|---|---|
| `undefined` | Não inicializado — usa o primeiro cliente por padrão |
| `null` | Admin selecionou "Todos os clientes" (sem filtro no `fetchTasks`) |
| `string` | Cliente específico selecionado |

O `effectiveClientId` derivado deste estado é passado para `useSupabase`. Quando `isAdmin=true` e `effectiveClientId=null`, o `fetchTasks` não aplica filtro de cliente e retorna todas as tarefas.

**Seletor no `AppHeader`:** Visível para qualquer utilizador com 2+ clientes disponíveis, ou para admin com 1+ cliente. Não-admins não têm a opção "Todos os clientes".

## Membros filtrados por cliente (`clientMembers` em `App.tsx`)

`clientMembers` é derivado via `useMemo` a partir de `tasks` e `members`:
- Filtra `members` para mostrar apenas quem tem steps atribuídos (`step_assignees`) nas tarefas do cliente ativo.
- Quando `effectiveClientId === null` (admin vê todos), retorna `members` completo.
- Passado para `MembersView` e `ReportsView`. O `TaskModal` continua a receber `members` completo (para permitir atribuir qualquer membro a uma tarefa).

## Papéis de Acesso

- **admin** (`access_role = 'admin'`): vê todos os clientes; pode selecionar cliente específico ou "Todos"
- **user**: vê apenas os clientes associados via `user_clients`; pode alternar entre eles se tiver 2+

## Persistência
- **Primária:** Supabase (PostgreSQL) — fonte de verdade
- **Auth:** Supabase Auth — sessão gerida pelo SDK

## Decisões
- Sem router — navegação via `useState` (poucas views)
- Sem state manager externo — volume não justifica
- `any` intencional em dados do DB sem schema fixo em runtime
