# ✅ RESOLVIDO — Migração Steps → Subtasks (Mai 2026)

Este TODO foi resolvido pela migração completa de `Step` para `Subtask` (ADR-019).

O `updateTask` em `src/hooks/infra/useSupabase.ts` agora faz diff por `subtask.id`:
- Subtasks novas (`id = ''`) → INSERT via `createAllSubtasks`
- IDs removidos → DELETE em `task_subtasks`
- IDs existentes alterados → UPDATE campo a campo
- Assignees: INSERT/DELETE diff por subtask

O dirty detection e proteção contra overclick também foram implementados via `useFormState`.

Ver: [ADR-019](../decisions.md#adr-019-steps--subtasks-modelo-flexível-por-demanda)
