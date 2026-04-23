# Melhorias Pendentes

## UX: Botão "Salvar" inteligente
- Detectar dirty state (comparar formData vs snapshot original)
- Proteção contra overclick (submitting state)
- Botão desabilitado quando `!isDirty || submitting`
- Texto muda para "A guardar…" durante submit
- **Ficheiros:** TaskModal ou equivalente

## MembersView: Componentização
- Quebrar `MembersView.tsx` monolítico em `MemberCard` + `MemberTaskItem`
- Mover para pasta `src/views/MembersView/` com `index.ts`
- **Ver:** [todo/componentize-members-view.md](componentize-members-view.md)

## Steps: Upsert em vez de delete+insert
- Ver [todo/upsert-steps.md](upsert-steps.md) para implementação detalhada

## Performance: Memoização de componentes de lista

Todos implementados com `memo` e comparador customizado. Callbacks excluídos dos comparadores por serem instáveis — usar `useCallback` no pai se necessário.

| Componente | Comparador |
|---|---|
| `NotificationBell` | `unreadCount`, `notifications.length`, `selectedClientId` |
| `WeekRow` | `tasks` (ref + length), `week[0]`, `currentMonth`, `viewMode`, `weekIndex`, `dragPreview`, `holidays.length` |
| `StepBar` | `bar.{taskId,stepType,startCol,endCol,slot}`, `task.{concludedAt,status.blocked}`, `isFirst/LastBarOfStep`, `viewMode`, `demandColor`, `dragPreview` |
| `PhaseBar` | `step.{type,start,end}`, `task.{id,concludedAt,status.blocked}`, `days.length`, `dragPreview` |
| `MemberCard` | `member.id`, `tasks` (ref + length), `today` |
| `TaskRow` | `task.{id,status.blocked,concludedAt}`, `stepType`, `members.length` |
| `DemandRow` | `task.{id,status.blocked,concludedAt}`, `referenceDate`, `members.length` |
| `StepRow` | `task.{id,concludedAt,status.blocked}`, `step.{type,start,end}`, `days.length`, `daysRange`, `dragPreview`, `holidays.length` |
