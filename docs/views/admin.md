# AdminView

**Ficheiro:** `src/views/admin/AdminView.tsx`  
**Acesso:** exclusivo para `member.access_role === 'admin'` — verificado no componente via `useAuthContext`

## Estrutura

```
src/views/admin/
├── AdminView.tsx              # Shell: abas + roteamento interno
├── index.ts
├── hooks/
│   └── useAdminData.ts        # Hook fino: mutations + bridge para a store
└── components/
    ├── ClientsPanel.tsx       # Gestão de clientes
    ├── UsersPanel.tsx         # Gestão de membros e vínculos
    ├── AuditLogsPanel.tsx     # Log de auditoria com filtros
    └── NotificationsPanel/    # Envio e histórico de notificações manuais
        ├── index.ts
        ├── NotificationsPanel.tsx      # Orquestrador
        ├── NotificationForm.tsx        # Formulário de envio (destino, título, mensagem)
        ├── NotificationHistory.tsx     # Histórico agrupado por período
        ├── NotificationList.tsx        # Lista de itens individuais
        ├── useNotificationsPanel.ts    # Estado, handlers e fetch do histórico
        └── utils.ts                    # formatDate, groupNotifications, getIcon/Label

src/store/
└── useAdminStore.ts           # Estado e fetches admin (Zustand) — usa adminApi

src/lib/
└── adminApi.ts                # Camada client-side para Edge Functions admin (ver abaixo)

supabase/functions/
├── _shared/auth.ts            # Helper: requireAdmin (valida JWT + access_role), getServiceClient, cors/json
├── admin-clients/index.ts     # GET/POST/PUT/DELETE clients + audit log de delete
├── admin-members/index.ts     # GET/POST/PUT + actions: deactivate, reactivate, setAuthId
├── admin-notifications/index.ts # GET (histórico) / POST (criar notificação individual ou em batch)
└── admin-users/index.ts       # GET actions: listAuthUsers, listPending, userClientsMap, auditLogs
                               # POST actions: linkUser, unlinkUser, setRole
```

## Abas

| Aba | Componente | O que faz |
|---|---|---|
| Clientes | `ClientsPanel` | CRUD de clientes; vínculo usuário ↔ cliente |
| Usuários | `UsersPanel` | CRUD de membros; vínculo com conta Google |
| Audit Log | `AuditLogsPanel` | Histórico de ações com filtros |

## adminApi (`src/lib/adminApi.ts`)

Camada client-side que expõe funções tipadas para todas as operações admin, chamando as Supabase Edge Functions via `fetch` direto (não `supabase.functions.invoke`). O token JWT do usuário e a `apikey` (anon key) são enviados explicitamente nos headers.

**Query strings:** o `invoke` interno constrói a URL manualmente via `URLSearchParams` a partir de um objeto `query` opcional, garantindo que parâmetros como `action` e `id` cheguem corretamente à Edge Function.

**Grupos de funções:**
- `adminFetchClients / adminCreateClient / adminUpdateClient / adminDeleteClient`
- `adminFetchMembers / adminCreateMember / adminUpdateMember / adminDeactivateMember / adminReactivateMember / adminSetMemberAuthId`
- `adminListPendingUsers / adminListAuthUsers / adminFetchUserClientsMap / adminFetchAuditLogs`
- `adminLinkUserToClient / adminUnlinkUserFromClient / adminSetUserRole`
- `adminFetchAllNotifications / adminCreateNotification / adminCreateNotificationForAll`

> **Segurança:** a `SUPABASE_SERVICE_ROLE_KEY` nunca é enviada ao browser — fica exclusivamente nas variáveis de ambiente das Edge Functions (configuradas via `supabase secrets set`). O `.env` do frontend **não deve** conter essa chave.

## Edge Functions (`supabase/functions/`)

Cada função valida o JWT via `requireAdmin` (`_shared/auth.ts`) antes de qualquer acesso ao banco com o service client. Retornam 401/403 se o token for inválido ou o usuário não for admin.

**Validação do token:** usa `fetch` direto para `/auth/v1/user` com o token do usuário no header `Authorization` e a `SUPABASE_SERVICE_ROLE_KEY` como `apikey`. A validação é feita manualmente dentro de `requireAdmin` — a opção "Verify JWT" nas Edge Functions deve estar **desativada** no dashboard (Settings → Edge Functions → [função] → Verify JWT).

**Deploy:**

Use o script `supabase/deploy-functions.sh` para fazer o deploy de todas as funções de uma vez:

```bash
bash supabase/deploy-functions.sh
```

Ou individualmente:

```bash
npx supabase functions deploy admin-clients
npx supabase functions deploy admin-members
npx supabase functions deploy admin-notifications
npx supabase functions deploy admin-users
```

> **Nota:** `SUPABASE_SERVICE_ROLE_KEY` é injetada automaticamente pelo runtime das Edge Functions — não é necessário (nem possível) setar via `supabase secrets set`. A variável opcional `ALLOWED_DOMAIN` pode ser configurada se quiser restringir domínio de login.

## useAdminStore

Store Zustand (`src/store/useAdminStore.ts`) que centraliza o estado e as ações de fetch da AdminView. Persiste os dados entre montagens — navegar para outra view e voltar não re-faz os fetches. Todos os fetches delegam para `adminApi` (Edge Functions) em vez de chamar o Supabase diretamente com service role.

**Estado:**
```ts
clients: DbClientRow[]
users: Member[]
auditLogs: DbAuditLogRow[]
userClientsMap: Record<string, string[]>   // memberId → clientId[]
pendingUsers: PendingAuthUser[]            // contas Google sem member vinculado
loading: boolean
loadingInitial: boolean
error: string | null
initialized: boolean   // true após o primeiro refreshAll completo
```

