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
│   └── useAdminData.ts        # Todos os fetches e mutations admin
└── components/
    ├── ClientsPanel.tsx       # Gestão de clientes
    ├── UsersPanel.tsx         # Gestão de membros e vínculos
    └── AuditLogsPanel.tsx     # Log de auditoria com filtros
```

## Abas

| Aba | Componente | O que faz |
|---|---|---|
| Clientes | `ClientsPanel` | CRUD de clientes; vínculo usuário ↔ cliente |
| Usuários | `UsersPanel` | CRUD de membros; vínculo com conta Google |
| Audit Log | `AuditLogsPanel` | Histórico de ações com filtros |

## useAdminData

Hook centraliza todos os dados e mutations da AdminView. Usa `supabaseAdmin` (service role) para todas as operações.

**Estado exposto:**
```ts
clients: DbClientRow[]
users: Member[]
auditLogs: DbAuditLogRow[]
userClientsMap: Record<string, string[]>   // memberId → clientId[]
loading: boolean
loadingInitial: boolean
error: string | null
```

**Mutations:**
- `createClient / updateClient / deleteClient`
- `linkUserToClient / unlinkUserFromClient`
- `createUser / updateUser / setUserRole / setUserAuthId`
- `listGoogleUsers(search?)` — busca na Supabase Auth admin API (retorna até 20 resultados)
- `fetchAuditLogs(filters)` — filtros: clientId, entity, userId, entityName, from/to

## UsersPanel — comportamento do drawer de edição

O drawer de edição acumula todas as mudanças em estado local e só dispara requests ao clicar em **Guardar**:

- Alterações de nome, cargo e email → `onUpdate`
- Alteração de access role → `onSetRole` (só chamado se o valor mudou)
- Adição/remoção de clientes → `onLink` / `onUnlink` em sequência
- Vínculo de conta Google → `onSetAuthId`

**Ao fechar com dados não salvos** (botão Cancelar, ESC ou clicar fora), exibe `ConfirmModal` pedindo confirmação antes de descartar.

**Dropdown de conta Google** fica fora do container com `overflow-y-auto` para não ser clipado pelo scroll.

## Impersonation

Admin pode visualizar a aplicação como um cliente específico via `impersonatedClientId` (estado no `AuthContext`). Um banner amarelo aparece na AdminView quando ativo, com botão para sair da visão.
