# TaskModal

**Pasta:** `src/components/TaskModal/`

## Estrutura de ficheiros

```
TaskModal/
  index.ts                    — re-export público (import via @/components/TaskModal)
  TaskModal.tsx               — orquestrador (~155 linhas)
  components/
    TaskHeader.tsx            — cabeçalho: label Editar/Nova, badge #id, botão fechar
    TaskMetadataSection.tsx   — título, link ClickUp, toggles Bloqueada/Concluída, datas condicionais
    SubtaskList.tsx           — lista de subtasks, badge de contagem, empty state, botão "+ Nova Subtask"
    SubtaskRow.tsx            — linha individual: grip, título, selects de status/progresso, assignees, datas, remover
    TaskFooter.tsx            — botões Apagar demanda / Cancelar / Salvar Alterações
  hooks/
    useSubtasks.ts            — estado do array de subtasks + CRUD (add/remove/update/toggleAssignee); exporta SubtaskDraft
    useTaskForm.ts            — estado do formulário (title, clickupLink, blocked, etc.) + helpers buildWeekendConfirmMessage e postponeSubtasks
```

## Responsabilidade

Modal de criação e edição de demandas. Gere o formulário de subtasks de forma dinâmica (N subtasks livres, sem lista fixa de 8 tipos).

## Subtasks

Cada subtask tem:
- **title** (obrigatório) — nome livre dado pelo usuário
- **status** (`SubtaskStatus`) — controla cor/ícone; dropdown com os 8 valores de `STEP_TYPES_ORDER`
- **progressStatus** (`SubtaskProgressStatus`) — andamento operacional: A fazer, Pronta, Em andamento, Em revisão, Aguardando, Bloqueada, Precisa de ajustes, Pausada, Concluída ou Cancelada
- **start / end** — datas obrigatórias quando subtask existe
- **assignees** — opcional; toggle por membro
- Botão de remover por subtask
- Botão "+ Adicionar subtask" no rodapé da lista

Nova demanda começa **sem subtasks**. O usuário adiciona livremente.

## Validação

- `title`: mín. 3 caracteres
- `clickupLink`: opcional, deve ser URL válida (`https://...`)
- Pelo menos 1 subtask com `title` preenchido e datas `start`/`end` válidas (`end >= start`)

## Confirmação de fim de semana / feriado

Se alguma subtask tiver datas em fim de semana ou feriado, exibe `ConfirmModal` com 3 opções:
- Salvar mesmo assim
- Prolongar para próximo dia útil (via `nextNonHolidayBusinessDay`)
- Cancelar

## Lógica de estado

O estado interno usa `SubtaskDraft` (Subtask + `_tempId` para identificação local antes de persistir). Subtasks novas têm `id: ''`; subtasks existentes mantêm o `id` do banco — o `updateTask` do CRUD diferencia novas (INSERT) de existentes (UPDATE/DELETE) por este campo.

## Dirty detection / submit

`useFormState` rastreia `isDirty` comparando snapshot inicial vs estado atual. Botão "Salvar" desabilitado enquanto `!isDirty || submitting`.

## Apagar Demanda

Botão "Apagar" no footer (só visível ao editar). Delega para prop `onDelete`.
