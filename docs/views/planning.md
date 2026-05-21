# PlanningView + CalendarView + TimelineView

## Visão Geral

`PlanningView` é o container de todas as visualizações de planejamento de demandas. Substitui a antiga `DashboardView` e absorveu a `TasksView` como subview `demandas`.

**Arquitetura de filtros:** `PlanningView` gerencia dois conjuntos de filtros independentes, ambos como `FiltersState` local:
- `demandasFilters` — filtros do subview `demandas`
- `calendarFilters` — filtros dos subviews `calendar`, `timeline` e `kanban`

Ambos são renderizados pelo `PlanningViewHeader` via `TasksFilters` (o componente de filtros unificado). `PlanningView` aplica `calendarFilters` sobre as tasks já processadas por `useTaskFilters` antes de passar `filteredTasks` para `CalendarView` e `TimelineView`. `CalendarView` e `TimelineView` não renderizam mais filtros internamente — recebem apenas tasks já filtradas. O estado de `viewMode` (step/demand) para o calendário ainda vive em `usePlanningFiltersStore`.

Localização: `src/views/planning/`

## Navegação

A navegação entre modos é feita via **roteamento global** (`useUIStore`). Cada modo tem uma `ViewType` própria:

| ViewType | O que renderiza |
|---|---|
| `calendar` | Calendário mensal com drag-drop |
| `timeline` | Gantt/linha do tempo |
| `list` | Tabela de demandas (ListView) |
| `demandas` | Tabela hierárquica de demandas com subtasks como linhas-filho |
| `kanban` | Board Kanban com colunas de progressStatus e drag-drop nativo |

`PlanningView` recebe `subview: 'calendar' | 'timeline' | 'list' | 'demandas' | 'kanban'` e renderiza o modo correspondente. URL: `/:clientSlug/tasks/kanban`.

## Ficheiros

