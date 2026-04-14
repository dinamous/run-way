# User Deactivation (Soft Delete) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a exclusão permanente de members por desativação reversível (`is_active`), preservando tasks/steps associadas e bloqueando o acesso à plataforma.

**Architecture:** Migration Supabase adiciona `is_active boolean NOT NULL DEFAULT true` à tabela `members`. O hook `useAdminData` ganha `deactivateUser` e `reactivateUser` (substituindo `deleteUser`). O `UsersPanel` ganha filtro "Desativados", badge no card, e botão dinâmico no drawer. `AdminView` passa as novas props.

**Tech Stack:** React 19, TypeScript, Supabase (supabaseAdmin service role), Tailwind CSS 4, Lucide icons, Sonner (toasts), Vitest

---

## Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `src/hooks/useSupabase.ts` | Adicionar `is_active?: boolean` ao tipo `Member` |
| `src/views/admin/hooks/useAdminData.ts` | Remover `deleteUser`, adicionar `deactivateUser` e `reactivateUser`, incluir `is_active` no select |
| `src/views/admin/components/UsersPanel.tsx` | Remover `onDelete`, adicionar `onDeactivate`/`onReactivate`, novo filtro, badge, botão dinâmico |
| `src/views/admin/AdminView.tsx` | Atualizar props do `<UsersPanel>` |
| `src/views/admin/__tests__/useAdminData.test.ts` | Atualizar testes (remover deleteUser, adicionar deactivate/reactivate) |

---

### Task 1: Migration Supabase + tipo `Member`

**Files:**
- Modify: `src/hooks/useSupabase.ts` (interface `Member`)

- [ ] **Step 1: Executar a migration no Supabase Dashboard**

Abrir o Supabase Dashboard → SQL Editor e executar:

```sql
ALTER TABLE members ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```

Verificar que a coluna aparece na tabela `members` com `DEFAULT true`.

- [ ] **Step 2: Adicionar `is_active` ao tipo `Member`**

Abrir `src/hooks/useSupabase.ts`. Localizar a interface `Member` (linha ~13):

```ts
export interface Member {
  id: string
  name: string
  role: string
  avatar: string
  avatar_url?: string | null
  email?: string | null
  auth_user_id?: string | null
  access_role?: 'admin' | 'user'
}
```

Substituir por:

```ts
export interface Member {
  id: string
  name: string
  role: string
  avatar: string
  avatar_url?: string | null
  email?: string | null
  auth_user_id?: string | null
  access_role?: 'admin' | 'user'
  is_active?: boolean
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | head -20
```

Esperado: sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSupabase.ts
git commit -m "feat: :sparkles: adiciona is_active ao tipo Member"
```

---

### Task 2: Atualizar `useAdminData` — remover `deleteUser`, adicionar `deactivateUser`/`reactivateUser`

**Files:**
- Modify: `src/views/admin/hooks/useAdminData.ts`

- [ ] **Step 1: Escrever testes para as novas funções**

Abrir `src/views/admin/__tests__/useAdminData.test.ts`. O arquivo já tem mocks de Supabase. Adicionar um novo `describe` ao final (antes do fechamento do `describe('useAdminData', ...)`):

```ts
describe('deactivateUser', () => {
  it('chama update com is_active: false e retorna true', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin!.from).mockReturnValue({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: updateMock,
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    } as ReturnType<typeof supabaseAdmin.from>)

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.deactivateUser('member-1')
    })

    expect(ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({ is_active: false })
    expect(eqMock).toHaveBeenCalledWith('id', 'member-1')
  })

  it('retorna false quando Supabase falha', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'fail' } })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin!.from).mockReturnValue({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: updateMock,
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    } as ReturnType<typeof supabaseAdmin.from>)

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.deactivateUser('member-1')
    })

    expect(ok).toBe(false)
  })
})

