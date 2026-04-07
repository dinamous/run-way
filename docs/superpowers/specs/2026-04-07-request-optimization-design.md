# Design: Otimização de Requests e Fluxo de Dados

**Data:** 2026-04-07  
**Branch:** feature/user-role-acess  
**Status:** Aprovado

---

## Problema

O carregamento inicial da aplicação dispara requests desnecessárias:

1. `AuthContext.loadProfile` busca `members` para montar o perfil do usuário logado.
2. `useDataStore.fetchData` também busca `members` (duplicação) + `tasks` — ambos no boot, antes de qualquer view abrir.
3. `fetchMembersFromDb` retorna **todos os members do sistema** sem filtro de cliente; o filtro acontecia no client-side via `useMemo` (overfetching).
4. A `HomeView` não usa tasks nem members, mas ambos são buscados quando ela é a view inicial.

---

## Decisões de Design

- **Manter Zustand** como única camada de cache (sem React Query / SWR).
- **Members do AuthContext** (perfil do usuário logado) permanecem separados dos members do cliente.
- **Members filtrados por cliente** via query no banco, não no client-side.
- **Fetch lazy por view:** nenhum dado de tasks ou members é buscado no bootstrap.

---

## Arquitetura

### Bootstrap (sem mudança no AuthContext)

```
supabase.auth.getSession()
  → loadProfile(uid)
      → SELECT member WHERE auth_user_id = uid   (perfil do usuário)
      → SELECT clients (filtrado por access_role)
```

Nada mais roda no boot.

### Novos Stores

#### `useTaskStore` (`src/store/useTaskStore.ts`)

```ts
interface TaskState {
  tasks: Task[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined

  fetchTasks(clientId: string | null | undefined, isAdmin: boolean): Promise<void>
  invalidate(): void
}
```

- `fetchTasks` é idempotente: não refetcha se `clientId === cachedClientId` e `tasks.length > 0`.
- Lógica de query idêntica à atual `fetchTasksFromDb`.

#### `useMemberStore` (`src/store/useMemberStore.ts`)

```ts
interface MemberState {
  members: Member[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined

  fetchMembers(clientId: string | null | undefined): Promise<void>
  invalidate(): void
}
```

- `fetchMembers` é idempotente: não refetcha se `clientId === cachedClientId` e `members.length > 0`.
- Query filtrada por cliente (ver seção abaixo).

### Query de Members por Cliente

**Quando `clientId` é uma string:**
```sql
SELECT DISTINCT m.*
FROM members m
JOIN step_assignees sa ON sa.member_id = m.id
JOIN task_steps ts ON ts.id = sa.step_id
JOIN tasks t ON t.id = ts.task_id
WHERE t.client_id = :clientId
ORDER BY m.name
```

**Quando `clientId = null` (admin sem filtro):**
```sql
SELECT * FROM members ORDER BY name
```

Isso elimina o `useMemo` de `clientMembers` no `App.tsx` — o filtro vai para o banco.

---

## Migração do App.tsx

### Remover
- `useEffect` que chama `fetchData` (boot fetch global)
- `useMemo` de `clientMembers`
- Import e uso de `useDataStore`

### Manter / Ajustar
- `handleSelectClient` chama `useTaskStore.invalidate()` + `useMemberStore.invalidate()`
- `members` passados ao `TaskModal` vêm de `useMemberStore`

### Prop drilling eliminado
Views param a receber `tasks` e `members` via props de `App.tsx` — cada view lê diretamente do store.

---

## Fetch Lazy por View

| View | Store chamado | Trigger |
|---|---|---|
| DashboardView | `useTaskStore.fetchTasks` | mount / clientId change |
| TimelineView | `useTaskStore.fetchTasks` | mount / clientId change |
| CalendarView | `useTaskStore.fetchTasks` | mount / clientId change |
| MembersView | `useMemberStore.fetchMembers` | mount / clientId change |
| ReportsView | `useTaskStore.fetchTasks` + `useMemberStore.fetchMembers` | mount / clientId change |
| TaskModal | `useMemberStore.fetchMembers` | modal open |
| HomeView | — | nada |
| AdminView | — | gerencia seus próprios dados via `useAdminData` |

Cada view usa `useEffect([selectedClientId, isAdmin])` para disparar o fetch.

---

## Arquivos a Deletar

- `src/store/useDataStore.ts`
- `src/store/appStore.ts` (re-export de compatibilidade)

---

## Arquivos a Criar

- `src/store/useTaskStore.ts`
- `src/store/useMemberStore.ts`

---

## Arquivos a Modificar

- `src/App.tsx` — remover fetchData boot, remover clientMembers useMemo, ajustar invalidate
- `src/views/dashboard/DashboardView.tsx` — fetch lazy, ler tasks do store
- `src/views/timeline/TimelineView.tsx` — fetch lazy, ler tasks do store
- `src/views/calendar/CalendarView.tsx` — fetch lazy, ler tasks do store
- `src/views/MembersView/MembersView.tsx` — fetch lazy, ler members do store
- `src/views/reports/ReportsView.tsx` — fetch lazy, ler tasks + members do store
- `src/components/TaskModal.tsx` — fetch members ao abrir
- `src/hooks/useSupabase.ts` — substituir `useAppStore` por `useTaskStore`; `refresh` passa a chamar `useTaskStore.invalidate()` + `useTaskStore.fetchTasks(clientId, isAdmin)`

---

## Resultado Esperado

- **Boot:** 2 requests (session + loadProfile com clients) em vez de 4+
- **HomeView:** 0 requests de dados após login
- **Abertura de view com dados:** 1 request apenas para o que a view precisa
- **Troca de cliente:** invalidate nos stores → refetch lazy na próxima view aberta
- **Sem overfetching:** members filtrados no banco, não no client
