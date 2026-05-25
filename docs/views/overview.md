# OverviewView — Dashboard Pessoal

Tela inicial padrão após login (`view="home"`). Exibe dados pessoais do usuário logado: KPIs, subtasks priorizadas, clientes ativos e notificações não lidas.

## Estrutura de Arquivos

```
src/views/overview/
├── index.ts
├── OverviewView.tsx
├── hooks/
│   ├── useOverviewData.ts   ← módulo de tipos compartilhados (SubtaskRow, OverviewKpis, ClientSummary, ClientRisk)
│   ├── useKpisData.ts       ← subtasks + KPIs + blockedTasks + accumulatedDelayDays
│   ├── useClientsData.ts    ← clientes com risco enriquecido
│   ├── useWorkloadData.ts   ← workload pessoal (membro + tarefas ativas/concluídas)
│   └── overviewWorkload.ts
└── components/
    ├── WelcomeCard.tsx
    ├── DayPlannerCard.tsx
    ├── PriorityList.tsx
    ├── ActiveClients.tsx
    ├── PersonalWorkload (via shared CapacityTeam)
    └── InboxCard.tsx
```

## Layout

O layout é organizado em duas seções semânticas.

```
"Seu dia"
┌──────────────────────────────┬─────────────┐
│  WelcomeCard (saudação + KPI │ ActiveCli   │
│  + carga acumulada)          │ ents        │
└──────────────────────────────┴─────────────┘

"Atenção agora"
┌───────────────────────────┬────────────────┐
│  PriorityList (7 cols)    │ DayPlannerCard │
│                           │ (5 cols)       │
└───────────────────────────┴────────────────┘

Mobile: stacking vertical (1 col).
```

"Sua carga" entra entre "Seu dia" e "Atenção agora", em largura total, usando o componente compartilhado `CapacityTeam` com o título "Sua carga de trabalho atual". A visão é sempre individual: mesmo para admin, a carga é calculada a partir das subtasks atribuídas ao `memberId` logado.

"Seu dia" usa `grid-cols-[1fr_300px]`; "Atenção agora" usa `grid-cols-12` com `col-span-7` / `col-span-5`. O `overview-root` envolve tudo com um fundo levemente colorido (oklch com chroma baixo ~0.004 em light, ~0.008 em dark). O overlay `overview-ambient` usa dois gradientes radiais sutis (chroma máx 0.018) sem filtro de ruído.

## Hooks de dados

A busca de dados é modularizada: cada grupo de cards tem o seu próprio hook com `loading`, `error` e `retry` independentes. Falhas num card não bloqueiam os demais.

### `useKpisData` — `src/views/overview/hooks/useKpisData.ts`

Busca subtasks e deriva todos os dados necessários para `WelcomeCard`, `PriorityList` e `DayPlannerCard`.

**Fetch:**
- admin: `fetchAllSubtasks(clientIds)` — parte de `task_subtasks` com join simples `tasks!inner`, filtra por `tasks.client_id IN (clientIds)`; retorna um row por subtask (sem duplicatas). A query anterior partia de `subtask_assignees` com filtro em relação duplamente aninhada (`task_subtasks.tasks.client_id`), que o PostgREST ignora silenciosamente — causava full scan e timeout.
- user: `fetchSubtasks(memberId)` — parte de `subtask_assignees`, filtra por `member_id`; join `task_subtasks!inner → tasks!inner`

**Derivados memoizados (`useMemo`):**
- `kpis.open` — tarefas únicas com `concluded_at IS NULL`
- `kpis.late` — subtasks com `end_date < hoje` e tarefa não concluída
- `kpis.today` — subtasks com `end_date = hoje` e tarefa não concluída
- `kpis.concluded` — tarefas únicas com `concluded_at IS NOT NULL`
- `accumulatedDelayDays` — soma dos dias de atraso de todas as subtasks atrasadas ativas
- `blockedTasks: BlockedTask[]` — tasks únicas (por `taskId`) com `blocked = true` e não concluídas

**Retorna:** `{ subtasks, kpis, blockedTasks, accumulatedDelayDays, loading, error, retry }`

### `useClientsData` — `src/views/overview/hooks/useClientsData.ts`

