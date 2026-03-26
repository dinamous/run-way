# Views — DashboardView e MembersView

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

**Timeline (`TimelineView`)**
- 60 dias a partir de hoje
- Coluna esquerda fixa: título da tarefa, responsável, status, link ClickUp
- Barras estáticas (sem interação) representando cada fase
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

O movimento em pixels é convertido para dias com base na largura de cada célula (`cellWidth = containerWidth / 7`).

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
