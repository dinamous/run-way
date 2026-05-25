# Melhorias Pendentes

## UserClientsView: Módulos pendentes de schema

A `UserClientsView` exibe cards "Em breve" para módulos que exigem novas tabelas no Supabase. Avaliar e criar migrations antes de implementar:

| Módulo | Tabela sugerida | Colunas principais |
|---|---|---|
| Gerente de conta | coluna em `clients` ou `client_managers` | `member_id (fk → members)` |
| Contatos do cliente | `client_contacts` | `client_id, name, email, phone, role` |
| Cofre de acessos | `client_credentials` | `client_id, platform, login, encrypted_secret` |
| Contas de mídia | `client_accounts` | `client_id, platform, external_id, url` |
| Documentação | `client_files` | `client_id, name, url, size_bytes, uploaded_at, uploaded_by` |

Cada módulo será uma aba/seção dentro de `UserClientsView` após o schema estar pronto.

---

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
| `StepBar` | `bar.{taskId,subtaskId,startCol,endCol,slot}`, `task.{concludedAt,status.blocked}`, `isFirst/LastBarOfStep`, `viewMode`, `demandColor`, `dragPreview` |
| `PhaseBar` | `step.{type,start,end}`, `task.{id,concludedAt,status.blocked}`, `days.length`, `dragPreview` |
| `MemberCard` | `member.id`, `tasks` (ref + length), `today` |
| `TaskRow` | `task.{id,status.blocked,concludedAt}`, `stepType`, `members.length` |
| `DemandRow` | `task.{id,status.blocked,concludedAt}`, `referenceDate`, `members.length` |
| `StepRow` | `task.{id,concludedAt,status.blocked}`, `step.{type,start,end}`, `days.length`, `daysRange`, `dragPreview`, `holidays.length` |
