# DashboardView + CalendarView + TimelineView

## Navegação

A navegação entre modos é feita via **roteamento global** (`useUIStore`). Cada modo tem uma `ViewType` própria na sidebar (grupo "Calendário") e uma entrada separada "Visão Geral":

| ViewType | Subview | O que renderiza |
|---|---|---|
| `overview` | — | Métricas resumo sem conteúdo de calendário |
| `calendar` | — | Calendário mensal com drag-drop |
| `timeline` | — | Gantt/linha do tempo |
| `list` | — | Tabela de demandas |

`DashboardView` recebe `subview: 'overview' | 'calendar' | 'timeline' | 'list'` e renderiza diretamente o modo correspondente, sem tabs internos.

## Ficheiros

| Ficheiro | Responsabilidade |
|---|---|
| `src/views/dashboard/DashboardView.tsx` | Orquestra dados, filtros, métricas e renderiza a subview correta |
| `src/views/dashboard/components/DashboardHeader.tsx` | **Removido** — substituído por título inline derivado de `subview` |
| `src/views/CalendarView.tsx` | Calendário mensal com drag-drop e slots |
| `src/views/timeline/TimelineView.tsx` | Timeline/Gantt — componente raiz |
| `src/views/timeline/components/TimelineHeader.tsx` | Selector de range (14/30/60/90d) |
| `src/views/timeline/components/DayColumnHeaders.tsx` | Header de colunas de dias (mês + dia + feriados) |
| `src/views/timeline/components/TaskCalendarRows.tsx` | Linhas de fases no calendário por tarefa |
| `src/views/timeline/components/TaskInfoPanelWrapper.tsx` | Wrapper da coluna fixa esquerda por tarefa |
| `src/views/timeline/components/TaskInfoPanel.tsx` | Conteúdo da coluna fixa (título, assignees, status) |
| `src/views/timeline/components/StepRow.tsx` | Linha individual de fase com drag |
| `src/views/timeline/components/PhaseBar.tsx` | Barra visual de uma fase |
| `src/views/timeline/hooks/useTimelineDays.ts` | Calcula array de dias para o range selecionado |
| `src/views/timeline/hooks/useRowHeightSync.ts` | Sincroniza altura entre coluna info e coluna calendário por linha |
| `src/views/timeline/hooks/useHeaderHeightSync.ts` | Sincroniza altura do header esquerdo com `DayColumnHeaders` |
| `src/utils/dashboardUtils.ts` | Constantes, helpers, tipos (`DragState`, `DragPreview`, `BarItem`, `layoutWeekBars`) |

## CalendarView

- Grade mensal (Seg→Dom, semanas completas)
- Barras coloridas por fase com drag (mover) e resize (handles laterais)
- `MAX_SLOTS = 3` barras por célula; excesso mostra `+N`
- Fim de semana destacado; "Hoje" com fundo azul
- Largura da célula: medida do DOM (`containerWidth / 7`)

### Slot Algorithm
Para cada semana, cada fase de cada tarefa: calcular colunas ocupadas → atribuir menor slot disponível (0–2) → overflow se >2.

## TimelineView

- Range: 14 / 30 / 60 / 90 dias (botões no header, padrão 60)
- Colunas fixas `DAY_COL_W = 36px` com scroll horizontal
- Layout em degraus: fases visíveis por tarefa (Design → Approval → Dev → QA), `PHASE_ROW_H = 28px`
- Drag-drop e resize por fase — `colWidth` fixo (sem medir DOM)
- Botões editar/apagar por tarefa (hover)
- Dois containers paralelos: coluna fixa (info) + área scrollável (calendário). Alturas sincronizadas via:
  - `useRowHeightSync` — sincroniza altura de cada linha de tarefa entre os dois lados
  - `useHeaderHeightSync` — sincroniza altura do header esquerdo com `DayColumnHeaders` via `ResizeObserver`

## Drag-and-Drop (ambas views)

Estado em refs (`useRef`) para evitar re-renders:
```ts
dragState.current = {
  taskId, phaseId,
  dragType: 'move' | 'resize-start' | 'resize-end',
  startX, originalStart, originalEnd
}
```
Atualização via `onUpdateTask` a cada `mousemove` (live preview), confirmação em `mouseup`.
