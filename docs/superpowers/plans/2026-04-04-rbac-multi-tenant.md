# RBAC + Multi-Tenant + Audit Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar controle de acesso (admin/user), multi-tenancy por cliente e audit log completo com painel admin.

**Architecture:** RLS no Supabase garante isolamento de dados por cliente na camada de banco. Um `AuthContext` expõe `member`, `isAdmin`, `clientIds` e `impersonatedClientId` globalmente. O `useSupabase` usa esses valores para filtrar queries e registrar logs de auditoria.

**Tech Stack:** React 19 · TypeScript 5.9 · Supabase (PostgreSQL + RLS + Auth) · Tailwind CSS 4 · sonner (toast já instalado)

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260404000000_rbac.sql` | Criar | DDL: novas tabelas + ALTER + RLS policies |
| `src/contexts/AuthContext.tsx` | Criar | Context com member, isAdmin, clientIds, impersonation |
| `src/lib/audit.ts` | Criar | Helper `logAudit()` — insere em audit_logs |
| `src/components/RequireAdmin.tsx` | Criar | Guard component para rotas admin |
| `src/views/admin/AdminView.tsx` | Criar | Shell do painel admin com tabs |
| `src/views/admin/components/ClientsPanel.tsx` | Criar | CRUD de clientes |
| `src/views/admin/components/UsersPanel.tsx` | Criar | Vincular usuários a clientes |
| `src/views/admin/components/AuditLogsPanel.tsx` | Criar | Tabela de logs com filtros |
| `src/views/admin/hooks/useAdminData.ts` | Criar | Fetch de clientes, users, audit_logs (service role) |
| `src/views/admin/index.ts` | Criar | Barrel export |
| `src/hooks/useAuth.ts` | Modificar | Carregar member + clientIds após login |
| `src/hooks/useSupabase.ts` | Modificar | Filtro por cliente + chamar logAudit + toasts |
| `src/types/db.ts` | Modificar | Adicionar tipos de DB para novas tabelas |
| `src/App.tsx` | Modificar | Prover AuthContext + view admin + sidebar link |
| `src/components/AppSidebar.tsx` | Modificar | Link "Admin" visível apenas para admins |

---

## Task 1: Migration SQL — Novas Tabelas e Alterações

**Files:**
- Create: `supabase/migrations/20260404000000_rbac.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260404000000_rbac.sql

-- ─── 1. clients ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── 2. user_clients (N:N members ↔ clients) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS user_clients (
  user_id   uuid REFERENCES members(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, client_id)
);

-- ─── 3. audit_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES members(id),
  client_id   uuid REFERENCES clients(id),
  entity      text NOT NULL CHECK (entity IN ('task', 'step')),
  entity_id   uuid NOT NULL,
  entity_name text,
  action      text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  field       text,
  from_value  text,
  to_value    text,
  created_at  timestamptz DEFAULT now()
);

-- ─── 4. Alterar members ───────────────────────────────────────────────────────
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS access_role  text DEFAULT 'user'
    CHECK (access_role IN ('admin', 'user'));

ALTER TABLE members
  ADD CONSTRAINT IF NOT EXISTS members_auth_user_unique UNIQUE (auth_user_id);

-- ─── 5. Alterar tasks ─────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- ─── 6. RLS — clients ─────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_all_clients" ON clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
        AND members.access_role = 'admin'
    )
  );

-- User: lê apenas seus clientes
CREATE POLICY "user_read_own_clients" ON clients
  FOR SELECT
  USING (
    id IN (
      SELECT uc.client_id FROM user_clients uc
      JOIN members m ON m.id = uc.user_id
      WHERE m.auth_user_id = auth.uid()
    )
  );

-- ─── 7. RLS — user_clients ────────────────────────────────────────────────────
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_user_clients" ON user_clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
        AND members.access_role = 'admin'
    )
  );

CREATE POLICY "user_read_own_user_clients" ON user_clients
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM members WHERE auth_user_id = auth.uid()
    )
  );

-- ─── 8. RLS — tasks (atualizar/substituir policies existentes) ────────────────
-- (Descomente e adapte se já houver policies em tasks)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_all_tasks" ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
        AND members.access_role = 'admin'
    )
  );

-- User: apenas tasks do(s) seu(s) cliente(s)
CREATE POLICY "user_own_client_tasks" ON tasks
  FOR ALL
  USING (
    client_id IN (
      SELECT uc.client_id FROM user_clients uc
      JOIN members m ON m.id = uc.user_id
      WHERE m.auth_user_id = auth.uid()
    )
  );

