# TaskModal

**Pasta:** `src/components/TaskModal/`

## Estrutura de ficheiros

```
TaskModal/
  index.ts                    — re-export público (import via @/components/TaskModal)
  TaskModal.tsx               — orquestrador; layout duas colunas + animação Framer Motion spring
  components/
    TaskHeader.tsx            — DESCONTINUADO (não utilizado; pode ser removido)
    TaskMetadataSection.tsx   — DESCONTINUADO (não utilizado; pode ser removido)
    TaskSidebar.tsx           — sidebar direita: status (Bloqueada/Concluída), datas condicionais, estimativa (horas + chips poker), tipo, complexidade, prazo ao cliente, link ClickUp
    SubtaskList.tsx           — lista animada (AnimatePresence) de subtasks; empty state
    SubtaskRow.tsx            — linha individual: grip, título, selects de status/progresso, assignees, datas, remover
    TaskFooter.tsx            — botões Apagar demanda / Cancelar / Salvar Alterações
  hooks/
    useSubtasks.ts            — estado do array de subtasks + CRUD (add/remove/update/toggleAssignee); exporta SubtaskDraft
    useTaskForm.ts            — estado do formulário (title, clickupLink, blocked, expectedHours, complexity, taskType, dueDate, etc.) + helpers buildWeekendConfirmMessage e postponeSubtasks
```

## Layout

Layout de duas colunas com animação Framer Motion (spring):
- **Esquerda** — título livre (input `text-2rem`), barra de progresso com spring physics (`useSpring`/`useTransform`), lista animada de subtasks
- **Direita (`TaskSidebar`)** — toggles Bloqueada/Concluída, datas condicionais, estimativa em horas com chips Planning Poker, tipo (`feature`/`bug`/`support`/`meeting`), complexidade (`baixa`→`extrema`), prazo ao cliente (`dueDate`), link ClickUp com botão de abrir
- **Footer** — botões Apagar / Cancelar / Salvar

Overlay + modal são `motion.div` (spring stiffness 280 / damping 28) com animação de entrada/saída. O `AnimatePresence` que controla o mount/unmount do modal fica em `AppModals` — não dentro do `TaskModal`. Subtasks entram/saem com `AnimatePresence` interno ao `SubtaskList`.

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

## Campos de planejamento (TaskSidebar)

| Campo | Tipo | Comportamento |
|---|---|---|
| `expectedHours` | `number?` | Input numérico + chips Planning Poker (`0.5h`–`13h`); clicar chip novamente deseleciona |
| `taskType` | `TaskType?` | Chips `Feature` / `Bug` / `Suporte` / `Reunião`; toggle (deseleciona ao clicar novamente) |
| `complexity` | `TaskComplexity?` | Chips `Baixa` → `Extrema`; toggle |
| `dueDate` | `string?` | Date picker `YYYY-MM-DD`; prazo de entrega ao cliente |

Todos opcionais — tasks existentes sem esses campos não bloqueam save.

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