Busca clientes e enriquece com risco baseado nos `lateByClient` já calculados pelo `useKpisData` (passados como prop `subtasksLateByClient`).

**Fetch (2 queries paralelas):**
- `clients` — filtrado por `.in('id', clientIds)` para não-admin; todos se admin
- `tasks` com `concluded_at IS NULL` — filtrado por `.in('client_id', clientIds)` para não-admin; agrupados em memória para evitar N+1

**Enriquecimento memoizado:**
- `ClientSummary.lateSubtaskCount` — cruzado com o mapa `subtasksLateByClient`
- `ClientSummary.risk` — `'critical'` (≥2 atrasadas) | `'attention'` (1) | `'healthy'` (0)

**Retorna:** `{ clients, loading, error, retry }`

### `useWorkloadData` — `src/views/overview/hooks/useWorkloadData.ts`

Busca dados de carga do membro logado em paralelo via `Promise.all`.

**Fetch (3 queries paralelas):**
- `fetchMemberProfile(memberId)` — membro com `capacity`
- `fetchActiveTasksWithHours(null, isAdmin, isAdmin ? null : memberId)` — para não-admin, usa `memberId` para filtrar via `subtask_assignees` (2 queries: taskIds + tasks)
- `fetchConcludedTasksSince(since14d, null, isAdmin, isAdmin ? null : memberId)` — idem

Compõe `personalWorkload` via `buildPersonalWorkload` de `overviewWorkload.ts`.

**Retorna:** `{ personalWorkload, loading, error, retry }`

### `useOverviewData` — módulo de tipos

`src/views/overview/hooks/useOverviewData.ts` foi reduzido a um módulo de tipos compartilhados exportados pelos hooks acima e pelos componentes da view:

**`SubtaskRow` — campos:**
```ts
interface SubtaskRow {
  id, title, status, start, end
  active: boolean          // filtra subtasks inativas no planner
  taskId, taskTitle
  taskBlocked: boolean     // task.blocked (coluna boolean direta no banco)
  clientId, clientName
  taskConcludedAt: string | null
}
```

## Componentes

### `DayPlannerCard`
Bloco lateral (5 cols) exibido ao lado do `PriorityList` na seção "Atenção agora". Gera um plano do dia textual com base nos dados de `useKpisData`, usando `generateDayPlan` de `src/utils/planner.ts`. Envolto em `CardShell` — aceita `error` e `onRetry`.

**Métricas no topo:** Atrasadas / Hoje / Esta semana (contadores numéricos com cores: vermelho / âmbar / azul).

**Mensagens:** agrupadas por tier de urgência (`late → today → soon`) dentro de cada cliente+task. Ordenação interna por fase (fases finais = mais urgentes: `publicacao > qa > homologacao > ...`). Máximo 7 mensagens de urgência. Tom contextual e humano. Cada mensagem é clicável e navega para a `PlanningView` (calendar) via `onNavigateToPlanning`.

**Setor "Bloqueadas":** exibido separadamente no final, com label próprio. Máximo 3 tasks bloqueadas.

**Estado vazio:** quando não há itens críticos, exibe mensagem motivacional (não oculta o bloco).

**Escopo por perfil:** admin recebe todas as subtasks da equipe; user recebe apenas as suas — controlado em `useOverviewData`.

### `WelcomeCard`
Saudação dinâmica por horário + frase contextual baseada nos KPIs + quatro **KPI tiles** em grid 2×2 + barra de carga acumulada na base. Envolto em `CardShell` — exibe skeleton durante `loading` e estado de erro com retry quando `error` está presente.

**Animações (desativadas com `prefers-reduced-motion`):**
- Greeting/header entra com `blur-fade-in` (blur 8px → 0, 350ms).
- Cada `KpiTile` entra com `kpi-tile-in` (opacity + translateY + blur) em stagger de 80ms (0 / 80 / 160 / 240ms).
- O número de cada tile conta de 0 até o valor real via hook `useCountUp` (600ms expo ease-out, synced ao delay do tile).
- Tiles com variante `urgent` ou `warn` e `value > 0` recebem um sweep de shimmer único na entrada (`kpi-tile--active::after`).
- Hover em qualquer tile: `scale(1.025)` + sombra elevada (GPU-composited, sem layout shift).
- A strip de carga acumulada exibe uma barra de progresso proporcional (máx 30d) que anima de `width: 0%` para o valor real em 700ms ease-out. Cor vermelha quando `days > 0`.

