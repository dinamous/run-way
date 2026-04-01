# DashboardView + CalendarView + TimelineView

## Ficheiros

| Ficheiro | Responsabilidade |
|---|---|
| `src/views/DashboardView.tsx` | Header, filtros, métricas, toggle Calendar/Timeline |
| `src/views/CalendarView.tsx` | Calendário mensal com drag-drop e slots |
| `src/views/TimelineView.tsx` | Timeline/Gantt com drag-drop por fase |
| `src/views/dashboardUtils.ts` | Constantes, helpers, tipos (`DragState`, `DragPreview`, `BarItem`, `layoutWeekBars`) |

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
- Layout em degraus: 4 sub-linhas por tarefa (Design → Approval → Dev → QA), `height = 28px`
- Drag-drop e resize por fase — `colWidth` fixo (sem medir DOM)
- Botões editar/apagar por tarefa (hover)

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
