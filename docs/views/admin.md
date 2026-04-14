# AdminView

**Ficheiro:** `src/views/admin/AdminView.tsx`  
**Acesso:** exclusivo para `member.access_role === 'admin'`  
**Requer:** `VITE_SUPABASE_SERVICE_ROLE_KEY` configurada (usa `supabaseAdmin`)

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
    └── AuditLogsPanel.tsx     # Log de auditoria com filtros

src/store/
└── useAdminStore.ts           # Estado e fetches admin (Zustand)
```

## Abas

| Aba | Componente | O que faz |
|---|---|---|
| Clientes | `ClientsPanel` | CRUD de clientes; vínculo usuário ↔ cliente |
| Usuários | `UsersPanel` | CRUD de membros; vínculo com conta Google |
| Audit Log | `AuditLogsPanel` | Histórico de ações com filtros |

## useAdminStore

Store Zustand (`src/store/useAdminStore.ts`) que centraliza o estado e as ações de fetch da AdminView. Persiste os dados entre montagens — navegar para outra view e voltar não re-faz os fetches.

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

**Mutations:**
- `createClient / updateClient / deleteClient`
- `linkUserToClient / unlinkUserFromClient`
- `createUser / updateUser / setUserRole / setUserAuthId`
- `deactivateUser(userId)` — seta `is_active: false` e `deactivated_at: now()` no member; preserva tasks e steps
- `reactivateUser(userId)` — seta `is_active: true` e limpa `deactivated_at: null` no member
- `listGoogleUsers(search?)` — busca na Supabase Auth admin API (retorna até 20 resultados)

> **Nota:** `setUserAuthId` chama `fetchPendingUsers()` após concluir para manter a lista de pendentes sincronizada sem reload de página.

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

## UsersPanel — filtros do tab Membros

No tab **Membros**, os filtros disponíveis são: **Todos / Ativos / Sem acesso / Desativados**.

- **Ativos** filtra members com `is_active !== false`
- **Sem acesso** filtra members ativos sem `auth_user_id`
- **Desativados** filtra members com `is_active === false`

## Impersonation

Admin pode visualizar a aplicação como um cliente específico via `impersonatedClientId` (estado no `AuthContext`). Um banner amarelo aparece na AdminView quando ativo, com botão para sair da visão.