### `PriorityList`
Subtasks ativas agrupadas por **impacto** (não por urgência de tempo): **Crítico** (atrasadas, label vermelho), **Importante** (vencimento em até 3 dias, label âmbar), **Backlog** (demais, label muted). Cada grupo tem header com dot colorido + contagem. Paginação: 15 itens visíveis, botão "Ver mais" carrega +15. Itens entram com `overview-item-enter` (stagger de 30ms). Empty state com `CheckCircle2`. Envolto em `CardShell` — aceita `error` e `onRetry`.

### `ActiveClients`
Lista vertical de clientes ordenada por risco: crítico (≥2 subtasks atrasadas) → atenção (1 atrasada) → saudável. Cada item mostra avatar + nome + contagem de tarefas + dot de risco (`🔴/🟡/🟢` em CSS: `bg-red-500/amber-400/emerald-400`). Header exibe contagem de críticos e atenção quando não-zero. Itens entram com `overview-item-enter` (stagger de 40ms). Clique chama `onSelectClient(clientId)`. Envolto em `CardShell` — aceita `error` e `onRetry`.

### `PersonalWorkload`
Bloco "Sua carga de trabalho atual" dentro da `OverviewView`, renderizado com `CapacityTeam` de `src/components/workload/CapacityTeam.tsx`. Mostra apenas o membro logado. Quando `members.length === 1`, o `CapacityTeam` usa um layout horizontal compacto (avatar + nome/role + barra de capacidade + pill de status + contador `X/Y` em uma única linha), evitando espaço vazio desnecessário. Para múltiplos membros, mantém o grid card-based (`sm:grid-cols-2`). Abaixo do card entram insights curtos, por exemplo:

- se a pessoa está acima da capacidade, em atenção ou com margem
- quais demandas ocupam a maior parte da capacidade
- quantas subtarefas da carga individual estão atrasadas

O cálculo filtra apenas subtarefas `active` e de tasks não concluídas. O `useWorkloadData` faz sempre busca com `memberId` — a carga individual nunca é misturada com a visão agregada da equipe. O `CapacityTeam` é envolto em `CardShell` inline na `OverviewView` para exibir skeleton e estado de erro com retry.

**Campos adicionais (workload engine):** o `WorkloadMember` passado ao `CapacityTeam` inclui agora `totalActiveHours`, `weekHours`, `monthHours`, `stuckTasksCount`, `pressureScore`, `status`, `estimatedCompletionDate`, `segments: WorkloadSegment[]` e `weekSegments: WorkloadSegment[]`, calculados pelo `workloadEngine.ts` via `buildPersonalWorkload` em `overviewWorkload.ts`. O componente exibe:
- **Toggle Semana / Mês** — pill no canto direito do card individual; alterna o período exibido na barra e no número grande. Estado padrão: Semana.
- **Barra segmentada por subtask** — quando `segments`/`weekSegments` está presente, `CapacityTrack` renderiza um segmento por subtask com largura proporcional às suas horas (`businessDaysBetween × 8h`). Na visão **Semana** usa `weekSegments` (subtasks com sobreposição à semana atual, horas clampadas ao intervalo); na visão **Mês** usa `segments` (todas as subtasks ativas). Cada segmento tem cor distinta (paleta `SEGMENT_COLORS`) e exibe um tooltip no hover com: cliente, título da task, título da subtask e horas alocadas. Se sem segmentos, cai para barra contínua proporcional a `totalActiveHours / (capacity × 8h)`. Se sem horas, usa slots por contagem.
- Badge "N travada(s)" (cor âmbar) quando `stuckTasksCount > 0`
- Linha "Previsão de conclusão: DD/MM/YYYY" quando `estimatedCompletionDate` está presente
- `status` do engine (`available`/`busy`/`overloaded`) sobrepõe o cálculo local por ratio

