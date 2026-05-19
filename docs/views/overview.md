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
    ├── PriorityList.tsx
    ├── ActiveClients.tsx
    └── InboxCard.tsx
```

## Layout

```
Desktop (grid 1fr 320px):
┌──────────────────────────────┬─────────┐
│  WelcomeCard                 │ Inbox   │
│  (saudação + 4 KPI cards)    │ Card    │
├────────────────────┬─────────┤ (row-   │
│  PriorityList      │ Active  │ span-2) │
│                    │ Clients │         │
└────────────────────┴─────────┴─────────┘

Mobile: stacking vertical (1 col).
```

InboxCard ocupa `row-span-2` na sidebar de 320px. A segunda linha usa um subgrid `1fr 220px` para PriorityList + ActiveClients.

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

## Componentes

### `WelcomeCard`
Saudação dinâmica por horário (Bom dia / Boa tarde / Boa noite) + frase contextual baseada nos KPIs + grid 2×2 de cards de KPI. Cada KPI card tem fundo colorido por contexto (azul/vermelho/âmbar/verde), ícone com container, número em destaque (`text-3xl`) e label em uppercase. Skeleton durante `loading`.

### `PriorityList`
Lista subtasks ativas do assignee ordenadas por `end_date ASC`. Paginação: 15 itens visíveis, botão "Ver mais" carrega +15. Prazo exibido como badge colorida com fundo: vermelho (`Xd atraso`), âmbar (`Hoje`), muted (`Xd`). Contador de ativas exibido no header. Empty state com `CheckCircle2`.

### `ActiveClients`
Lista vertical dos primeiros 6 clientes (avatar + nome + contagem de tarefas). Cor do avatar gerada por `clientName.charCodeAt(0) % 6` (6 cores Tailwind pré-definidas). Clique chama `onSelectClient(clientId)`.

### `InboxCard`
Recebe `notifications` via prop (reutiliza o `useNotifications` subscrito no App). Filtra `read = false`, exibe as 6 mais recentes ordenadas por `created_at DESC`. Timestamp relativo calculado em `formatTime` (sem interval/timer); lista envolvida em `useMemo` para evitar recálculo desnecessário. Clique em notificação → `onMarkAsRead(id)`.

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
