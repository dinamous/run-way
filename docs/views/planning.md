# PlanningView + CalendarView + TimelineView

## Visão Geral

`PlanningView` é o container de todas as visualizações de planejamento de demandas. Substitui a antiga `DashboardView` e absorveu a `TasksView` como subview `demandas`.

Localização: `src/views/planning/`

## Navegação

A navegação entre modos é feita via **roteamento global** (`useUIStore`). Cada modo tem uma `ViewType` própria:

| ViewType | O que renderiza |
|---|---|
| `calendar` | Calendário mensal com drag-drop |
| `timeline` | Gantt/linha do tempo |
| `list` | Tabela de demandas (ListView) |
| `demandas` | Lista de demandas agrupadas por etapa atual |

`PlanningView` recebe `subview: 'calendar' | 'timeline' | 'list' | 'demandas'` e renderiza o modo correspondente.

## Ficheiros

| Ficheiro | Responsabilidade |
|---|---|
| `src/views/planning/PlanningView.tsx` | Orquestra dados, filtros e renderiza a subview correta |
| `src/views/planning/hooks/useTaskFilters.ts` | Filtros de assignee, status, steps, período para calendar/timeline |
| `src/views/planning/components/FilterBar.tsx` | Barra de filtros usada por calendar e timeline |
| `src/views/planning/components/MetricsBar.tsx` | Cards de métricas (saúde operacional, em andamento, bloqueadas) |
| `src/views/planning/components/StepsLegend.tsx` | Legenda de cores das fases |
| `src/views/planning/components/TasksFilters.tsx` | Barra de filtros do subview `demandas` (busca, etapa, responsável, período, bloqueadas, concluídas) |
| `src/views/planning/components/StepGroup.tsx` | Grupo colapsável de tasks por etapa (usado em `demandas`) |
| `src/views/planning/components/TaskRow.tsx` | Linha de uma demanda no subview `demandas` |
| `src/views/planning/components/ActionMenu.tsx` | Dropdown de ações rápidas (abrir, ClickUp, concluir, bloquear) |
| `src/views/planning/utils.ts` | `formatDueDate` — badge de prazo relativo |
| `src/views/CalendarView.tsx` | Calendário mensal com drag-drop e slots |
| `src/views/timeline/TimelineView.tsx` | Timeline/Gantt — componente raiz |
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

Lista todas as demandas agrupadas por **subtask status**. Focada em acompanhamento operacional.

### StepGroup
Agrupa tasks por `SubtaskStatus` (8 grupos fixos). Colapsa/expande via `ChevronDown`/`ChevronRight`.

Uma demanda aparece em **todos os grupos** onde tiver subtask ativa (`active: true`) — não apenas no grupo da "subtask atual". Com filtro por membro, aparece nos grupos das subtasks onde o membro está atribuído.

Recebe `hasActiveFilters?: boolean`. Comportamento por estado:
- **Com tasks:** expansível normalmente, cabeçalho com contador colorido
- **Vazio + filtros ativos:** cabeçalho apagado (contador `0`), mensagem de filtro em itálico
- **Vazio sem filtros:** renderizado normalmente com contador `0`

**Virtualização (`react-window`):** quando um grupo tem mais de 50 tasks, usa `FixedSizeList` (altura de item `52px`, altura máxima `600px`). Abaixo do threshold usa `.map()` normal.

### TaskRow
Linha de uma demanda. A div inteira é clicável (`onEdit`) — `ActionMenu` tem `stopPropagation`.

Exibe:
- Título com risco (`line-through`) quando bloqueada
- Ícone `Link2` inline para abrir o ClickUp diretamente
- Badge "Bloqueada" (vermelho) — fundo da linha fica vermelho sutil
- Badge "Concluída" (muted) — linha com opacidade reduzida
- Badge de prazo dinâmico baseado no `end` da subtask ativa do grupo (`formatDueDate`)
- Avatares dos responsáveis da subtask correspondente ao grupo

### TasksFilters
Barra de filtros com `CheckboxDropdown` customizado para etapa e responsável. Filtros:

| Filtro | Implementação |
|---|---|
| Busca por texto/ID | `task.title` e `task.id` case-insensitive |
| Etapa | `selectedSteps: SubtaskStatus[]` — verifica `subtask.status` das ativas |
| Responsável | `selectedMemberIds: string[]` — qualquer assignee de qualquer subtask |
| Período (prazo) | Tabs "Todos / 7d / 15d / 30d" — compara `end` da subtask ativa com `today + N dias` |
| Bloqueadas | Toggle — filtra `task.status.blocked === true` |
| Concluídas | Toggle — mostra tarefas com `task.concludedAt` preenchido (default: ocultas) |

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
