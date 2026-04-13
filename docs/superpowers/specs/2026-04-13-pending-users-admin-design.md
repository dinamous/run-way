# Spec — Usuários Pendentes de Vínculo (AdminView)

**Data:** 2026-04-13  
**Status:** Aprovado

## Contexto

O fluxo atual exige que o admin crie o `member` primeiro e depois associe manualmente o `auth_user_id` do Google. Não havia visibilidade de quais usuários já fizeram login com o domínio correto mas ainda não foram vinculados a nenhum `member`. Esta feature adiciona essa visibilidade e a ação de vínculo direto.

## Arquitetura

### `useAdminData` — nova função `fetchPendingUsers`

- Chama `supabaseAdmin.auth.admin.listUsers()` para obter todos os Auth users
- Filtra pelo domínio permitido (`VITE_ALLOWED_DOMAIN`) — mesma lógica do `AuthContext`
- Cruza com o conjunto de `auth_user_id` já preenchidos nos `members` em memória
- Retorna os que não têm vínculo como `PendingAuthUser[]`

```ts
interface PendingAuthUser {
  id: string           // auth UID
  email: string
  name: string         // user_metadata.full_name ou prefixo do email
  avatarUrl: string | null
  lastSignInAt: string | null
}
```

- `fetchPendingUsers` é chamado dentro de `refreshAll` junto com `fetchClients`, `fetchUsers` e `fetchUserClientsMap`
- Exposto como `pendingUsers: PendingAuthUser[]` no retorno do hook
- Sem novas tabelas, sem migrations

### `UsersPanel` — aba "Pendentes"

Adiciona sistema de abas no topo do painel:
- **"Membros"** — comportamento atual, sem mudança
- **"Pendentes (N)"** — badge com contagem de pendentes

#### Lista de pendentes

Cada item exibe:
- Avatar (foto do Google ou iniciais do email)
- Nome completo e email
- Data do último login
- Botão "Vincular"

#### Ação de vínculo

Ao clicar em "Vincular":
- Abre um `Drawer` (componente já existente no `UsersPanel`)
- Campo de busca filtra os `members` que têm `auth_user_id === null` (ainda não vinculados)
- Admin seleciona o member desejado e confirma
- Chama `setUserAuthId(memberId, authUserId, avatarUrl)`
- Fecha o drawer e recarrega a lista

## Componentes afetados

| Arquivo | Mudança |
|---|---|
| `src/views/admin/hooks/useAdminData.ts` | + `fetchPendingUsers`, + `pendingUsers` no retorno |
| `src/views/admin/components/UsersPanel.tsx` | + abas, + aba Pendentes, + drawer de vínculo |

## Sem escopo

- Criar novo `member` a partir de um usuário pendente (não solicitado)
- Notificações ou emails para usuários pendentes
- Paginação dos pendentes (volume esperado é pequeno)