**`WorkloadSegment` (`src/components/workload/CapacityTeam.tsx`):**
```ts
interface WorkloadSegment {
  taskId: string
  taskTitle: string
  clientName?: string
  subtaskTitle: string
  hours: number
  isOtherClient?: boolean   // true = tarefa de outro cliente; renderiza cinza na barra
}
```
Montado em `buildPersonalWorkload` iterando `memberActiveTasks` → subtasks `active` atribuídas ao membro. Na `ClientOverviewView`, `applyOtherClientWorkload` injeta segmentos adicionais com `isOtherClient: true` para representar carga cross-cliente.

**`clientName` em `Task` (`src/lib/steps.ts`):** campo opcional adicionado ao tipo `Task`. Populado apenas por `workloadRowToTask` (via `WORKLOAD_TASK_SELECT` com join `clients(id, name)`). O `TASK_SELECT` e `dbRowToTask` usados pelo restante da app não incluem esse join.

**Cálculo de horas por período (`overviewWorkload.ts`):** `weekHours` e `monthHours` são calculados em `buildPersonalWorkload` clampando `start`/`end` de cada subtask ativa ao intervalo do período (`startOfWeek`/`endOfWeek`, `startOfMonth`/`endOfMonth`) antes de multiplicar por dias úteis × 8h. Semana começa na segunda-feira.

### `InboxCard`
Recebe `notifications` via prop (reutiliza o `useNotifications` subscrito no App). Filtra `read = false`, exibe as 6 mais recentes ordenadas por `created_at DESC`. Timestamp relativo calculado em `formatTime` (sem interval/timer); lista envolvida em `useMemo` para evitar recálculo desnecessário. Itens entram com `overview-item-enter` (stagger de 35ms). Clique em notificação → `onMarkAsRead(id)`.

## Classes CSS da Overview (`src/index.css`)

| Classe | Descrição |
|---|---|
| `overview-root` | Background da view (oklch tintado azul neutro) |
| `overview-ambient` | Overlay de dois gradientes radiais sutis. Não usa mais SVG noise. |
| `overview-card` | Substituiu `overview-glass`. Card sólido sem blur: `bg surface`, `1px border`, sombra estrutural leve. |
| `overview-section-label` | Label de seção uppercase (ex: "Seu dia", "Atenção agora") |
| `overview-group-label` | Label interno dos grupos da PriorityList (Atrasadas / Hoje / Próximas) |
| `overview-item-enter` | Animação de entrada de item: `translateY(6px) → 0` em 220ms, expo-out. `prefers-reduced-motion` desativa. |
| `kpi-tile` | Entrada animada dos KPI tiles: opacity + translateY(8px) + blur(4px) → 0, 320ms expo-out, delay via `--tile-delay`. |
| `kpi-tile--active` | Shimmer sweep único na entrada (pseudo-element `::after`), apenas em tiles urgent/warn com `value > 0`. |
| `welcome-card-header` | Aplica `blur-fade-in` ao header do WelcomeCard (saudação + frase contextual). |

> `overview-glass`, `late-item`, `@property --late-ring-angle` e `@keyframes late-ring-spin` foram removidos.

## Props de `OverviewView`

```ts
interface OverviewViewProps {
  userName: string
  userId: string
  memberId: string
  isAdmin: boolean
  clients: ClientOption[]
  notifications: Notification[]
  notificationsLoading: boolean
  onMarkNotificationAsRead: (id: string) => void
  onSelectClient: (clientId: string) => void
  onNavigateToPlanning?: () => void  // navega para calendar view; passado pelo AppRouter
}
```

## Integração

- Montada em `AppRouter` quando `view === "home"` (ou `!view`)
- Props chegam via `LayoutContext.RouterCtx` + `LayoutContext.HeaderCtx`
- `RouterCtx` foi estendido com `userId`, `memberId`, `isAdmin`, `availableClients`, `notificationsLoading`, `onSelectClient`, `onMarkNotificationAsRead` para suportar a OverviewView sem prop drilling adicional
- `AppLayout` recebe `userId`, `memberId`, `notificationsLoading` de `App.tsx` (vindos de `useAppOrchestrator`)
