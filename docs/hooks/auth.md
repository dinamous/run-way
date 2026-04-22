# AuthContext

**Ficheiro:** `src/contexts/AuthContext.tsx`

Contexto global de autenticação. Gere sessão Supabase, perfil do membro autenticado, lista de clientes acessíveis e sincronização em tempo real de vínculos de cliente.

## Uso

```ts
const { session, member, clients, isAdmin, loading, signIn, signOut, refreshProfile } = useAuthContext()
```

> `useAuth` em `src/hooks/useAuth.ts` é um re-export de `useAuthContext` mantido por compatibilidade. Prefira `useAuthContext` diretamente.

---

## Dados expostos

| Campo | Tipo | Descrição |
|---|---|---|
| `session` | `Session \| null` | Sessão Supabase ativa |
| `user` | `User \| null` | Usuário Supabase Auth |
| `member` | `Member \| null` | Registro do membro na tabela `members` |
| `clients` | `ClientOption[]` | Clientes que o usuário tem acesso (`id, name, slug`) |
| `isAdmin` | `boolean` | `true` se `member.access_role === 'admin'` |
| `loading` | `boolean` | `true` durante o bootstrap inicial da sessão |
| `authError` | `string \| null` | Mensagem de erro de autenticação |
| `impersonatedClientId` | `string \| null` | Cliente impersonado pelo admin (usado no AdminView) |
| `signIn` | `() => void` | OAuth Google |
| `signOut` | `() => void` | Encerra sessão local |
| `refreshProfile` | `() => Promise<void>` | Recarrega `member` + `clients` sob demanda |

---

## loadProfile

Chamada internamente no bootstrap e nos eventos do `onAuthStateChange`. Faz:

1. Busca o membro pelo `auth_user_id` na tabela `members`
2. Se não encontrar, tenta vínculo por e-mail (membro pendente) e preenche `auth_user_id` automaticamente
3. Sincroniza `avatar_url` da sessão Google se ainda não estiver preenchido
4. Para **admins**: `clients` = todos os clientes
5. Para **não-admins**: filtra `clients` via `user_clients` (somente os vinculados)

---

## Realtime de clientes (user_clients)

Usuários não-admin recebem atualizações em tempo real quando o admin altera seus vínculos de cliente — sem precisar recarregar a página.

### Como funciona

Ao montar o `AuthProvider` com um membro não-admin autenticado, é criado um canal Supabase Realtime:

```
canal: `user_clients:<member.id>`
tabela: public.user_clients
filtro: user_id = eq.<member.id>
```

O canal escuta eventos `*` (INSERT e DELETE) e reage imediatamente:

| Evento | Ação |
|---|---|
| `INSERT` | Recarrega a lista de clientes; exibe toast "Você foi adicionado a um novo cliente." |
| `DELETE` | Recarrega a lista de clientes; se o cliente removido era o **atualmente selecionado**, troca automaticamente para o primeiro cliente disponível e exibe toast de aviso |

### Requisitos de infraestrutura

A tabela `user_clients` precisa estar configurada para emitir eventos:

```sql
-- Migration: supabase/migrations/20260422000000_user_clients_realtime.sql
ALTER TABLE public.user_clients REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_clients;
```

`REPLICA IDENTITY FULL` é necessário para que eventos `DELETE` retornem `payload.old` (sem ele, `payload.old` chega vazio e não dá para identificar qual cliente foi removido).

### Ciclo de vida do canal

- **Criado** quando `member` é definido (não-admin)
- **Destruído e recriado** se `member` mudar (troca de conta)
- **Destruído** no logout (evento `SIGNED_OUT` no `onAuthStateChange`)
- **Destruído** no unmount do provider

### Limitação: admins não escutam

Admins têm acesso a todos os clientes por definição — o listener é criado somente para `access_role !== 'admin'`. Se um admin for rebaixado a `user` em tempo real, a mudança só refletirá no próximo `loadProfile`.

---

## Política de expiração de sessão

Além da expiração nativa do Supabase, o `AuthContext` aplica uma política própria via `VITE_SESSION_MAX_AGE_HOURS` (padrão: 168h / 7 dias). Se o último login ultrapassar esse limite, a sessão é encerrada localmente e o usuário vê mensagem de aviso.

---

## Domínio permitido

Se `VITE_ALLOWED_DOMAIN` estiver definido (ex: `minhaempresa.com`), apenas e-mails desse domínio podem autenticar. Contas fora do domínio são recusadas no `onAuthStateChange`.