describe('reactivateUser', () => {
  it('chama update com is_active: true e retorna true', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin!.from).mockReturnValue({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: updateMock,
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    } as ReturnType<typeof supabaseAdmin.from>)

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.reactivateUser('member-1')
    })

    expect(ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({ is_active: true })
    expect(eqMock).toHaveBeenCalledWith('id', 'member-1')
  })
})
```

Também adicionar `act` ao import:

```ts
import { renderHook, waitFor, act } from '@testing-library/react'
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
npm run test:run -- src/views/admin/__tests__/useAdminData.test.ts 2>&1 | tail -20
```

Esperado: falha com `result.current.deactivateUser is not a function`.

- [ ] **Step 3: Atualizar `fetchUsers` para incluir `is_active` no select**

Abrir `src/views/admin/hooks/useAdminData.ts`. Localizar `fetchUsers` (linha ~60):

```ts
const { data, error: queryError } = await supabaseAdmin
  .from('members')
  .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
  .order('name')
```

Substituir por:

```ts
const { data, error: queryError } = await supabaseAdmin
  .from('members')
  .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role, is_active')
  .order('name')
```

- [ ] **Step 4: Remover a função `deleteUser`**

Localizar e remover todo o bloco da função `deleteUser` (linhas ~369–387):

```ts
const deleteUser = useCallback(async (userId: string) => {
  if (!supabaseAdmin) return false
  const member = users.find(u => u.id === userId)
  const { error } = await supabaseAdmin.from('members').delete().eq('id', userId)
  if (error) return false
  if (member?.auth_user_id) {
    await supabaseAdmin.auth.admin.deleteUser(member.auth_user_id)
  }
  try {
    setError(null)
    await fetchUsers()
    await fetchPendingUsers()
    await reloadAppStores()
    return true
  } catch (err) {
    setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
    return false
  }
}, [users, fetchUsers, fetchPendingUsers, reloadAppStores])
```

- [ ] **Step 5: Adicionar `deactivateUser` e `reactivateUser`**

Após a função `updateUser` (linha ~367), antes de `listGoogleUsers`, adicionar:

```ts
const deactivateUser = useCallback(async (userId: string) => {
  if (!supabaseAdmin) return false
  const { error } = await supabaseAdmin
    .from('members')
    .update({ is_active: false })
    .eq('id', userId)
  if (error) return false
  try {
    setError(null)
    await fetchUsers()
    await reloadAppStores()
    return true
  } catch (err) {
    setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
    return false
  }
}, [fetchUsers, reloadAppStores])

