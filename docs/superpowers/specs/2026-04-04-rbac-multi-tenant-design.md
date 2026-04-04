# Design: RBAC + Multi-Tenant + Audit Log

**Data:** 2026-04-04  
**Status:** Aprovado

---

## Contexto

A aplicação é uma ferramenta interna da agência para capacity planning. A agência presta serviços para empresas clientes externas. O sistema precisa de:

- Controle de acesso baseado em roles (`admin` / `user`)
- Multi-tenancy leve: demandas pertencem a um cliente específico
- Usuários vinculados a 1+ clientes (só veem as demandas dos seus clientes)
- Admin com visão total e capacidade de impersonar um cliente
- Audit log completo de todas as ações

---

## Modelo de Dados

### Tabelas novas

```sql
clients
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name        text NOT NULL
  slug        text UNIQUE NOT NULL
  created_at  timestamptz DEFAULT now()

user_clients
  user_id     uuid REFERENCES members(id) ON DELETE CASCADE
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE
  PRIMARY KEY (user_id, client_id)

audit_logs
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     uuid REFERENCES members(id)
  client_id   uuid REFERENCES clients(id)
  entity      text CHECK (entity IN ('task', 'step'))
  entity_id   uuid NOT NULL
  entity_name text          -- título da demanda/step para leitura humana
  action      text CHECK (action IN ('create', 'update', 'delete'))
  field       text          -- qual campo foi alterado (ex: 'status', 'end_date')
  from_value  text
  to_value    text
  created_at  timestamptz DEFAULT now()
```

### Tabela modificada: `members`

Adicionar colunas:

```sql
ALTER TABLE members ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
ALTER TABLE members ADD COLUMN access_role text DEFAULT 'user' CHECK (access_role IN ('admin', 'user'));
ALTER TABLE members ADD CONSTRAINT members_auth_user_unique UNIQUE (auth_user_id);
```

### Tabela modificada: `tasks`

Adicionar coluna:

```sql
ALTER TABLE tasks ADD COLUMN client_id uuid REFERENCES clients(id);
```

---

## RLS Policies

### `tasks`
- **SELECT/INSERT/UPDATE/DELETE para user:** `client_id IN (SELECT client_id FROM user_clients WHERE user_id = (SELECT id FROM members WHERE auth_user_id = auth.uid()))`
- **Admin:** acessa tudo via `access_role = 'admin'` no JOIN com `members`

### `audit_logs`
- Nenhum acesso via RLS para usuários comuns
- Admin acessa via Supabase service role (painel admin isolado)

### `clients`, `user_clients`
- Leitura: usuário vê apenas os clientes aos quais está vinculado
- Escrita: somente admin

---

## AuthContext (front-end)

Substitui/estende o `useAuth` atual. Após login, busca o `member` vinculado ao `auth.uid()`:

```ts
interface AuthContext {
  user: SupabaseUser | null
  member: Member | null       // inclui access_role
  clientIds: string[]         // clientes do usuário
  isAdmin: boolean
  impersonatedClientId: string | null   // admin only
  setImpersonatedClientId: (id: string | null) => void
  loading: boolean
}
```

**Resolução:** `members.auth_user_id = auth.uid()` → carrega `member` + `user_clients`.

---

## Impersonação (Admin)

- Admin seleciona um cliente no painel → `setImpersonatedClientId(clientId)`
- Estado fica em `AuthContext` (não persiste — reseta ao navegar para o painel)
- Todas as queries do `useSupabase` respeitam:

```ts
const effectiveClientIds = isAdmin
  ? impersonatedClientId ? [impersonatedClientId] : null  // null = sem filtro (vê tudo)
  : clientIds
```

- RLS continua ativa com o usuário admin; impersonação é filtro de UI apenas

---

## Proteção de Rotas

**Atual (React):**
- `<RequireAuth>` — redireciona para `/login` se sem sessão
- `<RequireAdmin>` — bloqueia se `!isAdmin`

**Futuro (Next.js — já considerado no design):**
- Vira `middleware.ts` verificando cookie de sessão Supabase
- `/admin/*` protegida pelo middleware
- Mesma lógica, diferente camada

---

## Audit Log

### Gravação

Toda ação de CRUD em `tasks` ou `steps` grava em `audit_logs`:

```ts
// Exemplo: atualização de status de uma task
await insertAuditLog({
  user_id: member.id,
  client_id: task.client_id,
  entity: 'task',
  entity_id: task.id,
  entity_name: task.title,
  action: 'update',
  field: 'status',
  from_value: 'em andamento',
  to_value: 'concluído',
})
```

Encapsulado em um helper `logAudit()` chamado após cada operação bem-sucedida no `useSupabase`.

### Toast (feedback visual)

Após cada ação, exibir toast:

```
✓ [Demanda: "Nome da demanda"] status atualizado: "Em andamento" → "Concluído"
✓ [Step: QA] data fim atualizada: "2026-04-10" → "2026-04-15"
✓ Demanda "Nova demanda" criada
```

### Painel Admin — Visualização de Logs

Filtros disponíveis:
- **Cliente** (select)
- **Demanda** (busca por nome ou ID)
- **Step/Entidade** (task, design, approval, dev, qa)
- **Período** (date range picker)
- **Usuário** (quem fez a ação)

Tabela com colunas: Data/Hora · Usuário · Demanda · Entidade · Ação · Campo · De → Para

---

## Admin Panel — Visão Geral

Rota separada (`/admin`, futuramente `/admin` no Next.js):

- **Dashboard macro:** lista de clientes com contagem de demandas por status
- **Gerenciamento de clientes:** CRUD de clientes
- **Gerenciamento de usuários:** vincular/desvincular usuários a clientes, atribuir `access_role`
- **Impersonação:** botão "Visualizar como cliente X"
- **Audit Logs:** tabela filtrada conforme descrito acima

---

## Considerações para Migração React → Next.js

- `AuthContext` e `useSupabase` são agnósticos de framework — migram sem mudança
- RLS e `audit_logs` ficam 100% no Supabase — independentes
- Admin panel desenhado como rota isolada — vira `app/admin/` no Next
- Impersonação via estado local (sem server-side state) — compatível com Server Components
- `service_role` key usada apenas no servidor (Next API routes / Server Actions) — nunca exposta ao client

---

## Fora de Escopo

- Notificações por e-mail de ações
- Permissões granulares por demanda (não por cliente)
- SSO / provedor de autenticação adicional
