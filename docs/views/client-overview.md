# ClientOverviewView — Visão Geral do Cliente

View individual por cliente, exibida quando `view="client-overview"`. Mostra um resumo operacional do cliente atualmente selecionado: KPIs, demandas e membros alocados. É o ponto de entrada específico de um cliente, em contraste com a `OverviewView` (home pessoal do usuário).

## Estrutura de Arquivos

```
src/views/client-overview/
├── index.ts
├── ClientOverviewView.tsx
├── hooks/
│   └── useClientOverviewData.ts
└── components/
    ├── ClientOverviewHeader.tsx
    ├── ClientKpis.tsx
    ├── ClientTaskList.tsx
    └── ClientMembersCard.tsx
```

## Layout

```
[Cabeçalho]
┌────────────────────────────────────────┐
│  ClientOverviewHeader (ícone + nome)   │
└────────────────────────────────────────┘

"Resumo"
┌────────────────────────────────────────┐
│  ClientKpis (grid 2×2)                 │
└────────────────────────────────────────┘

"Detalhes"
┌───────────────────────────┬────────────┐
│  ClientTaskList           │ ClientMem  │
│  (abertas + concluídas)   │ bersCard   │
└───────────────────────────┴────────────┘

Mobile: stacking vertical (1 col).
```

"Detalhes" usa `grid-cols-[1fr_280px]`. Reutiliza as classes CSS `overview-root`, `overview-ambient`, `overview-card`, `overview-section-label` e `overview-item-enter` da OverviewView.

## `useClientOverviewData`

**Arquivo:** `src/views/client-overview/hooks/useClientOverviewData.ts`

Recebe `clientId: string | null`. Busca em paralelo via `Promise.all`:

1. **Info do cliente** — `clients.id, name` filtrado por `clientId`
2. **Tasks do cliente** — `tasks` filtradas por `client_id`, com join em `task_subtasks → subtask_assignees → members`

**KPIs calculados no client:**
- `openTasks` — tasks com `concluded_at IS NULL`
- `lateTasks` — tasks abertas com ao menos 1 subtarefa com `end_date < hoje`
- `concludedTasks` — tasks com `concluded_at IS NOT NULL`
- `totalSubtasks` — soma de subtarefas de todas as tasks
- `lateSubtasks` — subtarefas com `end_date < hoje` em tasks abertas

**Membros calculados no client:** agrega `subtask_assignees` das tasks abertas em um `Map` por `member_id`, contando `subtaskCount`. Ordenados por carga decrescente.

## Componentes

### `ClientOverviewHeader`
Cabeçalho simples com ícone `Building2` + nome do cliente + label "Visão geral do cliente". Exibe skeleton durante `loading`.

### `ClientKpis`
Grid 2×2 de KPI tiles reutilizando o mesmo padrão visual da `WelcomeCard`:
- **Demandas abertas** — variant `default`
- **Com atraso** — variant `urgent` (vermelho quando `> 0`)
- **Subtarefas atrasadas** — variant `urgent`
- **Concluídas** — variant `positive`

### `ClientTaskList`
Lista de demandas separadas em dois grupos: abertas (no topo) e concluídas (abaixo com label "Concluídas"). Cada item mostra:
- Ícone `CheckCircle2` (cinza = aberta, verde = concluída)
- Título da task
- Contagem de subtarefas + quantidade atrasadas em vermelho
- Badge "Atrasada" (vermelho) ou "Concluída" (verde)
- Link externo para ClickUp se `clickupLink` presente

Empty state com `GitBranch`. Skeleton durante `loading`.

### `ClientMembersCard`
Lista de membros alocados às subtarefas abertas do cliente, ordenados por quantidade de subtarefas. Cada item exibe avatar (foto ou iniciais), nome, role e contagem de subtarefas. Empty state com `Users`. Skeleton durante `loading`.

## Props de `ClientOverviewView`

```ts
interface ClientOverviewViewProps {
  clientId: string | null
}
```

## Integração

- Montada em `AppRouter` quando `view === "client-overview"`, recebendo `effectiveClientId` do `RouterCtx`
- Item **"Visão Geral"** adicionado ao topo da nav de cliente em `AppSidebar` (logo após "Início"), visível apenas quando há cliente selecionado (`requiresClient: true`)
- `ViewType` em `useUIStore` inclui `'client-overview'`
