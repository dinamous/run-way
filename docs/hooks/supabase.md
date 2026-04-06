# useSupabase

**Ficheiro:** `src/hooks/useSupabase.ts`
**Cliente:** `src/lib/supabase.ts`

## Funções principais
- `fetchTasks()` — limpa `tasks` para `[]` antes de buscar, depois carrega tarefas com steps e assignees (garante que não há dados do cliente anterior durante o carregamento)
- `createTask(data)` — insere tarefa + steps + assignees
- `updateTask(data)` — atualiza tarefa (atualmente: delete+insert steps — ver TODO)
- `deleteTask(id)` — remove tarefa e dados associados

## Steps
- Definidos em `src/lib/steps.ts`
- Cada tarefa tem N steps com: `type`, `order`, `active`, `start_date`, `end_date`, `assignees[]`

## Tabelas Supabase
- `tasks` — dados da tarefa
- `task_steps` — fases/steps da tarefa
- `step_assignees` — relação step ↔ member

## Estado
Retorna: `tasks`, `members`, `loading`, `error`, funções CRUD.