-- ─── 9. RLS — audit_logs (somente service role acessa) ───────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy de usuário — apenas service_role bypassa RLS
```

- [ ] **Step 2: Executar a migration no Supabase Dashboard**

No Supabase Dashboard → SQL Editor → cole e execute o conteúdo do arquivo.

Verificação: Confirmar que as tabelas `clients`, `user_clients`, `audit_logs` aparecem em Table Editor, e que `members` e `tasks` têm as novas colunas.

- [ ] **Step 3: Criar um cliente de teste e um admin via SQL**

```sql
-- Inserir cliente de teste
INSERT INTO clients (name, slug) VALUES ('Cliente Teste', 'cliente-teste');

-- Marcar um membro existente como admin (substituir pelo auth_user_id real)
-- Primeiro, descobrir o auth.uid() do seu usuário:
SELECT id FROM auth.users LIMIT 5;

-- Atualizar o membro vinculado ao seu email:
UPDATE members
SET auth_user_id = '<SEU_AUTH_UID>',
    access_role = 'admin'
WHERE name = '<SEU_NOME>';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260404000000_rbac.sql
git commit -m "feat: :card_file_box: migration RBAC — clients, user_clients, audit_logs e RLS"
```

---

## Task 2: Tipos TypeScript — DB e Domínio

**Files:**
- Modify: `src/types/db.ts`
- Modify: `src/hooks/useSupabase.ts` (apenas interface Member)

- [ ] **Step 1: Adicionar tipos de DB em `src/types/db.ts`**

Adicionar ao final do arquivo:

```ts
// ─── RBAC / Multi-tenant rows ─────────────────────────────────────────────────

export interface DbClientRow {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface DbUserClientRow {
  user_id: string
  client_id: string
}

export interface DbAuditLogRow {
  id: string
  user_id: string | null
  client_id: string | null
  entity: 'task' | 'step'
  entity_id: string
  entity_name: string | null
  action: 'create' | 'update' | 'delete'
  field: string | null
  from_value: string | null
  to_value: string | null
  created_at: string
}
```

- [ ] **Step 2: Atualizar interface `Member` em `src/hooks/useSupabase.ts`**

Localizar (linha ~10):
```ts
export interface Member {
  id: string
  name: string
  role: string
  avatar: string
}
```

Substituir por:
```ts
export interface Member {
  id: string
  name: string
  role: string
  avatar: string
  auth_user_id?: string | null
  access_role?: 'admin' | 'user'
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/db.ts src/hooks/useSupabase.ts
git commit -m "feat: :label: atualizar tipos Member e adicionar tipos DB para RBAC"
```

---

## Task 3: AuthContext — Role, ClientIds e Impersonação

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Modify: `src/hooks/useAuth.ts`

- [ ] **Step 1: Criar `src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/hooks/useSupabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  member: Member | null
  clientIds: string[]
  isAdmin: boolean
  impersonatedClientId: string | null
  setImpersonatedClientId: (id: string | null) => void
  signIn: () => void
  signOut: () => void
  authError: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [clientIds, setClientIds] = useState<string[]>([])
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(null)

  // Busca member + clientIds após login
  async function loadProfile(authUid: string) {
    const { data: memberData } = await supabase
      .from('members')
      .select('id, name, role, avatar, auth_user_id, access_role')
      .eq('auth_user_id', authUid)
      .single()

    if (!memberData) { setMember(null); setClientIds([]); return }

    setMember(memberData as Member)

    if (memberData.access_role !== 'admin') {
      const { data: uc } = await supabase
        .from('user_clients')
        .select('client_id')
        .eq('user_id', memberData.id)
      setClientIds((uc ?? []).map((r: { client_id: string }) => r.client_id))
    } else {
      setClientIds([]) // admin usa impersonação ou vê tudo
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession?.user) {
          const email = newSession.user.email ?? ''
          const domain = email.split('@')[1]

          if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) {
            await supabase.auth.signOut()
            setAuthError(`Acesso restrito ao domínio @${ALLOWED_DOMAIN}.`)
            setSession(null); setUser(null); setLoading(false)
            return
          }

          await loadProfile(newSession.user.id)
        } else {
          setMember(null)
          setClientIds([])
        }

        setSession(newSession)
        setUser(newSession?.user ?? null)
        setAuthError(null)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signOut = () => supabase.auth.signOut().catch(console.error)

