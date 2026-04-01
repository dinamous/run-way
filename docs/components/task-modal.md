# TaskModal

**Ficheiro:** `src/components/TaskModal.tsx`

## Cascata de Fases
Ao alterar o **início** de uma fase, a duração é preservada e fases seguintes avançam. Ao alterar o **fim**, fases seguintes arrastam (cascata bidirecional).

### Restrições (garantidas após cada alteração)
- `approval.start` >= `nextBusinessDay(design.end)`
- `dev.start` >= `nextBusinessDay(approval.end)`
- `qa.start` >= `nextBusinessDay(dev.end)`

## Validação
- `title`: mín. 3 caracteres
- `clickupLink`: opcional, deve começar com `http`

## Apagar Demanda
- Botão "Apagar" no footer (só visível ao editar)
- Confirmação via `confirm()` antes de eliminar
