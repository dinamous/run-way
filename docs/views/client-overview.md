# ClientOverviewView — Visão Geral do Cliente

View individual por cliente, exibida quando `view="client-overview"`. Funciona como um **cockpit do cliente**: responde de imediato o que precisa de atenção, qual é o risco, o que está atrasado e o que vem a seguir. É o ponto de entrada específico de um cliente, em contraste com a `OverviewView` (home pessoal do usuário).

## Estrutura de Arquivos

```
src/views/client-overview/
├── index.ts
├── ClientOverviewView.tsx
├── hooks/
│   └── useClientOverviewData.ts
└── components/
    ├── ClientOverviewHeader.tsx
    ├── ClientHealth.tsx
    ├── ClientFocus.tsx
    ├── ClientMetrics.tsx
    ├── ClientTasksByPriority.tsx
    ├── ClientTimeline.tsx
    └── ClientTeam.tsx
```

> `ClientKpis.tsx`, `ClientTaskList.tsx` e `ClientMembersCard.tsx` foram substituídos pelos componentes acima.

## Layout

```
[ClientOverviewHeader]

Com pendências (lateTasks | criticalTasks | dueSoonTasks > 0):
  [ClientFocus (1fr)] | [ClientHealth (240px)]

Sem pendências:
  [ClientHealth (full width)]
  [ClientFocus (full width)]

[ClientMetrics (grid 2×2 full width)]

[ClientTasksByPriority (1fr)] | [ClientTimeline (280px)]

[ClientTeam (full width)]

Mobile: stacking vertical (1 col).
```

A view gerencia seu próprio layout interno: background (`oklch(0.955_0.004_250)` / dark `oklch(0.13_0.008_250)`), layer `overview-ambient` e padding (`p-4 md:p-6 lg:p-8`), seguindo o mesmo padrão do `MembersView`. O `ViewShell` é invocado com `noPadding` e cuida apenas do breadcrumb. As classes `overview-card`, `overview-section-label` e `overview-item-enter` seguem disponíveis via `index.css`.

## `useClientOverviewData`

**Arquivo:** `src/views/client-overview/hooks/useClientOverviewData.ts`

Recebe `clientId: string | null`. Busca em paralelo via `Promise.all`:

1. **Info do cliente** — `clients.id, name`
2. **Tasks do cliente** — `tasks` filtradas por `client_id`, com join em `task_subtasks (id, title, end_date, status) → subtask_assignees → members`
3. **Membros do cliente** — `user_clients` filtrado por `client_id`, com join em `members (id, name, role, avatar_url, capacity)`

### Cache em memória

O hook mantém dois `Map`s no nível do módulo (compartilhados entre todas as instâncias):

- `cache: Map<clientId, { data, fetchedAt }>` — TTL de **1 minuto**; na remontagem dentro desse janela os dados são aplicados sem nenhum request ao Supabase.
- `inflight: Map<clientId, Promise<void>>` — deduplicação de fetches simultâneos; se uma requisição já está em andamento para o mesmo `clientId`, o segundo subscriber aguarda a promise e aplica os dados do cache quando ela resolver.

Após qualquer mutação de dados do cliente (salvar task, concluir subtarefa, etc.), chame:

```ts
import { invalidateClientOverviewCache } from '@/views/client-overview/hooks/useClientOverviewData'

invalidateClientOverviewCache(clientId)   // invalida só esse cliente
invalidateClientOverviewCache()           // invalida todo o cache
```

**Retorna `ClientOverviewData`:**

```ts
interface ClientOverviewData {
  client: ClientInfo | null
  kpis: ClientOverviewKpis
  health: ClientHealth
  focusTasks: ClientTask[]   // top 5 tasks mais críticas
  tasks: ClientTask[]        // todas as tasks
  members: ClientMember[]
  timeline: TimelineEntry[]  // subtasks com end_date ≤ hoje+7d
  loading: boolean
  error: string | null
}
```

### Tipos principais

```ts
interface ClientTask {
  id, title, clickupLink, concludedAt, createdAt
  subtasks: ClientSubtask[]
  subtaskCount: number
  lateSubtaskCount: number
  accumulatedLateDays: number          // soma dos dias de atraso por subtarefa
  priority: 'critical' | 'important' | 'backlog'
}

interface ClientSubtask {
  id, title, endDate, status, isLate
  assignees: ClientMember[]
}

type ClientHealthStatus = 'healthy' | 'warning' | 'critical'

interface ClientHealth {
  status: ClientHealthStatus
  lateTasks: number
  criticalTasks: number
  dueSoonTasks: number
}

interface TimelineEntry {
  taskId, taskTitle, subtaskId, subtaskTitle
  endDate: string        // YYYY-MM-DD
  daysFromNow: number    // negativo = atrasado
  isLate: boolean
  status: string
}
```

### Lógica de prioridade das tasks