const reactivateUser = useCallback(async (userId: string) => {
  if (!supabaseAdmin) return false
  const { error } = await supabaseAdmin
    .from('members')
    .update({ is_active: true })
    .eq('id', userId)
  if (error) return false
  try {
    setError(null)
    await fetchUsers()
    await reloadAppStores()
    return true
  } catch (err) {
    setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
    return false
  }
}, [fetchUsers, reloadAppStores])
```

- [ ] **Step 6: Atualizar o `return` do hook**

Localizar o `return` final (linha ~413). Substituir:

```ts
return {
  clients, users, auditLogs, loading, loadingInitial, error, userClientsMap, pendingUsers,
  refreshAll,
  fetchAuditLogs, fetchClients, fetchUsers,
  createClient, updateClient, deleteClient,
  linkUserToClient, unlinkUserFromClient, setUserRole,
  createUser, setUserAuthId, updateUser, deleteUser, listGoogleUsers,
}
```

Por:

```ts
return {
  clients, users, auditLogs, loading, loadingInitial, error, userClientsMap, pendingUsers,
  refreshAll,
  fetchAuditLogs, fetchClients, fetchUsers,
  createClient, updateClient, deleteClient,
  linkUserToClient, unlinkUserFromClient, setUserRole,
  createUser, setUserAuthId, updateUser, deactivateUser, reactivateUser, listGoogleUsers,
}
```

- [ ] **Step 7: Rodar os testes novamente**

```bash
npm run test:run -- src/views/admin/__tests__/useAdminData.test.ts 2>&1 | tail -20
```

Esperado: todos os testes passam (os 3 novos + os 3 existentes = 6 total).

- [ ] **Step 8: Commit**

```bash
git add src/views/admin/hooks/useAdminData.ts src/views/admin/__tests__/useAdminData.test.ts
git commit -m "feat: :sparkles: substitui deleteUser por deactivateUser e reactivateUser"
```

---

### Task 3: Atualizar `AdminView` — trocar props do `<UsersPanel>`

**Files:**
- Modify: `src/views/admin/AdminView.tsx`

- [ ] **Step 1: Atualizar a desestruturação do hook**

Abrir `src/views/admin/AdminView.tsx`. Localizar a desestruturação do `useAdminData` (linha ~29):

```ts
createUser, setUserAuthId, updateUser, deleteUser, listGoogleUsers,
```

Substituir por:

```ts
createUser, setUserAuthId, updateUser, deactivateUser, reactivateUser, listGoogleUsers,
```

- [ ] **Step 2: Atualizar as props do `<UsersPanel>`**

Localizar o `<UsersPanel>` (linha ~130):

```tsx
onListGoogleUsers={listGoogleUsers}
onDelete={deleteUser}
userClientsMap={userClientsMap}
```

Substituir por:

```tsx
onListGoogleUsers={listGoogleUsers}
onDeactivate={deactivateUser}
onReactivate={reactivateUser}
userClientsMap={userClientsMap}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | head -20
```

Esperado: erros de TypeScript em `UsersPanel.tsx` sobre `onDelete` não reconhecida (ainda não atualizada) — isso é esperado, será resolvido na Task 4. Se houver outros erros, corrigir.

- [ ] **Step 4: Commit parcial (stash se build falhar)**

Se o build tiver apenas erros relativos ao `UsersPanel` (prop `onDelete` desconhecida), continuar. Caso contrário, corrigir antes.

```bash
git add src/views/admin/AdminView.tsx
git commit -m "feat: :construction: passa onDeactivate e onReactivate para UsersPanel"
```

---

### Task 4: Atualizar `UsersPanel` — props, filtro, badge e botão do drawer

**Files:**
- Modify: `src/views/admin/components/UsersPanel.tsx`

- [ ] **Step 1: Atualizar imports de ícones**

Localizar a linha de imports do Lucide (linha ~19):

```ts
import { Plus, Building, Check, Search, UserCheck, ChevronLeft, ChevronRight, Key, Clock, Mail, Link2, Trash2 } from 'lucide-react'
```

Substituir por (remover `Trash2`, adicionar `UserX`):

```ts
import { Plus, Building, Check, Search, UserCheck, ChevronLeft, ChevronRight, Key, Clock, Mail, Link2, UserX } from 'lucide-react'
```

- [ ] **Step 2: Atualizar a interface `UsersPanelProps`**

Localizar a interface (linha ~28). Substituir:

```ts
onDelete: (userId: string) => Promise<boolean>
```

Por:

```ts
onDeactivate: (userId: string) => Promise<boolean>
onReactivate: (userId: string) => Promise<boolean>
```

- [ ] **Step 3: Atualizar `StatusFilter` e parâmetros do componente**

Localizar (linha ~148):

```ts
type StatusFilter = 'all' | 'active' | 'pending'
```

Substituir por:

```ts
type StatusFilter = 'all' | 'active' | 'pending' | 'deactivated'
```

Localizar a desestruturação (linha ~152):

```ts
export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, onCreate, onUpdate, onSetAuthId, onListGoogleUsers, onDelete, userClientsMap, pendingUsers
}: UsersPanelProps) {
```

Substituir por:

```ts
export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, onCreate, onUpdate, onSetAuthId, onListGoogleUsers, onDeactivate, onReactivate, userClientsMap, pendingUsers
}: UsersPanelProps) {
```

- [ ] **Step 4: Substituir estados de deleção por estados de ativação**

Localizar (linha ~165):

```ts
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [deletingUser, setDeletingUser] = useState(false)
```

Substituir por:

```ts
const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
const [togglingActive, setTogglingActive] = useState(false)
```

- [ ] **Step 5: Atualizar `filteredUsers` para tratar `is_active`**

Localizar o bloco de filtros em `filteredUsers` (linha ~215):

```ts
let filtered = users

if (statusFilter === 'active') {
  filtered = filtered.filter(u => !!u.auth_user_id)
} else if (statusFilter === 'pending') {
  filtered = filtered.filter(u => !u.auth_user_id)
}
```

Substituir por:

```ts
let filtered = users

if (statusFilter === 'deactivated') {
  filtered = filtered.filter(u => u.is_active === false)
} else {
  // Todos os outros filtros excluem desativados por padrão
  filtered = filtered.filter(u => u.is_active !== false)
  if (statusFilter === 'active') {
    filtered = filtered.filter(u => !!u.auth_user_id)
  } else if (statusFilter === 'pending') {
    filtered = filtered.filter(u => !u.auth_user_id)
  }
}
```

- [ ] **Step 6: Adicionar handler `handleDeactivateUser` e `handleReactivateUser`**

Localizar o handler `handleDeleteUser` (se existir) e substituí-lo. Caso não exista, adicionar após `handleUpdateUser`. Os dois handlers novos:

```ts
const handleDeactivateUser = async () => {
  if (!editingUser) return
  setTogglingActive(true)
  const ok = await onDeactivate(editingUser.id)
  setTogglingActive(false)
  if (ok) {
    toast.success(`Utilizador "${editingUser.name}" desativado`)
    setShowDeactivateConfirm(false)
    resetEditState()
  } else {
    toast.error('Erro ao desativar utilizador')
    setShowDeactivateConfirm(false)
  }
}

const handleReactivateUser = async () => {
  if (!editingUser) return
  setTogglingActive(true)
  const ok = await onReactivate(editingUser.id)
  setTogglingActive(false)
  if (ok) {
    toast.success(`Utilizador "${editingUser.name}" reativado`)
    setShowReactivateConfirm(false)
    resetEditState()
  } else {
    toast.error('Erro ao reativar utilizador')
    setShowReactivateConfirm(false)
  }
}
```

- [ ] **Step 7: Adicionar botão de filtro "Desativados" na barra de filtros**

Procurar o grupo de filtros do tab Membros, onde estão os botões "Todos", "Ativos" e "Sem acesso". Localizar o botão "Sem acesso" (último botão do grupo):

```tsx
<button
  onClick={() => { setStatusFilter('pending'); setPage(1) }}
  ...
>
  <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
  Sem acesso
</button>
```

Adicionar **após** esse botão:

```tsx
<button
  onClick={() => { setStatusFilter('deactivated'); setPage(1) }}
  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
    statusFilter === 'deactivated'
      ? 'bg-background shadow-sm font-medium'
      : 'hover:bg-background/50 text-muted-foreground'
  }`}
>
  <UserX className="w-3.5 h-3.5 text-gray-500" />
  Desativados
</button>
```

