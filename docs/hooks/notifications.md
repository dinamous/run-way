# useNotifications

Hook que gerencia notificações do usuário autenticado, combinando fetch inicial, realtime via Supabase e polling periódico.

## Assinatura

```ts
useNotifications(userId?: string | null, clientIds?: string[])
```

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `userId` | `string \| null` | ID do membro autenticado |
| `clientIds` | `string[]` | Todos os IDs de cliente que o usuário acessa (não apenas o cliente atual) |

> **Importante:** `clientIds` deve conter **todos** os clientes do usuário, não apenas o selecionado no momento. Isso garante que notificações diretas (`user_id = userId`) e broadcasts de qualquer cliente sejam recebidos independentemente do cliente ativo.

## Retorno

```ts
{
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  createNotification: (title, message, type?, metadata?) => Promise<void>
}
```

## Comportamento

### Fetch inicial
Chama `fetchNotifications(userId, clientIds)` na montagem. Evita refetch desnecessário com `loadedRef`.

### Realtime
Escuta `INSERT` na tabela `notifications` via Supabase channel. Aceita a notificação se:
- `user_id === userId` — notificação direta ao usuário (sempre, independente do cliente ativo)
- `user_id === null AND client_id in clientIds` — broadcast para qualquer cliente do usuário

Exibe `toast.info` automaticamente ao receber via realtime.

### Polling
`NotificationBell` usa `useNotificationPolling` (intervalo 15s) para disparar `reload` quando a aba está ativa. O hook em si não faz polling.

## Uso em App.tsx

```ts
const allClientIds = clients.map((c) => c.id)

const { notifications, unreadCount, ... } = useNotifications(member?.id, allClientIds)
```

---

# fetchNotifications

```ts
fetchNotifications(userId: string, clientIds?: string[]): Promise<Notification[]>
```

Busca as últimas 50 notificações relevantes para o usuário:
- `user_id = userId` — notificações pessoais
- `user_id IS NULL AND client_id IN (clientIds)` — broadcasts dos clientes do usuário

Ordena por `created_at DESC`.

---

# markAllAsRead

```ts
markAllAsRead(userId: string, clientIds?: string[]): Promise<void>
```

Marca como lidas todas as notificações do escopo do usuário (pessoais + broadcasts dos seus clientes).

---

# NotificationBell

Componente de sino com dropdown. Recebe notificações já carregadas via props — não faz fetch próprio.

## Props

| Prop | Tipo | Descrição |
|---|---|---|
| `notifications` | `Notification[]` | Lista completa de notificações |
| `unreadCount` | `number` | Contador de não lidas |
| `onMarkAsRead` | `(id) => void` | Marca uma notificação como lida |
| `onMarkAllAsRead` | `() => void` | Marca todas como lidas |
| `onNotificationClick` | `(n) => void` | Ação ao clicar — navega dentro do cliente atual, não troca de cliente |
| `reload` | `() => void` | Callback de reload (usado pelo polling) |
| `selectedClientId` | `string \| null` | Cliente ativo — usado apenas para filtrar a aba "Cliente atual" |

## Tabs

- **Todas** — todas as notificações do usuário
- **Cliente atual** — filtra por `client_id === selectedClientId`

---

# createNotificationForAll

```ts
createNotificationForAll(clientIds: string[], title: string, message: string, type?: string): Promise<void>
```

Insere um broadcast (`user_id = null`) para cada `clientId` em uma única operação `insert` em lote. Usado pelo `NotificationsPanel` na opção de destino **Todos**.

---

## Formatação da mensagem

O campo `message` suporta **Markdown** — negrito, itálico, quebras de linha etc. Renderizado via `react-markdown` com classes `prose-xs` do Tailwind.

## Audiência

Cada item exibe ícone e label indicando o destinatário:
- `User` + "Para você" — `user_id` preenchido (notificação pessoal)
- `Users` + "Para todos do cliente" — `user_id === null` (broadcast de cliente)

## Comportamento de clique

`onNotificationClick` deve navegar dentro do **cliente atual** sem trocar de cliente. A rota é resolvida por `resolveNotificationRoute` em `src/lib/notifications.ts`.

## Tipos e rotas de navegação

| `type` | Origem | Rota | Destinatário |
|---|---|---|---|
| `step_assigned` / `step_unassigned` | manual | `/dashboard?step=<id>` ou `/dashboard?task=<title>` | usuário específico |
| `role_changed` | manual | `/profile` | usuário específico |
| `task_assigned` | manual | `/dashboard` | usuário específico |
| `client_access_granted` / `client_access_revoked` | manual | `/clients` | usuário específico |
| `new_member` | automático ao criar membro | `/members` | broadcast do cliente |
| `admin_broadcast` | manual (NotificationsPanel) | `/dashboard` | broadcast (todos/cliente) |
| `step_overdue` | pg_cron | — (sem rota) | assignee do step |
| `task_stalled` | pg_cron | — (sem rota) | assignee da task |
| `member_overloaded` | pg_cron | — (sem rota) | admins do cliente |

> **Nota:** tipos sem rota retornam `null` em `resolveNotificationRoute` e o clique na notificação não navega.

---

# Triggers automáticos (pg_cron)

Migration: `supabase/migrations/20260420000002_notification_triggers.sql`

Jobs agendados às **9h, 12h e 15h UTC**. Só executam se houve mudança de `status` em `audit_logs` nas últimas 3 horas (`has_recent_audit_activity`).

## Tipos gerados automaticamente

| `type` | Destinatário | Condição |
|---|---|---|
| `step_overdue` | assignee do step | `task_steps.end_date < hoje` e step não concluído |
| `task_stalled` | assignee da task | sem entrada em `audit_logs` há mais de `stalled_days_threshold` dias |
| `member_overloaded` | admins do cliente | membro com tasks `em andamento` ≥ `overload_threshold` |

## Notificações disparadas pelo frontend

| `type` | Gatilho | Destinatário | Mensagem |
|---|---|---|---|
| `new_member` | `createUser` em `useAdminData` após `adminCreateMember` | broadcast para todos os `clientIds` do novo membro | "👋 Novo integrante na equipe! **Nome** acabou de entrar como **🎨 Designer** / **💻 Developer**. Clique para conhecer quem faz parte do time! 🚀" |

> O disparo usa `createNotificationForClient` (broadcast, `user_id = null`) para cada cliente ao qual o novo membro foi vinculado.

## Deduplicação

Cada função verifica `NOT EXISTS` antes de inserir — nunca gera a mesma notificação duas vezes no mesmo dia para o mesmo par `(user_id, entity_id)`.

## Preferências respeitadas

As funções consultam `user_preferences` antes de inserir. Se o switch correspondente for `false`, o usuário não recebe aquele tipo.
