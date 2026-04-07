# useSupabase

**Ficheiro:** `src/hooks/useSupabase.ts`
**Cliente:** `src/lib/supabase.ts`

## Responsabilidade

Hook de **mutations apenas**. Não armazena estado — lê e escreve na store (`useDataStore`) após cada operação.

## Funções

- `createTask(data)` — insere tarefa + steps + assignees; chama `invalidate()` + `fetchData()` no fim
- `updateTask(data)` — update otimista na store, depois persiste no DB; reverte em caso de erro
- `deleteTask(id)` — remove do DB e atualiza a store localmente (sem re-fetch)

## Update otimista (`updateTask`)

```
1. Snapshot de previousTasks
2. useDataStore.setState → aplica alteração localmente (UI actualiza imediatamente)
3. Persiste no DB (tasks + steps + assignees)
4. Se erro → restaura previousTasks (sem race condition com fetch concorrente)
```

## Steps (`upsertSteps`)

Função privada que faz insert/update de cada step e reseta os assignees:
- Step novo (sem `id`): INSERT em `task_steps` → obtém `stepId`
- Step existente (com `id`): UPDATE em `task_steps`
- Sempre: DELETE + INSERT em `step_assignees`

## Tabelas Supabase

- `tasks` — dados da tarefa
- `task_steps` — fases/steps da tarefa
- `step_assignees` — relação step ↔ member

## Estado

`useSupabase` **não retorna** `tasks`, `members`, `loading` nem `error`.
Esses dados vêm de `useDataStore` (ou `useAppStore`) diretamente nas views.

Retorna apenas: `createTask`, `updateTask`, `deleteTask`.