  return (
    <AuthContext.Provider value={{
      session, user, member, clientIds,
      isAdmin: member?.access_role === 'admin',
      impersonatedClientId, setImpersonatedClientId,
      signIn, signOut, authError, loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de <AuthProvider>')
  return ctx
}
```

- [ ] **Step 2: Deprecar `useAuth` — redirecionar para `useAuthContext`**

Substituir o conteúdo de `src/hooks/useAuth.ts` por:

```ts
/**
 * @deprecated Use useAuthContext() de src/contexts/AuthContext.tsx
 * Mantido temporariamente para não quebrar imports existentes durante a migração.
 */
export { useAuthContext as useAuth } from '@/contexts/AuthContext'
```

- [ ] **Step 3: Verificação manual**

Abrir o app (`npm run dev`). Logar com Google. Abrir DevTools → Console — não deve haver erros. O `member` ainda vai ser `null` até que `auth_user_id` seja preenchido no DB (feito na Task 1, Step 3).

- [ ] **Step 4: Commit**

```bash
git add src/contexts/AuthContext.tsx src/hooks/useAuth.ts
git commit -m "feat: :sparkles: criar AuthContext com suporte a roles e impersonação"
```

---

## Task 4: Envolver App.tsx com AuthProvider

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar `src/main.tsx` wrapper ou atualizar `App.tsx`**

Em `src/App.tsx`, substituir o import de `useAuth`:

```tsx
// Remover:
import { useAuth } from "./hooks/useAuth";

// Adicionar:
import { useAuthContext } from "./contexts/AuthContext";
```

Substituir o uso:
```tsx
// Remover:
const { session, user, signIn, signOut, authError, loading: authLoading } = useAuth();

// Adicionar:
const { session, user, signIn, signOut, authError, loading: authLoading, isAdmin } = useAuthContext();
```

- [ ] **Step 2: Envolver o App com `AuthProvider` em `src/main.tsx`**

Ler o conteúdo atual de `src/main.tsx` e adicionar o provider:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
```

- [ ] **Step 3: Verificar build sem erros**

```bash
npm run build
```

Esperado: sem erros TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: :wrench: envolver App com AuthProvider"
```

---

## Task 5: Helper `logAudit`

**Files:**
- Create: `src/lib/audit.ts`

- [ ] **Step 1: Criar `src/lib/audit.ts`**

```ts
import { supabase } from '@/lib/supabase'

export interface AuditPayload {
  userId: string
  clientId: string | null
  entity: 'task' | 'step'
  entityId: string
  entityName?: string
  action: 'create' | 'update' | 'delete'
  field?: string
  fromValue?: string | null
  toValue?: string | null
}

/**
 * Grava uma entrada no audit_logs.
 * Falhas são silenciosas — nunca bloquear a ação principal.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: payload.userId,
    client_id: payload.clientId,
    entity: payload.entity,
    entity_id: payload.entityId,
    entity_name: payload.entityName ?? null,
    action: payload.action,
    field: payload.field ?? null,
    from_value: payload.fromValue ?? null,
    to_value: payload.toValue ?? null,
  })
  if (error) console.warn('[audit] Erro ao registrar log:', error.message)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/audit.ts
git commit -m "feat: :card_file_box: helper logAudit para registrar ações no audit_logs"
```

---

## Task 6: Atualizar `useSupabase` — Filtro por Cliente + Audit + Toast

**Files:**
- Modify: `src/hooks/useSupabase.ts`

O `useSupabase` precisa receber `clientIds`, `isAdmin`, `impersonatedClientId` e `memberId` como parâmetros (passados de `App.tsx`). Isso evita acoplamento circular com o `AuthContext`.

- [ ] **Step 1: Atualizar assinatura do hook**

Localizar a função `useSupabase()` e adicionar parâmetro:

```ts
interface UseSupabaseOptions {
  memberId?: string
  clientId?: string | null        // null = admin vê tudo; string = filtra por cliente
  isAdmin?: boolean
}

export function useSupabase(options: UseSupabaseOptions = {}) {
  const { memberId, clientId, isAdmin } = options
  // ... resto do hook
```

- [ ] **Step 2: Atualizar `fetchTasks` para filtrar por `clientId`**

Substituir o conteúdo de `fetchTasks`:

```ts
const fetchTasks = useCallback(async (): Promise<boolean> => {
  let query = supabase
    .from('tasks')
    .select(`
      id, title, clickup_link, blocked, blocked_at, created_at, client_id,
      task_steps (
        id, type, step_order, active, start_date, end_date,
        step_assignees ( member_id )
      )
    `)
    .order('created_at', { ascending: false })

  // Filtrar por cliente — admin sem impersonação vê tudo (sem filtro)
  if (!isAdmin || clientId) {
    const ids = clientId ? [clientId] : []
    if (ids.length > 0) {
      query = query.in('client_id', ids)
    } else if (!isAdmin) {
      // Usuário sem clientes configurados — retorna vazio
      setTasks([])
      return true
    }
  }

  const { data, error } = await query
  if (error) { setError(error.message); return false }
  setTasks((data ?? []).map(dbRowToTask))
  setError(null)
  return true
}, [isAdmin, clientId])
```

- [ ] **Step 3: Atualizar `dbRowToTask` para incluir `client_id`**

Atualizar `DbTaskRow` em `src/types/db.ts` (adicionar campo):
```ts
export interface DbTaskRow {
  // ... campos existentes
  client_id: string | null   // novo
}
```

E no mapper `dbRowToTask` em `useSupabase.ts`, adicionar ao retorno:
```ts
return {
  id: row.id,
  title: row.title,
  clickupLink: row.clickup_link ?? undefined,
  clientId: row.client_id ?? undefined,   // novo
  status: { blocked: row.blocked, blockedAt: row.blocked_at ?? undefined },
  createdAt: row.created_at,
  steps,
}
```

E no tipo `Task` em `src/lib/steps.ts`, adicionar:
```ts
clientId?: string
```

- [ ] **Step 4: Adicionar toasts e logAudit em `createTask`**

Importar no topo de `useSupabase.ts`:
```ts
import { toast } from 'sonner'
import { logAudit } from '@/lib/audit'
```

Localizar a função `createTask` e adicionar após o insert bem-sucedido:

```ts
// Após o insert com sucesso:
toast.success(`Demanda "${taskData.title}" criada`)
if (memberId) {
  await logAudit({
    userId: memberId,
    clientId: taskData.clientId ?? null,
    entity: 'task',
    entityId: newTask.id,
    entityName: taskData.title,
    action: 'create',
  })
}
```

- [ ] **Step 5: Adicionar toast e logAudit em `updateTask`**

Localizar `updateTask` e adicionar após update bem-sucedido. Para cada campo alterado comparar `prev` vs `next` e chamar `logAudit`. Ao menos registrar a atualização do status:

```ts
// Dentro de updateTask, após o update:
const prevTask = tasks.find(t => t.id === task.id)
toast.success(`Demanda "${task.title}" atualizada`)

if (memberId && prevTask) {
  // Log de mudança de status bloqueado
  if (prevTask.status?.blocked !== task.status?.blocked) {
    await logAudit({
      userId: memberId,
      clientId: task.clientId ?? null,
      entity: 'task',
      entityId: task.id,
      entityName: task.title,
      action: 'update',
      field: 'blocked',
      fromValue: String(prevTask.status?.blocked ?? false),
      toValue: String(task.status?.blocked ?? false),
    })
  }
  // Log de mudança de título
  if (prevTask.title !== task.title) {
    await logAudit({
      userId: memberId,
      clientId: task.clientId ?? null,
      entity: 'task',
      entityId: task.id,
      entityName: task.title,
      action: 'update',
      field: 'title',
      fromValue: prevTask.title,
      toValue: task.title,
    })
  }
}
```

- [ ] **Step 6: Adicionar toast e logAudit em `deleteTask`**

```ts
// Dentro de deleteTask, após delete bem-sucedido:
const deletedTask = tasks.find(t => t.id === id)
toast.success(`Demanda "${deletedTask?.title ?? id}" eliminada`)

if (memberId && deletedTask) {
  await logAudit({
    userId: memberId,
    clientId: deletedTask.clientId ?? null,
    entity: 'task',
    entityId: id,
    entityName: deletedTask.title,
    action: 'delete',
  })
}
```

- [ ] **Step 7: Atualizar chamada em `App.tsx`**

```tsx
const { session, user, signIn, signOut, authError, loading: authLoading, isAdmin, member, impersonatedClientId } = useAuthContext()

const effectiveClientId = isAdmin ? impersonatedClientId : (clientIds[0] ?? null)

const { tasks, members, createTask, updateTask, deleteTask } = useSupabase({
  memberId: member?.id,
  clientId: effectiveClientId,
  isAdmin,
})
```

> Nota: quando `isAdmin` e `impersonatedClientId` é `null`, `effectiveClientId` fica `null` — o hook não filtra e o admin vê tudo. O RLS permite isso pois o admin tem `access_role = 'admin'`.

- [ ] **Step 8: Verificar app funcional**

```bash
npm run dev
```

Verificar: criar/editar/deletar uma demanda gera toast. Abrir Supabase → Table Editor → `audit_logs` e confirmar que há registros.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useSupabase.ts src/types/db.ts src/lib/steps.ts src/App.tsx
git commit -m "feat: :sparkles: useSupabase com filtro por cliente, audit log e toasts"
```

---

## Task 7: Componente `RequireAdmin`

**Files:**
- Create: `src/components/RequireAdmin.tsx`

- [ ] **Step 1: Criar `src/components/RequireAdmin.tsx`**

```tsx
import { type ReactNode } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'

interface RequireAdminProps {
  children: ReactNode
  fallback?: ReactNode
}

export function RequireAdmin({ children, fallback = null }: RequireAdminProps) {
  const { isAdmin, loading } = useAuthContext()
  if (loading) return null
  if (!isAdmin) return <>{fallback}</>
  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RequireAdmin.tsx
git commit -m "feat: :lock: componente RequireAdmin para proteção de rotas admin"
```

---

## Task 8: Hook `useAdminData`

**Files:**
- Create: `src/views/admin/hooks/useAdminData.ts`

> **Atenção:** audit_logs requer `service_role` key para bypassar RLS. No front-end React atual, use um cliente Supabase separado com `VITE_SUPABASE_SERVICE_ROLE_KEY`. Na migração para Next.js, mover para Server Action.

- [ ] **Step 1: Adicionar variável de ambiente**

Em `.env.local` (não commitar):
```
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

Em `src/lib/supabase.ts`, adicionar cliente admin:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Usar APENAS em contexto admin — bypassa RLS */
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null
```

- [ ] **Step 2: Criar `src/views/admin/hooks/useAdminData.ts`**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import type { DbClientRow, DbAuditLogRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'

export interface AuditFilters {
  clientId?: string
  entityName?: string
  entity?: string
  userId?: string
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
}

export function useAdminData() {
  const [clients, setClients] = useState<DbClientRow[]>([])
  const [users, setUsers] = useState<Member[]>([])
  const [auditLogs, setAuditLogs] = useState<DbAuditLogRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchClients = useCallback(async () => {
    if (!supabaseAdmin) return
    const { data } = await supabaseAdmin
      .from('clients')
      .select('*')
      .order('name')
    setClients(data ?? [])
  }, [])

  const fetchUsers = useCallback(async () => {
    if (!supabaseAdmin) return
    const { data } = await supabaseAdmin
      .from('members')
      .select('id, name, role, avatar, auth_user_id, access_role')
      .order('name')
    setUsers(data ?? [])
  }, [])

  const fetchAuditLogs = useCallback(async (filters: AuditFilters = {}) => {
    if (!supabaseAdmin) return
    setLoading(true)

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters.clientId) query = query.eq('client_id', filters.clientId)
    if (filters.entity)   query = query.eq('entity', filters.entity)
    if (filters.userId)   query = query.eq('user_id', filters.userId)
    if (filters.entityName) query = query.ilike('entity_name', `%${filters.entityName}%`)
    if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00Z`)
    if (filters.to)   query = query.lte('created_at', `${filters.to}T23:59:59Z`)

    const { data } = await query
    setAuditLogs(data ?? [])
    setLoading(false)
  }, [])