| priority | Condição |
|---|---|
| `critical` | Task aberta com ao menos 1 subtarefa com `end_date < hoje` |
| `important` | Task aberta com subtarefa com `end_date ≤ hoje+7d` (sem atraso) |
| `backlog` | Demais tasks abertas |

### Lógica de saúde (`ClientHealthStatus`)

| Status | Condição |
|---|---|
| `critical` | `lateTasks ≥ 4` **ou** `criticalTasks ≥ 2` |
| `warning` | `lateTasks ≥ 1` **ou** `dueSoonTasks ≥ 2` |
| `healthy` | Nenhuma das anteriores |

### `focusTasks`

Top 5 tasks abertas, ordenadas por prioridade (`critical → important → backlog`) e, dentro da mesma prioridade, por `accumulatedLateDays` decrescente.

### `timeline`

Todas as subtarefas de tasks abertas com `end_date ≤ hoje+7d`, ordenadas por data. Inclui subtarefas já atrasadas (`daysFromNow < 0`).

### Membros

Lista **todos** os membros vinculados ao cliente via `user_clients`, independentemente de terem tarefas alocadas. A lógica funciona em duas etapas:

1. Agrega `subtask_assignees` das tasks abertas em `Map` por `member_id`, contando `subtaskCount` e `lateCount` (subtarefas com `isLate = true` atribuídas ao membro).
2. Itera pelos membros da query `user_clients` e insere no mapa os que ainda não estão presentes (com `subtaskCount: 0` e `lateCount: 0`).

Resultado ordenado por carga decrescente (`subtaskCount`).

```ts
interface ClientMember {
  id, name, role, avatarUrl
  capacity: number       // teto individual (members.capacity, default 6)
  subtaskCount: number   // total de subtarefas ativas atribuídas neste cliente
  lateCount: number      // subtarefas atrasadas atribuídas
}
```

## Componentes

### `ClientOverviewHeader`
Cabeçalho com ícone `Building2` + nome do cliente + label "Visão geral do cliente". Skeleton durante `loading`.

### `ClientHealth`
Card de saúde do cliente com três estados: 🟢 Saudável / 🟡 Atenção / 🔴 Em risco. Fundo colorido por estado, ponto animado pulsante, detalhes de contagem (tarefas atrasadas, críticas, vencem em breve). Quando não há pendências, ocupa largura total e é posicionado acima do `ClientFocus` no layout pai.

### `ClientFocus`
Lista das top 5 tasks mais críticas ("Foco agora"). Cada item exibe ponto colorido por prioridade, título, dias de atraso acumulado e badge Crítica/Urgente. Oculto quando não há tasks abertas.

### `ClientMetrics`
Grid 2×2 de KPI tiles:
- **Demandas abertas** — variant `default`
- **Com atraso** — variant `urgent`
- **Concluídas** — variant `positive`
- **Dias de atraso acumulado** — variant `neutral`

### `ClientTasksByPriority`
Lista de tasks abertas agrupadas em seções Críticas / Importantes / Backlog. Cada item mostra ponto colorido, título, contagem de subtarefas atrasadas e badge de prioridade. Empty state com `GitBranch`.

### `ClientTimeline`
Subtarefas dos próximos 7 dias (incluindo atrasadas), agrupadas por `daysFromNow`: "Hoje", "Amanhã", "Em N dias", "Nd de atraso". Atrasadas ficam em vermelho. Empty state quando não há entregas no período.

### `ClientTeam`
Grid de cards por membro (1 col mobile, 2 cols sm, 3 cols lg). Cada card exibe avatar, nome, papel, pílula de status e a alocação `X/Y` (subtarefas alocadas / capacidade individual do membro).

**Status de carga** — calculado pelo ratio `subtaskCount / capacity`:
| Status | Condição | Visual |
|---|---|---|
| Disponível | ratio < 0.6 | Verde tonal |
| Em carga | ratio 0.6–0.99 | Âmbar tonal |
| Sobrecarregado | ratio ≥ 1.0 | Vermelho tonal |

**Track de capacidade** — fila de segmentos (`capacity` divisões), preenchidos até o total alocado. Quando `subtaskCount > capacity`, os segmentos extras aparecem em vermelho à direita do track. Atrasos exibidos como contador textual `X atrasada(s)`.

**Banco:** campo `members.capacity integer not null default 6` (migration `20260520000000_members_capacity.sql`). O hook busca `capacity` no join `members` e expõe em `ClientMember`. Empty state com `Users`.

## Props de `ClientOverviewView`

```ts
interface ClientOverviewViewProps {
  clientId: string | null
}
```

## Integração

- Montada em `AppRouter` quando `view === "client-overview"`, recebendo `effectiveClientId` do `RouterCtx`
- Item **"Visão Geral"** no topo da nav de cliente em `AppSidebar`, visível apenas quando há cliente selecionado (`requiresClient: true`)
- `ViewType` em `useUIStore` inclui `'client-overview'`