| Ficheiro | Responsabilidade |
|---|---|
| `src/views/planning/PlanningView.tsx` | Orquestra dados globais (tasks, members, holidays), aplica filtros via `useTaskFilters` e passa `filteredTasks`, `members`, `onOpenNew` e `onExport` para `CalendarView` e `TimelineView` via prop |
| `src/views/planning/components/PlanningViewHeader.tsx` | Header compartilhado: tabs de navegação, título/descrição da view e `TasksFilters` para todos os subviews (`demandas`, `calendar`, `timeline`, `kanban`). Recebe `demandasFilters` e `calendarFilters` como props separados. |
| `src/views/kanban/KanbanView.tsx` | Board Kanban com até 10 colunas cobrindo todos os valores de `SubtaskProgressStatus` (`todo`, `ready`, `in-progress`, `in-review`, `waiting`, `blocked`, `needs-changes`, `paused`, `done`, `canceled`); exibe apenas as 4 padrão + colunas que tiverem cards; demandas mãe concluídas (`concludedAt` preenchido) são excluídas; cards draggáveis com dot colorido por `STEP_META`, badge de prazo, avatares e indicador de bloqueio; ao mover um card chama `onUpdateTask` com `progressStatus` atualizado. |
| `src/store/usePlanningFiltersStore.ts` | Store Zustand com estado de `viewMode` (step/demand) e filtros legados lidos por `useTaskFilters` |
| `src/views/planning/hooks/useTaskFilters.ts` | Lê filtros de `usePlanningFiltersStore` e aplica sobre as tasks; expõe `filteredTasks`, contadores e helpers |
| `src/views/planning/components/FilterBar.tsx` | Barra de filtros legada — não mais usada por `CalendarView` ou `TimelineView` |
| `src/views/planning/components/MetricsBar.tsx` | Cards de métricas (saúde operacional, em andamento, bloqueadas) |
| `src/views/planning/components/StepsLegend.tsx` | Legenda de cores das fases |
| `src/views/planning/components/TasksFilters.tsx` | Barra de filtros do subview `demandas` (busca, status de subtask, responsável com avatares, período, bloqueadas, concluídas) |
| `src/views/planning/components/TaskTable.tsx` | Componente raiz da tabela — itera tasks e delega para `TaskTableRow` |
| `src/views/planning/components/TaskTableRow.tsx` | Linha-pai colapsável de uma task com progresso, prazo, avatares e painel de subtasks |
| `src/views/planning/components/SubtaskRow.tsx` | Linha-filho de uma subtask com ícone de status, badge de etapa, popover de andamento, `DatesPopover` e `AssigneesPopover` |
| `src/views/planning/components/MemberAvatars.tsx` | Avatares empilhados de membros (tamanhos `sm`/`xs`); placeholder `?` quando sem responsável |
| `src/views/planning/components/AssigneesPopover.tsx` | Popover de atribuição de responsáveis — renderizado via `createPortal` no `document.body` |
| `src/views/planning/components/DatesPopover.tsx` | Popover de edição de período (start/end) — renderizado via `createPortal` no `document.body` |
| `src/views/planning/components/SubtaskProgressStatusPopover.tsx` | Popover de edição do andamento da subtask (`progressStatus`) |
| `src/views/planning/components/usePopover.ts` | Hook de controle de popover: open/close, posicionamento via `getBoundingClientRect`, fechar ao clicar fora ou `Escape` |
| `src/views/planning/components/StepGroup.tsx` | **Legado** — grupo colapsável por etapa (substituído por `TaskTable`) |
| `src/views/planning/components/TaskRow.tsx` | **Legado** — linha de demanda no modo "Por etapa" (substituído por `TaskTable`) |
| `src/views/planning/components/TaskList.tsx` | **Legado** — lista de demandas com subtasks expandidas (substituído por `TaskTable`) |
| `src/views/planning/components/ActionMenu.tsx` | Dropdown de ações rápidas (abrir, ClickUp, concluir, bloquear) |
| `src/views/planning/utils.ts` | `formatDueDate` — badge de prazo relativo |
| `src/views/calendar/CalendarView.tsx` | Calendário mensal — recebe `tasks` (já filtradas) via prop; renderiza apenas header de navegação de mês + grade de semanas. Sem filtros internos. Props: `tasks`, `onEdit`, `onUpdateTask`, `holidays` |
| `src/views/timeline/TimelineView.tsx` | Timeline/Gantt — recebe `tasks` (já filtradas) via prop; sem filtros internos. Props: `tasks`, `members`, `onEdit`, `onDelete`, `onUpdateTask`, `holidays` |
| `src/views/timeline/components/TimelineHeader.tsx` | Selector de range (14/30/60/90d) |
| `src/views/timeline/components/DayColumnHeaders.tsx` | Header de colunas de dias (mês + dia + feriados) |
| `src/views/timeline/components/TaskCalendarRows.tsx` | Linhas de fases no calendário por tarefa |
| `src/views/timeline/components/TaskInfoPanelWrapper.tsx` | Wrapper da coluna fixa esquerda por tarefa |
| `src/views/timeline/components/TaskInfoPanel.tsx` | Conteúdo da coluna fixa (título, assignees, status) |
| `src/views/timeline/components/PhaseBar.tsx` | Barra visual de uma fase |
| `src/views/timeline/hooks/useTimelineDays.ts` | Calcula array de dias para o range selecionado |
| `src/views/timeline/hooks/useRowHeightSync.ts` | Sincroniza altura entre coluna info e coluna calendário por linha |
| `src/views/timeline/hooks/useHeaderHeightSync.ts` | Sincroniza altura do header esquerdo com `DayColumnHeaders` |
| `src/utils/dashboardUtils.ts` | Constantes, helpers, tipos (`DragState`, `DragPreview`, `BarItem`, `layoutWeekBars`) |

## Subview: Demandas

Lista todas as demandas em **tabela hierárquica** estilo ClickUp. Não há mais toggle de modo — um único layout unifica a visão por task e por subtask.

### TaskTable
Componente principal do subview `demandas`. Cada **task** é uma linha-pai colapsável; cada **subtask** é uma linha-filho exibida quando a task está expandida.