**Ações de fetch:**
- `refreshAll()` — carrega clients, users, userClientsMap e pendingUsers em paralelo; no-op se já `loadingInitial`
- `fetchClients / fetchUsers / fetchUserClientsMap / fetchPendingUsers` — fetches individuais chamados pelas mutations
- `fetchAuditLogs(filters)` — filtros: clientId, entity, userId, entityName, from/to
- `invalidate()` — limpa todo o estado e reseta `initialized` (usado por logout/troca de contexto)

Os tipos `PendingAuthUser` e `AuditFilters` são definidos e exportados do store.

## useAdminData

Hook fino (`src/views/admin/hooks/useAdminData.ts`) que consome `useAdminStore` e expõe mutations. Responsabilidades:

- Lê estado da store e repassa para os componentes
- Dispara `refreshAll()` apenas se `!initialized` (evita re-fetch ao remontar)
- Contém todas as mutations (CRUD clients/users, vínculos, deactivate/reactivate) que dependem de `actorUserId` e chamam `reloadAppStores` após concluir
- Todas as mutations delegam para `adminApi` (sem acesso direto ao Supabase com service role)

**Mutations:**
- `createClient / updateClient / deleteClient`
- `linkUserToClient / unlinkUserFromClient`
- `createUser / updateUser / setUserRole / setUserAuthId`
- `deactivateUser(userId)` — seta `is_active: false` e `deactivated_at: now()` no member; preserva tasks e steps
- `reactivateUser(userId)` — seta `is_active: true` e limpa `deactivated_at: null` no member
- `listGoogleUsers(search?)` — busca na Supabase Auth admin API (retorna até 20 resultados)

> **Nota:** `setUserAuthId` e `createUser` (quando `authUserId` é fornecido) chamam `fetchPendingUsers()` após concluir para manter a lista de pendentes sincronizada sem reload de página.

## UsersPanel — comportamento do drawer de edição

O drawer de edição acumula todas as mudanças em estado local e só dispara requests ao clicar em **Guardar**:

- Alterações de nome, cargo e email → `onUpdate`
- Alteração de access role → `onSetRole` (só chamado se o valor mudou)
- Adição/remoção de clientes → `onLink` / `onUnlink` em sequência
- Vínculo de conta Google → `onSetAuthId`

**Ao fechar com dados não salvos** (botão Cancelar, ESC ou clicar fora), exibe `ConfirmModal` pedindo confirmação antes de descartar.

**Datas de criação e desativação** são exibidas logo abaixo do card de perfil do usuário: "Criado em dd mmm yyyy" (sempre que `created_at` existir) e "Desativado em dd mmm yyyy" em vermelho (quando `deactivated_at` estiver preenchido).

**Botão Desativar** no canto inferior esquerdo do `DrawerFooter` (variante `destructive`). Ao clicar, salva o `id` do utilizador em `pendingDeactivateId` e abre `ConfirmModal`. A confirmação chama `onDeactivate(pendingDeactivateId)` — o id é capturado antes do drawer fechar para evitar que o `vaul` (que interpreta o clique no modal como "fora do drawer") resete `editingUser` antes da operação. O mesmo padrão aplica-se ao botão **Reativar** via `pendingReactivateId`.

**Dropdown de conta Google** fica fora do container com `overflow-y-auto` para não ser clipado pelo scroll.

## UsersPanel — link drawer (tab Pendentes)

O link drawer é aberto ao clicar em **Vincular** em um card do tab Pendentes. Além de selecionar um membro existente para vincular à conta Google, oferece o botão **"Criar novo membro"** que:

1. Pré-preenche nome, email e avatar da conta Google pendente na drawer de criação
2. Já popula o campo Conta Google com os dados do usuário (vínculo automático no `authUserId`)
3. Ao criar com sucesso, fecha o link drawer e limpa o estado de pendente — `createUser` chama `fetchPendingUsers()` quando `authUserId` está presente, removendo o usuário da lista sem necessidade de reload

A descrição da drawer de criação muda para informar que o vínculo será feito automaticamente quando aberta a partir de um pendente (`createFromPendingUser` estado interno).

## UsersPanel — filtros do tab Membros

No tab **Membros**, os filtros disponíveis são: **Todos / Ativos / Sem acesso / Desativados**.

- **Ativos** filtra members com `is_active !== false`
- **Sem acesso** filtra members ativos sem `auth_user_id`
- **Desativados** filtra members com `is_active === false`

## NotificationsPanel

Aba de envio e histórico de notificações manuais. Estrutura modular em `components/NotificationsPanel/` — o componente raiz `NotificationsPanel.tsx` consome `useNotificationsPanel` e renderiza `NotificationForm` + `NotificationHistory`.

### Destinos

| Opção | Comportamento |
|---|---|
| **Usuário** | Notificação direta a um membro ativo (`user_id` preenchido, `manual`) |
| **Cliente** | Broadcast para todos os membros de um cliente (`user_id = null`, `client_id`) |
| **Todos** | Broadcast para todos os clientes cadastrados — chama `createNotificationForAll` |

### Editor de mensagem

O campo **Mensagem** tem tabs **Editar / Preview**:
- **Editar** — textarea mono; suporta Markdown (`**negrito**`, `_itálico_`, quebras de linha)
- **Preview** — renderiza via `react-markdown` antes do envio

### Histórico

Scroll independente, contido em `100vh`. Mensagens renderizadas como Markdown via `react-markdown`.

## Impersonation

Admin pode visualizar a aplicação como um cliente específico via `impersonatedClientId` (estado no `AuthContext`). Um banner amarelo aparece na AdminView quando ativo, com botão para sair da visão.