- [ ] **Step 8: Adicionar badge "Desativado" no card do member**

Localizar onde o nome do usuário é renderizado no card (dentro do `paginatedUsers.map`). Procurar por `u.name` no JSX do card. Após o elemento que exibe o nome, adicionar a badge condicional:

```tsx
{u.is_active === false && (
  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
    Desativado
  </span>
)}
```

- [ ] **Step 9: Atualizar o `DrawerFooter` do drawer de edição**

Localizar o `DrawerFooter` do drawer de edição. Substituir o botão "Excluir" existente:

```tsx
<DrawerFooter className="flex-row justify-between gap-2">
  <Button
    variant="destructive"
    size="sm"
    onClick={() => setShowDeleteConfirm(true)}
    disabled={savingEdit || deletingUser}
  >
    <Trash2 className="w-4 h-4 mr-1" />
    Excluir
  </Button>
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => closeEditDrawer()} disabled={savingEdit || deletingUser}>Cancelar</Button>
    <Button onClick={handleUpdateUser} isLoading={savingEdit} disabled={deletingUser}>Guardar</Button>
  </div>
</DrawerFooter>
```

Por:

```tsx
<DrawerFooter className="flex-row justify-between gap-2">
  {editingUser?.is_active !== false ? (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setShowDeactivateConfirm(true)}
      disabled={savingEdit || togglingActive}
    >
      <UserX className="w-4 h-4 mr-1" />
      Desativar
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowReactivateConfirm(true)}
      disabled={savingEdit || togglingActive}
    >
      <UserCheck className="w-4 h-4 mr-1" />
      Reativar
    </Button>
  )}
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => closeEditDrawer()} disabled={savingEdit || togglingActive}>Cancelar</Button>
    <Button onClick={handleUpdateUser} isLoading={savingEdit} disabled={togglingActive}>Guardar</Button>
  </div>
</DrawerFooter>
```

