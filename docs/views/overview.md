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
    ├── FocoDoDia.tsx
    ├── PriorityList.tsx
    ├── ActiveClients.tsx
    └── InboxCard.tsx
```

## Layout

O layout é organizado em três seções semânticas. A seção "Foco do dia" só aparece quando há itens críticos ou com vencimento hoje.

```
[Foco do dia — full width, condicional]
┌──────────────────────────────────────┐
│  FocoDoDia (até 5 itens priorizados) │
└──────────────────────────────────────┘

"Seu dia"
┌──────────────────────────────┬─────────────┐
│  WelcomeCard (saudação + KPI │ ActiveCli   │
│  + carga acumulada)          │ ents        │
└──────────────────────────────┴─────────────┘

"Atenção agora"
┌──────────────────────────────┬─────────────┐
│  PriorityList                │ InboxCard   │
└──────────────────────────────┴─────────────┘

Mobile: stacking vertical (1 col).
```

"Seu dia" usa `grid-cols-[1fr_300px]`; "Atenção agora" usa `grid-cols-[1fr_320px]`. O `overview-root` envolve tudo com um fundo levemente colorido (oklch com chroma baixo ~0.004 em light, ~0.008 em dark). O overlay `overview-ambient` usa dois gradientes radiais sutis (chroma máx 0.018) sem filtro de ruído.

## `useOverviewData`

**Arquivo:** `src/views/overview/hooks/useOverviewData.ts`

Busca em paralelo via `Promise.all`:

1. **Subtasks do assignee** — `subtask_assignees → task_subtasks (start_date, end_date) → tasks (concluded_at, client_id) → clients`
2. **Notificações** — `fetchNotifications(userId, clientIds)` de `src/lib/notifications.ts`
3. **Clientes com contagem de tasks ativas** — query por `client_id` + `concluded_at IS NULL`

**KPIs calculados no client:**
- `open` — tarefas únicas com `concluded_at IS NULL`
- `late` — subtasks com `end_date < hoje` e tarefa não concluída
- `today` — subtasks com `end_date = hoje` e tarefa não concluída
- `concluded` — tarefas únicas com `concluded_at IS NOT NULL`

**Campos extras calculados no client:**
- `accumulatedDelayDays` — soma dos dias de atraso de todas as subtasks atrasadas ativas
- `ClientSummary.lateSubtaskCount` — subtasks atrasadas pertencentes ao cliente (cruzado com `subtasks` localmente)
- `ClientSummary.risk` — `'critical'` (≥2 atrasadas) | `'attention'` (1 atrasada) | `'healthy'` (nenhuma)

## Componentes

### `FocoDoDia`
Bloco condicional no topo (exibido quando há itens com `end <= hoje`). Mostra até 5 subtasks mais urgentes: atrasadas em ordem decrescente de dias de atraso, depois as de hoje. Cada item exibe badge vermelho (`Xd atraso`) ou âmbar (`Hoje`). Não aparece se todas as subtasks são futuras ou o usuário não tem nenhuma.

### `WelcomeCard`
Saudação dinâmica por horário + frase contextual baseada nos KPIs + quatro **KPI tiles** em grid 2×2 + strip "Carga acumulada" na base. A strip mostra `accumulatedDelayDays` em vermelho se `> 0`, neutro caso contrário. Skeleton durante `loading`.

### `PriorityList`
Subtasks ativas agrupadas por **impacto** (não por urgência de tempo): **Crítico** (atrasadas, label vermelho), **Importante** (vencimento em até 3 dias, label âmbar), **Backlog** (demais, label muted). Cada grupo tem header com dot colorido + contagem. Paginação: 15 itens visíveis, botão "Ver mais" carrega +15. Itens entram com `overview-item-enter` (stagger de 30ms). Empty state com `CheckCircle2`.

### `ActiveClients`
Lista vertical de clientes ordenada por risco: crítico (≥2 subtasks atrasadas) → atenção (1 atrasada) → saudável. Cada item mostra avatar + nome + contagem de tarefas + dot de risco (`🔴/🟡/🟢` em CSS: `bg-red-500/amber-400/emerald-400`). Header exibe contagem de críticos e atenção quando não-zero. Itens entram com `overview-item-enter` (stagger de 40ms). Clique chama `onSelectClient(clientId)`.

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
}
```

## Integração

- Montada em `AppRouter` quando `view === "home"` (ou `!view`)
- Props chegam via `LayoutContext.RouterCtx` + `LayoutContext.HeaderCtx`
- `RouterCtx` foi estendido com `userId`, `memberId`, `isAdmin`, `availableClients`, `notificationsLoading`, `onSelectClient`, `onMarkNotificationAsRead` para suportar a OverviewView sem prop drilling adicional
- `AppLayout` recebe `userId`, `memberId`, `notificationsLoading` de `App.tsx` (vindos de `useAppOrchestrator`)
