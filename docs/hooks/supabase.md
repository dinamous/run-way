# useSupabase

**Ficheiro:** `src/hooks/useSupabase.ts`
**Cliente:** `src/lib/supabase.ts`

## Responsabilidade

Hook de **mutations apenas**. Não armazena estado — após cada operação usa `queryClient.invalidateQueries` (TanStack Query) ou `queryClient.setQueryData` para cache otimista.

## Funções

- `createTask(data)` — insere tarefa + steps + assignees; invalida a query `['tasks', ...]` no fim
- `updateTask(data)` — update otimista no cache do TanStack Query, depois persiste no DB; reverte em caso de erro
- `deleteTask(id)` — remove do DB e atualiza o cache local sem re-fetch

## Update otimista (`updateTask`)

```
1. Snapshot de cachedTasks via queryClient.getQueryData
2. queryClient.setQueryData → aplica alteração localmente (UI actualiza imediatamente)
3. useTaskStore.applyOptimisticUpdate → sincroniza o store local (para rollback via clearOptimistic)
4. Persiste no DB (tasks + steps + assignees)
5. Se erro → queryClient.setQueryData(prev) + useTaskStore.clearOptimistic()
```

## Steps (`upsertSteps`)

Função privada que faz insert/update de cada step e compara diff de assignees:
- Step existente: UPDATE em `task_steps` apenas se mudou
- Assignees adicionados: INSERT em `step_assignees`
- Assignees removidos: DELETE em `step_assignees`

## Tabelas Supabase

- `tasks` — dados da tarefa
- `task_steps` — fases/steps da tarefa
- `step_assignees` — relação step ↔ member

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