- [ ] **Step 10: Substituir o ConfirmModal de deleção pelos dois novos modals**

Localizar o `ConfirmModal` de deleção:

```tsx
{showDeleteConfirm && editingUser && (
  <ConfirmModal
    title="Excluir utilizador?"
    message={...}
    confirmLabel="Excluir"
    cancelLabel="Cancelar"
    onConfirm={handleDeleteUser}
    onCancel={() => setShowDeleteConfirm(false)}
  />
)}
```

Substituir por:

```tsx
{showDeactivateConfirm && editingUser && (
  <ConfirmModal
    title="Desativar utilizador?"
    message={`O membro "${editingUser.name}" perderá o acesso à plataforma. As tasks e steps associadas serão preservadas. Esta ação pode ser revertida.`}
    confirmLabel="Desativar"
    cancelLabel="Cancelar"
    onConfirm={handleDeactivateUser}
    onCancel={() => setShowDeactivateConfirm(false)}
  />
)}
{showReactivateConfirm && editingUser && (
  <ConfirmModal
    title="Reativar utilizador?"
    message={`O membro "${editingUser.name}" voltará a ter acesso à plataforma.`}
    confirmLabel="Reativar"
    cancelLabel="Cancelar"
    onConfirm={handleReactivateUser}
    onCancel={() => setShowReactivateConfirm(false)}
  />
)}
```

- [ ] **Step 11: Verificar build e lint**

```bash
npm run build 2>&1 | head -20
npm run lint 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 12: Rodar todos os testes**

```bash
npm run test:run 2>&1 | tail -20
```

Esperado: todos passam.

- [ ] **Step 13: Commit**

```bash
git add src/views/admin/components/UsersPanel.tsx
git commit -m "feat: :sparkles: adiciona desativação/reativação de usuário no UsersPanel"
```

---

### Task 5: Verificação manual

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

- [ ] **Step 2: Testar fluxo de desativação**

1. Acessar AdminView → aba Usuários → tab "Membros"
2. Clicar em um card de usuário → drawer abre
3. Verificar que o botão "Desativar" (vermelho, ícone `UserX`) aparece no canto inferior esquerdo
4. Clicar "Desativar" → modal de confirmação deve aparecer com mensagem sobre preservação de tasks
5. Confirmar → usuário desaparece da lista (filtro padrão é "Todos" = apenas ativos)
6. Toast de sucesso aparece

- [ ] **Step 3: Testar filtro "Desativados"**

1. Na mesma tela, clicar no filtro "Desativados"
2. O usuário recém-desativado deve aparecer com badge cinza "Desativado"
3. Clicar no card → drawer abre com botão "Reativar" (outline, ícone `UserCheck`)
4. Confirmar reativação → usuário desaparece do filtro "Desativados"
5. Voltar ao filtro "Todos" → usuário aparece novamente sem badge

- [ ] **Step 4: Verificar que tasks/steps do usuário desativado não foram afetadas**

Acessar DashboardView e confirmar que as tasks com o membro desativado como responsável ainda exibem o nome corretamente.

- [ ] **Step 5: Commit final se tudo estiver ok**

```bash
git add .
git commit -m "chore: :white_check_mark: verificação manual da desativação de usuários"
```
