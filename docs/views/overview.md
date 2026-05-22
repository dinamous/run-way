# OverviewView — Dashboard Pessoal

Tela inicial padrão após login (`view="home"`). Exibe dados pessoais do usuário logado: KPIs, subtasks priorizadas, clientes ativos e notificações não lidas.

## Estrutura de Arquivos

```
src/views/overview/
├── index.ts
├── OverviewView.tsx
├── hooks/
│   └── useOverviewData.ts
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

## `useOverviewData`

**Arquivo:** `src/views/overview/hooks/useOverviewData.ts`

Busca em paralelo via `Promise.all` (3 chamadas simultâneas):

1. **Subtasks** — admin: `fetchAllSubtasks(clientIds)` (todas, deduplicadas por subtask id, filtradas pelos clientIds do usuário); user: `fetchSubtasks(memberId)` (só as assignadas ao membro). Ambas buscam `active`, `blocked` da task e `clients`.
2. **Notificações** — `fetchNotifications(userId, clientIds)` de `src/lib/notifications.ts`
3. **Clientes com contagem de tasks ativas** — 2 queries paralelas: `clients` (filtrado por ids ou todos se admin) + `tasks` com `concluded_at IS NULL`; agregação feita em memória para evitar N+1. Admin não usa ids intermediários: busca todos os clientes diretamente.

**Derivados memoizados (`useMemo`):**

KPIs, `enrichedClients` e `blockedTasks` são calculados via `useMemo` dependente de `subtasks` e `clientSummaries` — não recalculam a cada render.

**KPIs calculados no client:**
- `open` — tarefas únicas com `concluded_at IS NULL`
- `late` — subtasks com `end_date < hoje` e tarefa não concluída
- `today` — subtasks com `end_date = hoje` e tarefa não concluída
- `concluded` — tarefas únicas com `concluded_at IS NOT NULL`

**Campos extras calculados no client:**
- `accumulatedDelayDays` — soma dos dias de atraso de todas as subtasks atrasadas ativas
- `ClientSummary.lateSubtaskCount` — subtasks atrasadas pertencentes ao cliente (cruzado com `subtasks` localmente)
- `ClientSummary.risk` — `'critical'` (≥2 atrasadas) | `'attention'` (1 atrasada) | `'healthy'` (nenhuma)
- `blockedTasks: BlockedTask[]` — tasks únicas (por `taskId`) com `blocked = true` e não concluídas; usadas pelo `DayPlannerCard`
- `personalWorkload` — membro logado com `subtaskCount`, `lateCount`, `capacity` e até 3 insights textuais sobre carga individual

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
Bloco lateral (5 cols) exibido ao lado do `PriorityList` na seção "Atenção agora". Gera um plano do dia textual com base nos dados de `useOverviewData`, usando `generateDayPlan` de `src/utils/planner.ts`.

**Métricas no topo:** Atrasadas / Hoje / Esta semana (contadores numéricos com cores: vermelho / âmbar / azul).

**Mensagens:** agrupadas por tier de urgência (`late → today → soon`) dentro de cada cliente+task. Ordenação interna por fase (fases finais = mais urgentes: `publicacao > qa > homologacao > ...`). Máximo 7 mensagens de urgência. Tom contextual e humano. Cada mensagem é clicável e navega para a `PlanningView` (calendar) via `onNavigateToPlanning`.

**Setor "Bloqueadas":** exibido separadamente no final, com label próprio. Máximo 3 tasks bloqueadas.

**Estado vazio:** quando não há itens críticos, exibe mensagem motivacional (não oculta o bloco).

**Escopo por perfil:** admin recebe todas as subtasks da equipe; user recebe apenas as suas — controlado em `useOverviewData`.

### `WelcomeCard`
Saudação dinâmica por horário + frase contextual baseada nos KPIs + quatro **KPI tiles** em grid 2×2 + barra de carga acumulada na base. Skeleton durante `loading`.

**Animações (desativadas com `prefers-reduced-motion`):**
- Greeting/header entra com `blur-fade-in` (blur 8px → 0, 350ms).
- Cada `KpiTile` entra com `kpi-tile-in` (opacity + translateY + blur) em stagger de 80ms (0 / 80 / 160 / 240ms).
- O número de cada tile conta de 0 até o valor real via hook `useCountUp` (600ms expo ease-out, synced ao delay do tile).
- Tiles com variante `urgent` ou `warn` e `value > 0` recebem um sweep de shimmer único na entrada (`kpi-tile--active::after`).
- Hover em qualquer tile: `scale(1.025)` + sombra elevada (GPU-composited, sem layout shift).
- A strip de carga acumulada exibe uma barra de progresso proporcional (máx 30d) que anima de `width: 0%` para o valor real em 700ms ease-out. Cor vermelha quando `days > 0`.

### `PriorityList`
Subtasks ativas agrupadas por **impacto** (não por urgência de tempo): **Crítico** (atrasadas, label vermelho), **Importante** (vencimento em até 3 dias, label âmbar), **Backlog** (demais, label muted). Cada grupo tem header com dot colorido + contagem. Paginação: 15 itens visíveis, botão "Ver mais" carrega +15. Itens entram com `overview-item-enter` (stagger de 30ms). Empty state com `CheckCircle2`.

### `ActiveClients`
Lista vertical de clientes ordenada por risco: crítico (≥2 subtasks atrasadas) → atenção (1 atrasada) → saudável. Cada item mostra avatar + nome + contagem de tarefas + dot de risco (`🔴/🟡/🟢` em CSS: `bg-red-500/amber-400/emerald-400`). Header exibe contagem de críticos e atenção quando não-zero. Itens entram com `overview-item-enter` (stagger de 40ms). Clique chama `onSelectClient(clientId)`.

### `PersonalWorkload`
Bloco "Sua carga de trabalho atual" dentro da `OverviewView`, renderizado com `CapacityTeam` de `src/components/workload/CapacityTeam.tsx`. Mostra apenas o membro logado. Quando `members.length === 1`, o `CapacityTeam` usa um layout horizontal compacto (avatar + nome/role + barra de capacidade + pill de status + contador `X/Y` em uma única linha), evitando espaço vazio desnecessário. Para múltiplos membros, mantém o grid card-based (`sm:grid-cols-2 lg:grid-cols-3`). Abaixo do card entram insights curtos, por exemplo:

- se a pessoa está acima da capacidade, em atenção ou com margem
- quais demandas ocupam a maior parte da capacidade
- quantas subtarefas da carga individual estão atrasadas

O cálculo filtra apenas subtarefas `active` e de tasks não concluídas. Para admin, `useOverviewData` faz uma busca pessoal separada com `fetchSubtasks(memberId)` para não misturar a carga individual com a visão agregada da equipe.

**Campos adicionais (workload engine):** o `WorkloadMember` passado ao `CapacityTeam` inclui agora `stuckTasksCount`, `pressureScore`, `status` e `estimatedCompletionDate`, calculados pelo `workloadEngine.ts` via `buildPersonalWorkload` em `overviewWorkload.ts`. O componente exibe:
- Badge "N travada(s)" (cor âmbar) quando `stuckTasksCount > 0`
- Linha "Previsão de conclusão: DD/MM/YYYY" quando `estimatedCompletionDate` está presente
- `status` do engine (`available`/`busy`/`overloaded`) sobrepõe o cálculo local por ratio

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
