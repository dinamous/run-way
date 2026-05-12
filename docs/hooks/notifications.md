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
  hasMore: boolean
  loadingOlder: boolean
  reload: () => Promise<void>
  loadOlder: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  createNotification: (title, message, type?, metadata?) => Promise<void>
}
```

## Comportamento

### Fetch inicial
Busca apenas os **últimos 7 dias** de notificações (`created_at >= hoje - 7d`). Evita refetch desnecessário com `loadedRef`.

### Paginação para notificações antigas
`loadOlder` busca a página anterior ao cursor (`nextBeforeRef`), trazendo até 20 itens por chamada. O cursor avança para o `created_at` da notificação mais antiga retornada. Quando o retorno vier com menos de 20 itens ou vazio, `hasMore` passa a `false`. Notificações antigas ficam em `olderNotificationsRef` e sobrevivem a reloads de polling.

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
fetchNotifications(
  userId: string,
  clientIds?: string[],
  options?: { after?: string; before?: string; limit?: number }
): Promise<Notification[]>
```

Busca notificações relevantes para o usuário:
- `user_id = userId` — notificações pessoais
- `user_id IS NULL AND client_id IN (clientIds)` — broadcasts dos clientes do usuário

Aceita filtros de data (`after` / `before` em ISO 8601) e `limit` (padrão 50). Ordena por `created_at DESC`.

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
| `onLoadOlder` | `() => void` | Carrega a próxima página de notificações antigas |
| `hasMore` | `boolean` | Se ainda há notificações mais antigas a buscar |
| `loadingOlder` | `boolean` | Estado de loading do `onLoadOlder` |
| `selectedClientId` | `string \| null` | Cliente ativo — usado apenas para filtrar a aba "Cliente atual" |

## Tabs

- **Todas** — notificações dos últimos 7 dias + antigas carregadas via "Ver anteriores"
- **Cliente atual** — filtra por `client_id === selectedClientId`

## Paginação

O botão **"Ver anteriores"** aparece no rodapé da aba "Todas" enquanto `hasMore = true`. Cada clique chama `onLoadOlder`, que busca a próxima página (até 20 itens) anterior ao cursor atual. O botão some quando não há mais páginas disponíveis.

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
| `client_access_granted` | `linkUserToClient` em `useAdminData` após `adminLinkUserToClient` | notificação pessoal (`user_id` preenchido) para o membro vinculado | "🏢 Novo cliente disponível! Você agora tem acesso ao cliente **NomeDoCliente**. Clique para ver seus clientes." |

> `new_member` usa `createNotificationForClient` (broadcast, `user_id = null`) — todos do cliente recebem, exceto o próprio novo membro.
> `client_access_granted` usa `createNotification` com `user_id` preenchido — apenas o membro vinculado recebe.

## Deduplicação

Cada função verifica `NOT EXISTS` antes de inserir — nunca gera a mesma notificação duas vezes no mesmo dia para o mesmo par `(user_id, entity_id)`.

## Preferências respeitadas

As funções consultam `user_preferences` antes de inserir. Se o switch correspondente for `false`, o usuário não recebe aquele tipo.
