# ClientOverviewView — Visão Geral do Cliente

View individual por cliente, exibida quando `view="client-overview"`. Funciona como um **cockpit do cliente**: responde de imediato o que precisa de atenção, qual é o risco, o que está atrasado e o que vem a seguir. É o ponto de entrada específico de um cliente, em contraste com a `OverviewView` (home pessoal do usuário).

## Estrutura de Arquivos

```
src/views/client-overview/
├── index.ts
├── ClientOverviewView.tsx
├── hooks/
│   ├── useClientOverviewData.ts       # hook: cache + estado + orquestração
│   ├── clientOverviewService.ts       # queries Supabase (fetchClientOverviewRaw)
│   └── clientOverviewTransformers.ts  # funções puras de transformação (testáveis)
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

**Arquivos:**
- `src/views/client-overview/hooks/useClientOverviewData.ts` — hook React: gerencia estado, cache e orquestra o fetch
- `src/views/client-overview/hooks/clientOverviewTransformers.ts` — funções puras de transformação extraídas do hook; sem dependências React, totalmente testáveis com Vitest

O hook é responsável apenas por estado + cache + fetch. Toda a lógica de parsing e derivação fica nos transformers:

| Função | Responsabilidade |
|---|---|
| `parseSubtask` | Converte `RawSubtask` → `ClientSubtask`; trata `end_date` nulo e `capacity ≤ 0` |
| `calcAccumulatedLateDays` | Soma dias de atraso por subtarefa |
| `calcTaskPriority` | Deriva `critical \| important \| backlog` |
| `buildTaskList` | Itera tasks do cliente, monta `ClientTask[]`, acumula `memberMap` com `weekHours`/`monthHours`/`weekSegments` |
| `seedMemberMap` | Insere membros de `user_clients` ainda ausentes no `memberMap` (com zeros); idempotente |
| `applyOtherClientWorkload` | Adiciona horas de outros clientes ao `memberMap` já existente, marcando segmentos com `isOtherClient: true` |
| `mergeClientMembers` | Chama `seedMemberMap` internamente e retorna array ordenado por `subtaskCount` decrescente |
| `buildTimeline` | Filtra subtarefas abertas com `end_date ≤ hoje+7d` |
| `buildFocusTasks` | Top 5 tasks abertas ordenadas por prioridade e atraso |
| `calcKpis` | Agrega `ClientOverviewKpis` a partir de `taskList` |
| `buildHealth` | Deriva `ClientHealth` (status + contagens) a partir das tasks abertas |

Recebe `clientId: string | null`. Busca em paralelo via `Promise.all`:

1. **Info do cliente** — `clients.id, name`
2. **Tasks do cliente** — `tasks` filtradas por `client_id` e `concluded_at IS NULL`, com join em `task_subtasks → subtask_assignees → members` e `clients (id, name)`
3. **Membros do cliente** — `user_clients` filtrado por `client_id`, com join em `members (id, name, role, avatar_url, capacity)`

Após os três fetches paralelos, faz um quarto fetch sequencial:

4. **Tasks de outros clientes** — todas as tasks ativas (`concluded_at IS NULL`, `client_id != clientId`) que tenham ao menos um assignee no conjunto de membros do cliente. Usado para calcular carga cruzada.

### Reset ao trocar de cliente

Quando `clientId` muda (ou passa a ser `null`), o hook faz reset imediato de todos os estados locais (dados zerados, `loading: true`) **antes** de iniciar o fetch. Isso evita que os dados do cliente anterior permaneçam visíveis durante a transição.

### Cache em memória

O hook mantém um `Map` no nível do módulo (compartilhado entre todas as instâncias):

- `cache: Map<clientId, { data, fetchedAt }>` — TTL de **1 minuto**; na remontagem dentro desse janela os dados são aplicados sem nenhum request ao Supabase.

Cada execução do `useEffect` chama `load()` diretamente e declara `let cancelled = false`. O cleanup do efeito seta `cancelled = true`, descartando resultados de fetches de efeitos anteriores (ex: cliente trocado antes do fetch terminar). Isso substitui o antigo `inflight` Map, que tinha uma race condition onde a promise podia resolver antes do `.then()` ser registrado, deixando `loading` preso em `true`.

O `loading: true` é sinalizado imediatamente ao entrar no efeito (antes do fetch), garantindo feedback visual correto tanto na visita inicial quanto na troca de cliente.

**Invalidação automática na troca de cliente:** `useClientTransition` chama `invalidateClientOverviewCache` para o cliente de saída e o de entrada imediatamente ao iniciar a transição (antes do delay de 650ms), evitando que dados stale sejam servidos ao montar a nova view.

Após qualquer mutação de dados do cliente (salvar task, concluir subtarefa, etc.), chame manualmente:

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
  focusTasks: ClientTask[]            // top 5 tasks mais críticas
  tasks: ClientTask[]                 // todas as tasks
  members: ClientMember[]
  clientHours: Map<string, number>    // horas de cada membro alocadas SOMENTE neste cliente (memberId → horas)
  timeline: TimelineEntry[]           // subtasks com end_date ≤ hoje+7d
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
  id, title, startDate, endDate, status, isLate
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

### Membros e carga cruzada

Lista **todos** os membros vinculados ao cliente via `user_clients`. A lógica funciona em quatro etapas:

1. **`buildTaskList`** — agrega `subtask_assignees` das tasks do cliente em `Map` por `member_id`, calculando `subtaskCount`, `lateCount`, `totalActiveHours`, `weekHours`, `monthHours`, `segments` e `weekSegments` (apenas horas deste cliente).
2. **`seedMemberMap`** — insere no `memberMap` todos os membros de `user_clients` que ainda não aparecem (subtaskCount 0, zeros). Isso garante que membros sem tarefas locais já estejam presentes **antes** do passo seguinte, para que recebam corretamente os segmentos de outros clientes.
3. **Snapshot de `clientHours`** — captura `totalActiveHours` de cada membro como "horas neste cliente" (`Map<memberId, number>`), exposto em `data.clientHours`.
4. **`applyOtherClientWorkload`** — itera tasks de outros clientes, adiciona horas ao `totalActiveHours`/`weekHours`/`monthHours` de cada membro e injeta segmentos extras com `isOtherClient: true` — que rendem em cinza no `CapacityTeam`.
5. **`mergeClientMembers`** — chama `seedMemberMap` internamente (idempotente) e ordena por `subtaskCount` decrescente.

```ts
interface ClientMember {
  id, name, role, avatarUrl
  capacity: number             // teto individual (members.capacity, default 6)
  subtaskCount: number         // subtarefas ativas neste cliente
  totalActiveHours?: number    // horas totais (este cliente + outros clientes)
  weekHours?: number           // horas na semana corrente (total, todos os clientes)
  monthHours?: number          // horas no mês corrente (total, todos os clientes)
  lateCount: number            // subtarefas atrasadas neste cliente
  segments?: WorkloadSegment[] // fatias para barra mensal/total; isOtherClient=true nas de outros clientes
  weekSegments?: WorkloadSegment[] // fatias clampadas para a semana corrente
}
```

`WorkloadSegment` é importado de `@/components/workload/CapacityTeam` e tem a forma `{ taskId, taskTitle, clientName?, subtaskTitle, hours, isOtherClient? }`.

O campo `clientHours` do `ClientOverviewData` mapeia `memberId → horas` do **cliente atual** (antes de somar outros clientes). O `CapacityTeam` usa esse mapa para exibir "Xh neste cliente" abaixo da barra e no tooltip dos segmentos.

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
Wrapper fino sobre `CapacityTeam` (componente global em `src/components/workload/CapacityTeam.tsx`). Renderizado dentro de uma `<section>` com label "Carga da equipe" no `ClientOverviewView`, seguindo o mesmo padrão de seções da `OverviewView`.

Passa `title="Carga de trabalho da equipe"`, `countLabel` dinâmico ("1 membro" / "N membros") e `emptyLabel="Nenhum membro alocado neste cliente"` para o `CapacityTeam`.

Grid de cards por membro (1 col mobile, 2 cols sm). Cada card exibe avatar, nome, papel, pílula de status, número de horas/alocações animado e track de capacidade.

**Toggle semana/mês** — quando algum membro tem `weekHours` ou `monthHours`, o `CapacityTeam` exibe um toggle global "Semana / Mês" no header. Ao trocar de período, todas as barras de capacidade reanimam em cascata. `weekHours`/`monthHours`/`weekSegments` são calculados tanto para as tarefas do cliente quanto para as de outros clientes — o toggle funciona plenamente na `ClientOverviewView`.

**Carga cruzada (segmentos de outros clientes)** — segmentos com `isOtherClient: true` renderizam em cinza (`oklch(0.72 0 0)`) na barra, independentemente do estado de carga. O tooltip desses segmentos exibe o nome do outro cliente com uma badge "outro cliente". Abaixo da barra segmentada, quando `clientHours` está presente, aparece o label "Xh neste cliente" mostrando quanto das horas totais é alocado especificamente neste cliente.

O `CapacityTeam` recebe a prop `clientHours: Map<string, number>` para habilitar essas informações.

**Status de carga** — calculado pelo ratio `subtaskCount / capacity`:
| Status | Condição | Visual |
|---|---|---|
| Disponível | ratio < 0.6 | Verde tonal |
| Em carga | ratio 0.6–0.99 | Âmbar tonal |
| Sobrecarregado | ratio ≥ 1.0 | Vermelho tonal |

**Track de capacidade** — três modos em cascata:
1. **Segmentado** — quando `segments` existe e `totalActiveHours` está preenchido: barra dividida por subtarefa com cores distintas e tooltip no hover.
2. **Contínuo** — quando `totalActiveHours` existe sem segmentos: barra única proporcional a `totalActiveHours / (capacity × 8h)`.
3. **Slots** — fallback quando não há dados de horas: fila de `capacity` divisões preenchidas por `subtaskCount`.

**Empty state de período** — quando o membro não tem dados para o período selecionado (weekHours/monthHours undefined), exibe uma barra cinza com o texto "sem dados semanais/mensais" em vez de quebrar o layout.

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