**Linha da task (pai):**
- Borda lateral colorida pela fase ativa (ou vermelha se bloqueada)
- Botão `▾`/`▸` para expandir/colapsar subtasks
- Título clicável (`onEdit`) com risco se bloqueada ou concluída
- Badges "Bloqueada" e "Concluída"
- Ícone `Link2` inline para ClickUp
- **Barra de progresso** (visível em `md+`): percentual de subtasks concluídas; verde em 100%, cor primária caso contrário
- Contador de etapas, badge de prazo (da subtask ativa), avatares de todos os responsáveis
- `ActionMenu` com `stopPropagation`

**Painel expandido das subtasks:** header interno alinhado ao grid + linha vertical da árvore (`absolute left-[18px]`) com traço horizontal em cada subtask. Grid fixo `grid-cols-[180px_150px_1fr_110px_90px_auto]`.

| Coluna | Conteúdo |
|---|---|
| Etapa | Ícone de status contextual + pill colorida com `STEP_META.label` |
| Status | Pill clicável com `Subtask.progressStatus`; abre popover para alterar andamento inline |
| Título | Texto livre da subtask (`subtask.title`) |
| Período | `DD/MM → DD/MM` em `font-mono` — clicável; abre `DatesPopover` para editar start/end inline |
| Prazo | Badge `formatDueDate` — exibido para **todas** as subtasks; `—` quando sem data |
| Resp. | Avatares dos responsáveis; botão `+` dashed quando sem responsável — clicável; abre `AssigneesPopover` para atribuir/remover membros inline |

**Ícones de status da subtask (`SubtaskStatusIcon`):**

| Estado | Ícone |
|---|---|
| Concluída (task) | `CheckCircle2` verde |
| Ativa + bloqueada | `AlertTriangle` laranja |
| Ativa + atrasada | `AlertCircle` vermelho |
| Ativa normal | `PlayCircle` azul |
| Pendente | `Circle` pequeno em muted |

**Edição inline de subtasks:**

`AssigneesPopover` — abre ao clicar no avatar ou no botão `+` da coluna Resp. Lista todos os membros com toggle (checkbox visual). Persiste via `useSubtaskQuickEdit.updateSubtaskAssignees` — diff de adds/removes direto em `subtask_assignees`. Update otimista no cache TanStack Query.

`DatesPopover` — abre ao clicar no período da coluna Período. Dois `<input type="date">` (início/fim) com botões Cancelar/Salvar. Persiste via `useSubtaskQuickEdit.updateSubtaskDates` — UPDATE direto em `task_subtasks`. Fecha ao salvar com sucesso.

`SubtaskProgressStatusPopover` — abre ao clicar no pill da coluna Status. Valores: A fazer, Pronta, Em andamento, Em revisão, Aguardando, Bloqueada, Precisa de ajustes, Pausada, Concluída, Cancelada. Persiste via `useSubtaskQuickEdit.updateSubtaskProgressStatus` — UPDATE direto em `task_subtasks.progress_status`. Fecha ao salvar com sucesso.

Os popovers fecham ao clicar fora ou pressionar `Escape` (hook `usePopover`). Renderizam via `createPortal` no `document.body` com `z-index: 9999` e posicionamento calculado por `getBoundingClientRect + scrollY/scrollX` — isso evita corte por `overflow:hidden` das rows da tabela. `PlanningView` instancia `useSubtaskQuickEdit` e passa `onUpdateSubtaskAssignees`, `onUpdateSubtaskDates` e `onUpdateSubtaskProgressStatus` para `TaskTable`.

**Comportamentos:**
- Tasks expandidas por padrão quando há filtros ativos
- Reordenação manual das linhas-pai por drag-and-drop quando não há filtros ativos; a ordem persiste em `tasks.priority_order`
- Tasks bloqueadas: fundo vermelho sutil em task e subtasks
- Tasks concluídas: opacidade reduzida, título riscado
- Subtasks sem datas mostram `—` no campo Período

### TasksFilters
Barra de filtros em três camadas animadas (Framer Motion). Interface `FiltersState`:

```ts
{
  searchTerm: string;
  selectedSteps: SubtaskStatus[];
  selectedProgressStatuses: SubtaskProgressStatus[];
  selectedMemberIds: string[];
  selectedPeriod: string;       // legado — mantido para compatibilidade
  dateFrom: string;             // YYYY-MM-DD, range personalizado
  dateTo: string;               // YYYY-MM-DD, range personalizado
  showOnlyBlocked: boolean;
  showConcluded: boolean;
  sortField: 'priority' | 'deadline' | 'title' | 'created';
  sortDirection: 'asc' | 'desc';
  groupBy: 'none' | 'step' | 'status' | 'member';
}
```

**Layout (3 linhas):**
1. **Busca + Ordenação + Agrupamento** — sempre visíveis. Sort field via `SelectPill`, direção via botão toggle animado, group via `SelectPill`.
2. **Filtros principais** — Categoria, Status, `DateRangePicker` (popover com inputs `type="date"`), separador, botão "Filtros avançados" (colapsa/expande row 3 com `AnimatePresence`), botão Limpar (aparece só quando há filtros ativos).
3. **Filtros avançados** (colapsável) — Responsável (`MemberAvatarPicker`), Bloqueadas, Concluídas.
4. **Chips de filtros ativos** — aparecem/somem com `AnimatePresence mode="popLayout"`; cada chip tem `×` para remoção individual.

Todos os controles têm `h-9` para altura uniforme. `EMPTY_FILTERS` em `PlanningView` inicializa `dateFrom: ''`, `dateTo: ''`, `sortField: 'priority'`, `sortDirection: 'asc'`, `groupBy: 'none'`.

| Filtro | Campo | Implementação |
|---|---|---|
| Busca por texto/ID | `searchTerm` | `task.title`, `task.id` e `subtask.title` case-insensitive |
| Categoria | `selectedSteps` | Dropdown checkbox |
| Status | `selectedProgressStatuses` | Dropdown checkbox |
| Período (range) | `dateFrom` / `dateTo` | `DateRangePicker` — popover com dois `<input type="date">` |
| Responsável | `selectedMemberIds` | `MemberAvatarPicker` — avatares empilhados |
| Bloqueadas | `showOnlyBlocked` | Toggle no painel avançado |
| Concluídas | `showConcluded` | Toggle no painel avançado |
| Ordenação | `sortField` + `sortDirection` | `SelectPill` + botão toggle com ícone animado |
| Agrupamento | `groupBy` | `SelectPill` — a lógica de agrupamento é aplicada pela view consumidora |

O botão **Nova Demanda** fica na row do título (alinhado à direita), não dentro da barra de filtros.

### Ordenação dentro dos grupos
Tasks ordenadas por `end` da subtask ativa no grupo — da mais atrasada para a mais recente. Sem data ficam no final.

## Subview: Calendar

- Grade mensal (Seg→Dom, semanas completas)
- Barras coloridas por fase com drag (mover) e resize (handles laterais)
- `MAX_SLOTS = 3` barras por célula; excesso mostra `+N`
- Fim de semana destacado; "Hoje" com fundo azul
- Largura da célula: medida do DOM (`containerWidth / 7`)

### Slot Algorithm
Para cada semana, cada fase de cada tarefa: calcular colunas ocupadas → atribuir menor slot disponível (0–2) → overflow se >2.

## Subview: Timeline

- Range: 14 / 30 / 60 / 90 dias (botões no header, padrão 60)
- Colunas fixas `DAY_COL_W = 36px` com scroll horizontal
- Drag-drop e resize por fase — `colWidth` fixo (sem medir DOM)
- Dois containers paralelos: coluna fixa (info) + área scrollável (calendário). Alturas sincronizadas via `useRowHeightSync` e `useHeaderHeightSync`

## Drag-and-Drop (calendar e timeline)

Estado em refs (`useRef`) para evitar re-renders:
```ts
dragState.current = {
  taskId, phaseId,
  dragType: 'move' | 'resize-start' | 'resize-end',
  startX, originalStart, originalEnd
}
```
Atualização via `onUpdateTask` a cada `mousemove` (live preview), confirmação em `mouseup`.
