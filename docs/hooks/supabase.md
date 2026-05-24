# useSupabase

**Ficheiro:** `src/hooks/useSupabase.ts`
**Cliente:** `src/lib/supabase.ts`

## Responsabilidade

Hook de **mutations apenas**. Não armazena estado — após cada operação usa `queryClient.invalidateQueries` (TanStack Query) ou `queryClient.setQueryData` para cache otimista.

## Funções

- `createTask(data)` — insere tarefa + subtasks + assignees; invalida a query `['tasks', ...]` no fim
- `updateTask(data)` — update otimista no cache do TanStack Query, depois persiste no DB; reverte em caso de erro
- `deleteTask(id)` — remove do DB e atualiza o cache local sem re-fetch

`createTask` e `deleteTask` são envolvidas por `useThrottledMutation` (500ms) antes de serem expostas — chamadas mais rápidas que o intervalo são rejeitadas com toast de aviso e retornam `false`. `updateTask` é exposto sem throttle, pois é chamado de forma intencional (drag-and-drop, edição inline).

## Rate Limiting (client-side)

Dois utilitários padronizados cobrem todos os casos:

| Utilitário | Ficheiro | Quando usar |
|---|---|---|
| `useThrottledMutation` | `src/hooks/useThrottledMutation.ts` | Dentro de hooks React (usa `useRef`) |
| `throttleAsync` | `src/lib/throttle.ts` | Funções puras fora de componentes/hooks |

Aplicado em: `useSupabase` (500ms), `useTaskQuickActions` (500ms), `useUserClients` (500ms), `useProfile` (500ms), `notifications.markAsRead` (300ms), `notifications.markAllAsRead` (1000ms).

`useTaskQuickActions` (`src/hooks/useTaskQuickActions.ts`) centraliza os toggles rápidos de bloqueio e conclusão, usados por `ListView` e `TasksView` — elimina código duplicado e garante throttle consistente.

`useSubtaskQuickEdit` (`src/hooks/tasks/useSubtaskQuickEdit.ts`) — mutations granulares de subtask sem passar pela modal. Expõe:
- `updateSubtaskAssignees(task, subtaskId, assignees[])` — diff de adds/removes em `subtask_assignees` com update otimista no cache
- `updateSubtaskDates(task, subtaskId, start, end)` — UPDATE direto em `task_subtasks.start_date / end_date` com update otimista no cache
- `updateSubtaskProgressStatus(task, subtaskId, progressStatus)` — UPDATE direto em `task_subtasks.progress_status` com update otimista no cache

Usado por `PlanningView` (subview `demandas`) para alimentar os popovers inline de `TaskTable`.

## Update otimista (`updateTask`)

```
1. Snapshot de cachedTasks via queryClient.getQueryData
2. queryClient.setQueryData → aplica alteração localmente (UI actualiza imediatamente)
3. useTaskStore.applyOptimisticUpdate → sincroniza o store local (para rollback via clearOptimistic)
4. Persiste no DB (tasks + subtasks + assignees)
5. Se erro → queryClient.setQueryData(prev) + useTaskStore.clearOptimistic()
```

## Campos de fluxo no insert (`createTask`)

`createTask` envia todos os campos de fluxo da migration `20260522000000_task_flow_fields.sql`:
`concluded_at`, `expected_hours`, `complexity`, `task_type`, `due_date`.

> Antes desta correção, esses campos só eram persistidos em `updateTask`.

## Subtasks (`createAllSubtasks` + diff em `updateTask`)

`createAllSubtasks` — função privada chamada em `createTask` e em `updateTask` (para subtasks novas):
- INSERT em `task_subtasks` (todas de uma vez), indexadas por `subtask_order` para associar IDs de volta
- INSERT em `subtask_assignees` para assignees não vazias

`updateTask` faz diff por `subtask.id`:
- Subtasks com `id = ''` → novas → `createAllSubtasks`
- IDs presentes no prev mas ausentes no next → DELETE em `task_subtasks`
- IDs presentes em ambos → compara campos → UPDATE se mudou
- Assignees diff por subtask: INSERT/DELETE em `subtask_assignees`

## Tabelas Supabase

- `tasks` — dados da tarefa
- `task_subtasks` — subtasks da tarefa (substitui `task_steps`)
- `subtask_assignees` — relação subtask ↔ member (substitui `step_assignees`)
- `task_steps` / `step_assignees` — mantidas temporariamente para rollback (migration drop pendente)

## Estado

`useSupabase` **não retorna** `tasks`, `members`, `loading` nem `error`.
Esses dados vêm de `useTasksQuery` / `useMembersQuery` diretamente nas views.

Retorna apenas: `createTask`, `updateTask`, `deleteTask`.

## Query Keys

As query keys estão centralizadas em `src/lib/queries.ts`:

```ts
queryKeys.tasks(clientId, isAdmin)  // ['tasks', clientId ?? 'all', isAdmin]
queryKeys.members(clientId)         // ['members', clientId ?? 'all']
```

Para invalidar tudo sem saber o clientId exato: `queryClient.invalidateQueries({ queryKey: ['tasks'] })`

## Funções de Fetch (`src/lib/queries.ts`)

Além de `fetchTasksFromDb` e `fetchMembersFromDb`, o módulo expõe duas funções especializadas para o workload engine:

| Função | Descrição |
|---|---|
| `fetchConcludedTasksSince(since, clientIds, isAdmin)` | Busca tasks concluídas a partir de uma data ISO (`since`). `clientIds` é `string[] \| null` — `null` para admin (sem filtro), array com todos os clientes do usuário para não-admin. Retorna `ConcludedTaskRow[]` com `id`, `concludedAt`, `expectedHours`, `clientId` e `memberIds` (union de todos os assignees das subtasks). Usado para calcular `throughput7dHours` / `throughput14dHours`. |
| `fetchActiveTasksWithHours(clientIds, isAdmin)` | Busca todas as tasks ativas (sem `concluded_at`). `clientIds` é `string[] \| null` — `null` para admin (sem filtro), array com todos os clientes do usuário para não-admin (usa `.in()`). Usa `WORKLOAD_TASK_SELECT` (com join `clients(id, name)`) e `workloadRowToTask`, que popula `Task.clientName`. Retorna `Task[]` com todos os campos de fluxo e `clientName`. |

### Campos mapeados por `dbRowToTask`

`TASK_SELECT` e `dbRowToTask` incluem os campos de fluxo adicionados na migration `20260522000000_task_flow_fields.sql`. **Não incluem `clientName`** — apenas `workloadRowToTask` (via `WORKLOAD_TASK_SELECT`) faz o join com `clients`.

| DB | TS |
|---|---|
| `expected_hours` | `expectedHours` |
| `complexity` | `complexity` |
| `task_type` | `taskType` |
| `due_date` | `dueDate` |
| `started_at` | `startedAt` |
