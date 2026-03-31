# Views — DashboardView e MembersView

## Estrutura de Ficheiros

O `DashboardView` foi dividido em múltiplos ficheiros para melhor manutenção:

| Ficheiro | Responsabilidade |
|---|---|
| `src/views/DashboardView.tsx` | Componente principal: header, filtros, métricas, aviso Drive, legenda |
| `src/views/CalendarView.tsx` | Vista de calendário mensal com drag-drop e slots |
| `src/views/TimelineView.tsx` | Vista de timeline/Gantt com drag-drop por fase |
| `src/views/dashboardUtils.ts` | Constantes, helpers, tipos partilhados (`DragState`, `DragPreview`, `BarItem`, `layoutWeekBars`, etc.) |

---

## DashboardView (`src/views/DashboardView.tsx`)

### Props

```ts
{
  tasks: Task[];
  members: Member[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: Task) => void;  // usado pelo drag-drop
  onOpenNew: () => void;
  onExport: () => void;                // window.print()
  isConnected: boolean;               // mostra aviso Drive desconectado
}
```

### Modos de Visualização

Toggle no canto superior direito da view:

**Calendário (`CalendarView`)**
- Grade mensal (Seg→Dom, semanas completas)
- Cada fase de cada tarefa é renderizada como uma barra colorida
- **Drag**: arrastar uma barra move o início/fim da fase
- **Resize**: handles nas extremidades da barra para ajustar individualmente início (esquerda) ou fim (direita)
- Máximo de 3 barras por célula (`MAX_SLOTS = 3`); excesso mostra `+N`
- Fim de semana tem fundo levemente destacado
- "Hoje" tem fundo azul claro
- Navegação: `<` mês anterior, `>` mês seguinte, `Hoje` volta ao mês atual

**Timeline/Gantt (`TimelineView`)**
- Range configurável: botões `14d / 30d / 60d / 90d` no header (padrão: 60 dias)
- Colunas de largura fixa `36px` por dia — o container scrollável expande; não há compressão a qualquer range
- **Layout em degraus**: cada tarefa abre 4 sub-linhas (Design → Approval → Dev → QA), uma por fase; como as fases avançam no tempo, as barras formam uma escadaria natural
- **Drag-and-drop e resize** por fase — mesma mecânica do CalendarView (arrastar = mover, handles laterais = resize)
- Botões editar/apagar por tarefa — visíveis no hover, dentro do container (posicionamento correcto)
- Fim de semana tem coluna destacada

### Lógica de Slots

```
Para cada semana (linha) do calendário:
  Para cada tarefa e fase:
    Calcular quais células (colunas) a barra ocupa
    Atribuir ao menor slot disponível (0, 1 ou 2)
    Se slot > 2: marcar célula como overflow
```

O algoritmo garante que barras da mesma fase não se sobreponham verticalmente dentro de uma linha.

### Drag-and-Drop

Estado de drag mantido em refs (`useRef`) para evitar re-renders:

```ts
dragState.current = {
  taskId, phaseId,
  dragType: 'move' | 'resize-start' | 'resize-end',
  startX,
  originalStart, originalEnd
}
```

**CalendarView** — largura da célula medida do DOM: `containerWidth / 7`.

**TimelineView** — largura fixa: `DAY_COL_W = 36` (constante; não precisa de medir o DOM).

A actualização chama `onUpdateTask` a cada `mousemove` (live preview), confirmando ao `mouseup`.

---

## MembersView (`src/views/MembersView.tsx`)

### Props

```ts
{
  tasks: Task[];
  members: Member[];
}
```

### Lógica de Capacidade

Para cada membro, conta as tarefas onde `assignee === member.id` e `status !== 'concluído'`.

| Tarefas ativas | Status | Cor |
|----------------|--------|-----|
| 0–2 | Livre | Verde |
| 3 | Alocado | Azul |
| >3 | Sobrecarregado | Vermelho |

### Layout

Cards por membro com:
- Avatar (iniciais) com cor baseada no status de capacidade
- Nome e role
- Badge de status
- Lista das tarefas ativas com fase atual (a primeira fase cujo `end >= hoje`)