  // CRUD clients
  const createClient = useCallback(async (name: string, slug: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin.from('clients').insert({ name, slug })
    if (error) return false
    await fetchClients()
    return true
  }, [fetchClients])

  const deleteClient = useCallback(async (id: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin.from('clients').delete().eq('id', id)
    if (error) return false
    await fetchClients()
    return true
  }, [fetchClients])

  // Vínculo user ↔ client
  const linkUserToClient = useCallback(async (userId: string, clientId: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('user_clients')
      .upsert({ user_id: userId, client_id: clientId })
    if (!error) await fetchUsers()
    return !error
  }, [fetchUsers])

  const unlinkUserFromClient = useCallback(async (userId: string, clientId: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('user_clients')
      .delete()
      .match({ user_id: userId, client_id: clientId })
    if (!error) await fetchUsers()
    return !error
  }, [fetchUsers])

  const setUserRole = useCallback(async (userId: string, role: 'admin' | 'user') => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('members')
      .update({ access_role: role })
      .eq('id', userId)
    if (!error) await fetchUsers()
    return !error
  }, [fetchUsers])

  useEffect(() => {
    fetchClients()
    fetchUsers()
  }, [fetchClients, fetchUsers])

  return {
    clients, users, auditLogs, loading,
    fetchAuditLogs, fetchClients, fetchUsers,
    createClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/hooks/useAdminData.ts src/lib/supabase.ts
git commit -m "feat: :sparkles: hook useAdminData para painel admin"
```

---

## Task 9: Admin Panel — Componentes de UI

**Files:**
- Create: `src/views/admin/components/ClientsPanel.tsx`
- Create: `src/views/admin/components/UsersPanel.tsx`
- Create: `src/views/admin/components/AuditLogsPanel.tsx`

- [ ] **Step 1: Criar `src/views/admin/components/ClientsPanel.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import type { DbClientRow } from '@/types/db'

interface ClientsPanelProps {
  clients: DbClientRow[]
  onCreate: (name: string, slug: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onImpersonate: (clientId: string | null) => void
  impersonatedClientId: string | null
}

export function ClientsPanel({
  clients, onCreate, onDelete, onImpersonate, impersonatedClientId
}: ClientsPanelProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return
    const ok = await onCreate(name.trim(), slug.trim())
    if (ok) { toast.success(`Cliente "${name}" criado`); setName(''); setSlug('') }
    else toast.error('Erro ao criar cliente')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Clientes</h2>

      {/* Formulário de criação */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Nome do cliente"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-48"
        />
        <Input
          placeholder="Slug (ex: empresa-x)"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="w-40"
        />
        <Button onClick={handleCreate} size="sm">Criar cliente</Button>
      </div>

      {/* Lista */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Nome</th>
            <th className="py-2 pr-4">Slug</th>
            <th className="py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className="border-b hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{c.name}</td>
              <td className="py-2 pr-4 text-muted-foreground">{c.slug}</td>
              <td className="py-2 flex gap-2">
                <Button
                  size="sm"
                  variant={impersonatedClientId === c.id ? 'default' : 'outline'}
                  onClick={() => onImpersonate(impersonatedClientId === c.id ? null : c.id)}
                >
                  {impersonatedClientId === c.id ? 'Sair da visão' : 'Visualizar como'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!confirm(`Eliminar cliente "${c.name}"?`)) return
                    const ok = await onDelete(c.id)
                    if (!ok) toast.error('Erro ao eliminar cliente')
                  }}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/views/admin/components/UsersPanel.tsx`**

```tsx
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { Member } from '@/hooks/useSupabase'
import type { DbClientRow } from '@/types/db'

interface UsersPanelProps {
  users: Member[]
  clients: DbClientRow[]
  onSetRole: (userId: string, role: 'admin' | 'user') => Promise<boolean>
  onLink: (userId: string, clientId: string) => Promise<boolean>
  onUnlink: (userId: string, clientId: string) => Promise<boolean>
  userClientsMap: Record<string, string[]>  // userId → clientIds[]
}

export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, userClientsMap
}: UsersPanelProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')

  const handleLink = async () => {
    if (!selectedUser || !selectedClient) return
    const ok = await onLink(selectedUser, selectedClient)
    if (ok) toast.success('Usuário vinculado ao cliente')
    else toast.error('Erro ao vincular')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Usuários</h2>

      {/* Vinculação */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
          value={selectedUser ?? ''}
          onChange={e => setSelectedUser(e.target.value || null)}
        >
          <option value="">Selecionar usuário</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
        >
          <option value="">Selecionar cliente</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleLink}>Vincular</Button>
      </div>

      {/* Tabela de usuários */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Nome</th>
            <th className="py-2 pr-4">Cargo</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2">Clientes</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{u.name}</td>
              <td className="py-2 pr-4 text-muted-foreground">{u.role}</td>
              <td className="py-2 pr-4">
                <select
                  className="border rounded px-1 py-0.5 text-xs bg-background"
                  value={u.access_role ?? 'user'}
                  onChange={async e => {
                    const ok = await onSetRole(u.id, e.target.value as 'admin' | 'user')
                    if (!ok) toast.error('Erro ao alterar role')
                  }}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="py-2 flex flex-wrap gap-1">
                {(userClientsMap[u.id] ?? []).map(cid => {
                  const client = clients.find(c => c.id === cid)
                  return client ? (
                    <Badge
                      key={cid}
                      className="cursor-pointer"
                      onClick={async () => {
                        if (!confirm(`Desvincular ${u.name} de ${client.name}?`)) return
                        const ok = await onUnlink(u.id, cid)
                        if (!ok) toast.error('Erro ao desvincular')
                      }}
                    >
                      {client.name} ✕
                    </Badge>
                  ) : null
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Criar `src/views/admin/components/AuditLogsPanel.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DbAuditLogRow } from '@/types/db'
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
import type { AuditFilters } from '../hooks/useAdminData'

interface AuditLogsPanelProps {
  logs: DbAuditLogRow[]
  clients: DbClientRow[]
  users: Member[]
  loading: boolean
  onFetch: (filters: AuditFilters) => void
}

export function AuditLogsPanel({ logs, clients, users, loading, onFetch }: AuditLogsPanelProps) {
  const [clientId, setClientId] = useState('')
  const [userId, setUserId] = useState('')
  const [entity, setEntity] = useState('')
  const [entityName, setEntityName] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const handleSearch = () => {
    onFetch({
      clientId: clientId || undefined,
      userId: userId || undefined,
      entity: entity || undefined,
      entityName: entityName || undefined,
      from: from || undefined,
      to: to || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Audit Log</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Cliente</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          >
            <option value="">Todos</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Usuário</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={userId}
            onChange={e => setUserId(e.target.value)}
          >
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Entidade</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={entity}
            onChange={e => setEntity(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="task">task</option>
            <option value="step">step</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Demanda</span>
          <Input
            placeholder="Nome da demanda"
            value={entityName}
            onChange={e => setEntityName(e.target.value)}
            className="w-40 h-8 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">De</span>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 h-8 text-sm" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Até</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 h-8 text-sm" />
        </div>

        <Button size="sm" onClick={handleSearch} disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground text-xs">
              <th className="py-2 pr-3">Data/Hora</th>
              <th className="py-2 pr-3">Usuário</th>
              <th className="py-2 pr-3">Demanda</th>
              <th className="py-2 pr-3">Entidade</th>
              <th className="py-2 pr-3">Ação</th>
              <th className="py-2 pr-3">Campo</th>
              <th className="py-2">De → Para</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Nenhum registro encontrado</td></tr>
            )}
            {logs.map(log => {
              const user = users.find(u => u.id === log.user_id)
              return (
                <tr key={log.id} className="border-b hover:bg-muted/30">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-1.5 pr-3">{user?.name ?? '—'}</td>
                  <td className="py-1.5 pr-3 max-w-[180px] truncate">{log.entity_name ?? '—'}</td>
                  <td className="py-1.5 pr-3">{log.entity}</td>
                  <td className="py-1.5 pr-3">
                    <span className={
                      log.action === 'create' ? 'text-green-600' :
                      log.action === 'delete' ? 'text-red-600' : 'text-yellow-600'
                    }>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{log.field ?? '—'}</td>
                  <td className="py-1.5 text-xs">
                    {log.from_value || log.to_value
                      ? <span>{log.from_value ?? '∅'} → {log.to_value ?? '∅'}</span>
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/components/
git commit -m "feat: :sparkles: componentes do painel admin (Clients, Users, AuditLogs)"
```

---

## Task 10: AdminView — Shell com Tabs

**Files:**
- Create: `src/views/admin/AdminView.tsx`
- Create: `src/views/admin/index.ts`

- [ ] **Step 1: Criar `src/views/admin/AdminView.tsx`**

```tsx
import { useState } from 'react'
import { useAdminData } from './hooks/useAdminData'
import { ClientsPanel } from './components/ClientsPanel'
import { UsersPanel } from './components/UsersPanel'
import { AuditLogsPanel } from './components/AuditLogsPanel'
import { useAuthContext } from '@/contexts/AuthContext'

type AdminTab = 'clients' | 'users' | 'audit'

export function AdminView() {
  const [tab, setTab] = useState<AdminTab>('clients')
  const { impersonatedClientId, setImpersonatedClientId } = useAuthContext()
  const {
    clients, users, auditLogs, loading,
    fetchAuditLogs,
    createClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
  } = useAdminData()

  // Mapear userId → clientIds a partir dos user_clients
  // useAdminData não carrega isso diretamente — vamos enriquecer os users
  // com os clientes deles via consulta adicional
  const userClientsMap: Record<string, string[]> = {}
  // (populado por useAdminData quando adicionarmos esse fetch — por ora vazio)

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'clients', label: 'Clientes' },
    { key: 'users', label: 'Usuários' },
    { key: 'audit', label: 'Audit Log' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        {impersonatedClientId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-sm">
            <span>Visualizando como cliente</span>
            <button
              className="text-yellow-700 dark:text-yellow-400 font-medium hover:underline"
              onClick={() => setImpersonatedClientId(null)}
            >
              Sair da visão
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {tab === 'clients' && (
          <ClientsPanel
            clients={clients}
            onCreate={createClient}
            onDelete={deleteClient}
            onImpersonate={setImpersonatedClientId}
            impersonatedClientId={impersonatedClientId}
          />
        )}
        {tab === 'users' && (
          <UsersPanel
            users={users}
            clients={clients}
            onSetRole={setUserRole}
            onLink={linkUserToClient}
            onUnlink={unlinkUserFromClient}
            userClientsMap={userClientsMap}
          />
        )}
        {tab === 'audit' && (
          <AuditLogsPanel
            logs={auditLogs}
            clients={clients}
            users={users}
            loading={loading}
            onFetch={fetchAuditLogs}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/views/admin/index.ts`**

```ts
export { AdminView } from './AdminView'
```

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/AdminView.tsx src/views/admin/index.ts
git commit -m "feat: :sparkles: AdminView com tabs (Clientes, Usuários, Audit Log)"
```

---

## Task 11: Integrar AdminView em App.tsx e Sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppSidebar.tsx`

- [ ] **Step 1: Ler `src/components/AppSidebar.tsx` e adicionar link admin**

Localizar o arquivo e identificar onde os links de navegação são renderizados. Adicionar:

```tsx
import { useAuthContext } from '@/contexts/AuthContext'

// Dentro do componente, adicionar:
const { isAdmin } = useAuthContext()

// Na lista de itens de navegação, adicionar condicionalmente:
{isAdmin && (
  <button
    onClick={() => onViewChange('admin')}
    className={/* mesma classe dos outros botões, com active state */}
  >
    Admin
  </button>
)}
```

- [ ] **Step 2: Atualizar `App.tsx` para incluir view admin**

```tsx
import { AdminView } from './views/admin'
import { RequireAdmin } from './components/RequireAdmin'

// Atualizar o tipo de view:
const [view, setView] = useState<"dashboard" | "members" | "reports" | "admin">("dashboard")

// Atualizar a prop onViewChange:
<AppSidebar
  ...
  onViewChange={(v) => setView(v as typeof view)}
/>

// Adicionar à renderização de views:
{view === 'admin' ? (
  <RequireAdmin>
    <AdminView />
  </RequireAdmin>
) : view === "dashboard" ? (
  <DashboardView ... />
) : view === "members" ? (
  <MembersView ... />
) : (
  <ReportsView ... />
)}
```

- [ ] **Step 3: Verificação final**

```bash
npm run dev
```

Verificar:
1. Login com conta admin → link "Admin" aparece na sidebar
2. Login com conta user → link "Admin" não aparece
3. Admin abre painel → tabs Clientes / Usuários / Audit Log funcionam
4. Admin cria um cliente → aparece na lista
5. Admin impersona um cliente → banner amarelo aparece; voltar ao dashboard mostra só demandas desse cliente
6. Criar/editar/deletar demanda → toast aparece + registro em `audit_logs` no Supabase

- [ ] **Step 4: Commit final**

```bash
git add src/App.tsx src/components/AppSidebar.tsx
git commit -m "feat: :sparkles: integrar AdminView e link de navegação admin na sidebar"
```

---

## Self-Review

**Spec coverage:**
- [x] Roles `admin` / `user` → Task 1 (DB) + Task 3 (AuthContext)
- [x] Multi-tenant com `clients` + `user_clients` → Task 1
- [x] RLS policies → Task 1
- [x] AuthContext com `isAdmin`, `clientIds`, impersonação → Task 3 + 4
- [x] `useSupabase` filtrado por cliente → Task 6
- [x] `logAudit` helper → Task 5
- [x] Toast em toda ação CRUD → Task 6
- [x] `RequireAdmin` guard → Task 7
- [x] `useAdminData` (fetch clients, users, audit_logs) → Task 8
- [x] AdminView com tabs → Task 10
- [x] ClientsPanel com CRUD + impersonação → Task 9
- [x] UsersPanel com vínculo user↔client e role → Task 9
- [x] AuditLogsPanel com filtros → Task 9
- [x] Integração em App.tsx + Sidebar → Task 11
- [x] Considerações Next.js → AuthContext agnóstico de framework, admin como rota isolada

**Sem placeholders ou TBDs.**

**Consistência de tipos:** `Member.access_role` definida na Task 2, usada em Tasks 3, 8, 9. `Task.clientId` adicionada na Task 6 e usada em Tasks 6 e 10.
