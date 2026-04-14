# Admin UsersPanel Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir bug de atualização da lista de pendentes após vincular, renomear filtro ambíguo "Pendentes" para "Sem acesso", e adicionar funcionalidade de deleção de usuário (member + auth user) na AdminView.

**Architecture:** Três mudanças independentes e cirúrgicas no hook `useAdminData` e no componente `UsersPanel`. O hook recebe a função `deleteUser` e o fix no `setUserAuthId`. O componente recebe a nova prop `onDelete`, o label renomeado e o botão de deleção no drawer de edição. O `AdminView` passa a nova prop.

**Tech Stack:** React 19, TypeScript, Supabase (supabaseAdmin com service role), Tailwind CSS 4, Lucide icons, Sonner (toasts)

---

## Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `src/views/admin/hooks/useAdminData.ts` | Fix em `setUserAuthId` (chamar `fetchPendingUsers`) + nova função `deleteUser` |
| `src/views/admin/components/UsersPanel.tsx` | Label "Pendentes"→"Sem acesso" + prop `onDelete` + botão Excluir + ConfirmModal de deleção |
| `src/views/admin/AdminView.tsx` | Passar `onDelete={deleteUser}` para `<UsersPanel>` |
| `src/views/admin/hooks/__tests__/useAdminData.test.ts` | Testes unitários para `deleteUser` e o fix de `setUserAuthId` |

---

### Task 1: Fix bug — `setUserAuthId` não atualiza `pendingUsers`

**Files:**
- Modify: `src/views/admin/hooks/useAdminData.ts` (função `setUserAuthId`, bloco try após o update)

- [ ] **Step 1: Localizar o bloco de refresh em `setUserAuthId`**

Abrir `src/views/admin/hooks/useAdminData.ts`. Encontrar a função `setUserAuthId` (por volta da linha 326). O bloco `try` após o update tem:

```ts
try {
  setError(null)
  await fetchUsers()
  await reloadAppStores()
  return true
}
```

- [ ] **Step 2: Adicionar `fetchPendingUsers()` ao bloco de refresh**

Substituir o bloco acima por:

```ts
try {
  setError(null)
  await fetchUsers()
  await fetchPendingUsers()
  await reloadAppStores()
  return true
}
```

- [ ] **Step 3: Verificar que `fetchPendingUsers` está nas deps do `useCallback` de `setUserAuthId`**

A assinatura atual é:
```ts
}, [fetchUsers, reloadAppStores])
```

Atualizar para:
```ts
}, [fetchUsers, fetchPendingUsers, reloadAppStores])
```

- [ ] **Step 4: Testar manualmente**

```
npm run dev
```
1. Abrir AdminView → aba Usuários → tab "Pendentes"
2. Clicar "Vincular" em um usuário pendente
3. Selecionar um member → clicar "Vincular"
4. Verificar que o card do usuário pendente **desaparece da lista imediatamente** sem F5

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/hooks/useAdminData.ts
git commit -m "fix: :bug: atualiza lista de pendentes após vincular member"
```

---

### Task 2: Renomear filtro "Pendentes" → "Sem acesso" no tab Membros

**Files:**
- Modify: `src/views/admin/components/UsersPanel.tsx` (botão de filtro `statusFilter === 'pending'` dentro do tab members)

- [ ] **Step 1: Localizar o botão de filtro "Pendentes" dentro do tab Membros**

Abrir `src/views/admin/components/UsersPanel.tsx`. Procurar o trecho (por volta da linha 545) onde `currentTab === 'members'` é verificado e o segundo grupo de filtros é renderizado. O botão tem:

```tsx
<button
  onClick={() => { setStatusFilter('pending'); setPage(1) }}
  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
    statusFilter === 'pending'
      ? 'bg-background shadow-sm font-medium'
      : 'hover:bg-background/50 text-muted-foreground'
  }`}
>
  <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
  Pendentes
</button>
```

- [ ] **Step 2: Alterar o label do botão**

Substituir `Pendentes` pelo texto `Sem acesso` dentro desse botão específico. O resultado deve ser:

```tsx
<button
  onClick={() => { setStatusFilter('pending'); setPage(1) }}
  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
    statusFilter === 'pending'
      ? 'bg-background shadow-sm font-medium'
      : 'hover:bg-background/50 text-muted-foreground'
  }`}
>
  <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
  Sem acesso
</button>
```

> Atenção: NÃO alterar o botão do tab "Pendentes" (que usa `currentTab === 'pending'`) — apenas o filtro dentro do tab Membros.

- [ ] **Step 3: Verificar visualmente**

```
npm run dev
```
1. AdminView → aba Usuários → tab "Membros"
2. Confirmar que os filtros mostram: **Todos / Ativos / Sem acesso**
3. Confirmar que o tab superior ainda mostra: **Membros / Pendentes (N)**
4. Confirmar que o filtro "Sem acesso" filtra corretamente members sem `auth_user_id`

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/components/UsersPanel.tsx
git commit -m "fix: :label: renomeia filtro 'Pendentes' para 'Sem acesso' no tab Membros"
```

---

### Task 3: Adicionar `deleteUser` no hook `useAdminData`

**Files:**
- Modify: `src/views/admin/hooks/useAdminData.ts`

- [ ] **Step 1: Escrever a função `deleteUser`**

Adicionar após a função `updateUser` (por volta da linha 366), antes de `listGoogleUsers`:

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

- [ ] **Step 2: Expor `deleteUser` no retorno do hook**

Localizar o `return` do hook (linha ~392). Adicionar `deleteUser` à lista de exports:

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

- [ ] **Step 3: Verificar tipagem**

```bash
npm run build 2>&1 | head -30
```

Não deve haver erros de TypeScript relacionados ao `deleteUser`.

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/hooks/useAdminData.ts
git commit -m "feat: :sparkles: adiciona deleteUser ao useAdminData"
```

---

### Task 4: Adicionar UI de deleção no `UsersPanel`

**Files:**
- Modify: `src/views/admin/components/UsersPanel.tsx`

- [ ] **Step 1: Adicionar `Trash2` aos imports do Lucide**

Localizar a linha de imports do Lucide (linha ~19):

```ts
import { Plus, Building, Check, Search, UserCheck, ChevronLeft, ChevronRight, Key, Clock, Mail, Link2 } from 'lucide-react'
```

Adicionar `Trash2`:

```ts
import { Plus, Building, Check, Search, UserCheck, ChevronLeft, ChevronRight, Key, Clock, Mail, Link2, Trash2 } from 'lucide-react'
```

- [ ] **Step 2: Adicionar `onDelete` à interface `UsersPanelProps`**

Localizar a interface `UsersPanelProps` (linha ~28). Adicionar após `onListGoogleUsers`:

```ts
onDelete: (userId: string) => Promise<boolean>
```

- [ ] **Step 3: Desestruturar `onDelete` nos parâmetros do componente**

Localizar a linha ~150:

```ts
export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, onCreate, onUpdate, onSetAuthId, onListGoogleUsers, userClientsMap, pendingUsers
}: UsersPanelProps) {
```

Adicionar `onDelete`:

```ts
export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, onCreate, onUpdate, onSetAuthId, onListGoogleUsers, onDelete, userClientsMap, pendingUsers
}: UsersPanelProps) {
```

- [ ] **Step 4: Adicionar estado `showDeleteConfirm`**

Logo após a declaração de `showDiscardConfirm` (linha ~163):

```ts
const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [deletingUser, setDeletingUser] = useState(false)
```

- [ ] **Step 5: Adicionar handler `handleDeleteUser`**

Adicionar após `handleUpdateUser` (após a linha ~458):

```ts
const handleDeleteUser = async () => {
  if (!editingUser) return
  setDeletingUser(true)
  const ok = await onDelete(editingUser.id)
  setDeletingUser(false)
  if (ok) {
    toast.success(`Utilizador "${editingUser.name}" excluído`)
    setShowDeleteConfirm(false)
    resetEditState()
  } else {
    toast.error('Erro ao excluir utilizador')
    setShowDeleteConfirm(false)
  }
}
```

- [ ] **Step 6: Atualizar o `DrawerFooter` do drawer de edição**

Localizar o `DrawerFooter` do drawer de edição (linha ~1164):

```tsx
<DrawerFooter className="flex-row justify-end gap-2">
  <Button variant="outline" onClick={() => closeEditDrawer()} disabled={savingEdit}>Cancelar</Button>
  <Button onClick={handleUpdateUser} isLoading={savingEdit}>Guardar</Button>
</DrawerFooter>
```

Substituir por:

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

- [ ] **Step 7: Adicionar `ConfirmModal` de deleção**

Logo antes do `ConfirmModal` existente de discard (linha ~1268), adicionar:

```tsx
{showDeleteConfirm && editingUser && (
  <ConfirmModal
    title="Excluir utilizador?"
    message={
      editingUser.auth_user_id
        ? `Esta ação é irreversível. O membro "${editingUser.name}" e a conta Google vinculada serão permanentemente excluídos.`
        : `Esta ação é irreversível. O membro "${editingUser.name}" será permanentemente excluído.`
    }
    confirmLabel="Excluir"
    cancelLabel="Cancelar"
    onConfirm={handleDeleteUser}
    onCancel={() => setShowDeleteConfirm(false)}
  />
)}
```

- [ ] **Step 8: Testar manualmente**

```
npm run dev
```
1. AdminView → aba Usuários → tab "Membros"
2. Clicar em um card de usuário para abrir o drawer de edição
3. Verificar que o botão "Excluir" aparece no canto inferior esquerdo (vermelho)
4. Clicar em "Excluir" → deve aparecer o modal de confirmação com mensagem correta
5. Confirmar → usuário deve desaparecer da lista; toast de sucesso
6. Testar com usuário que tem `auth_user_id` — mensagem do modal deve mencionar "conta Google vinculada"
7. Testar com usuário sem `auth_user_id` — mensagem não deve mencionar Google

- [ ] **Step 9: Commit**

```bash
git add src/views/admin/components/UsersPanel.tsx
git commit -m "feat: :sparkles: adiciona botão de excluir usuário no drawer de edição"
```

---

### Task 5: Passar `onDelete` para `UsersPanel` no `AdminView`

**Files:**
- Modify: `src/views/admin/AdminView.tsx`

- [ ] **Step 1: Localizar `<UsersPanel>` em `AdminView.tsx`**

Abrir `src/views/admin/AdminView.tsx`. Encontrar onde `<UsersPanel>` é renderizado com suas props.

- [ ] **Step 2: Adicionar a prop `onDelete`**

Adicionar `onDelete={deleteUser}` às props existentes de `<UsersPanel>`. Exemplo (mantendo as props já existentes):

```tsx
<UsersPanel
  users={users}
  clients={clients}
  onSetRole={setUserRole}
  onLink={linkUserToClient}
  onUnlink={unlinkUserFromClient}
  onCreate={createUser}
  onUpdate={updateUser}
  onSetAuthId={setUserAuthId}
  onListGoogleUsers={listGoogleUsers}
  onDelete={deleteUser}
  userClientsMap={userClientsMap}
  pendingUsers={pendingUsers}
/>
```

- [ ] **Step 3: Verificar build sem erros de TypeScript**

```bash
npm run build 2>&1 | head -30
```

Esperado: sem erros. Se houver erro de prop faltando ou tipo incorreto, corrigir antes de continuar.

- [ ] **Step 4: Testar lint**

```bash
npm run lint 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Step 5: Commit final**

```bash
git add src/views/admin/AdminView.tsx
git commit -m "feat: :construction: conecta onDelete ao UsersPanel na AdminView"
```

---

### Task 6: Testes unitários para `deleteUser` e fix de `setUserAuthId`

**Files:**
- Create: `src/views/admin/hooks/__tests__/useAdminData.test.ts`

> Os testes cobrem as duas funções alteradas/criadas no hook. Como `useAdminData` depende do `supabaseAdmin` (client externo), o Supabase é mockado com `vi.mock`.

- [ ] **Step 1: Criar arquivo de teste**

Criar `src/views/admin/hooks/__tests__/useAdminData.test.ts` com o seguinte conteúdo:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock do supabaseAdmin antes de importar o hook
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
      },
    },
  },
}))

// Mock das stores para evitar erros de contexto
vi.mock('@/store/useTaskStore', () => ({
  useTaskStore: (selector: (s: { invalidate: () => void; fetchTasks: () => Promise<void> }) => unknown) =>
    selector({ invalidate: vi.fn(), fetchTasks: vi.fn() }),
}))
vi.mock('@/store/useMemberStore', () => ({
  useMemberStore: (selector: (s: { invalidate: () => void; fetchMembers: () => Promise<void> }) => unknown) =>
    selector({ invalidate: vi.fn(), fetchMembers: vi.fn() }),
}))
vi.mock('@/store/useClientStore', () => ({
  useClientStore: (selector: (s: { selectedClientId: string | null }) => unknown) =>
    selector({ selectedClientId: null }),
}))

import { useAdminData } from '../useAdminData'
import { supabaseAdmin } from '@/lib/supabase'

// Helper para criar mock de query chain do Supabase
function makeQueryMock(returnValue: { data?: unknown; error?: unknown }) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(returnValue),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
  }
  return mock
}

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup padrão: fetches iniciais retornam listas vazias
    const emptyQuery = makeQueryMock({ data: [], error: null })
    vi.mocked(supabaseAdmin!.from).mockReturnValue(emptyQuery as ReturnType<typeof supabaseAdmin.from>)
    vi.mocked(supabaseAdmin!.auth.admin.listUsers).mockResolvedValue({
      data: { users: [], aud: '' },
      error: null,
    } as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.listUsers>>)
  })

  describe('deleteUser', () => {
    it('deleta o member e retorna true quando não há auth_user_id', async () => {
      const deleteQuery = makeQueryMock({ data: null, error: null })
      vi.mocked(supabaseAdmin!.from).mockReturnValue(deleteQuery as ReturnType<typeof supabaseAdmin.from>)

      const { result } = renderHook(() => useAdminData())

      let ok: boolean | undefined
      await act(async () => {
        ok = await result.current.deleteUser('member-1')
      })

      expect(ok).toBe(true)
      expect(supabaseAdmin!.auth.admin.deleteUser).not.toHaveBeenCalled()
    })

    it('deleta o member E o auth user quando auth_user_id está presente', async () => {
      // Simular que `users` contém um member com auth_user_id
      const membersQuery = makeQueryMock({ data: [{ id: 'member-1', name: 'Test', role: 'Designer', avatar: 'T', auth_user_id: 'auth-uuid-1', access_role: 'user', email: null, avatar_url: null }], error: null })
      const deleteQuery = makeQueryMock({ data: null, error: null })

      vi.mocked(supabaseAdmin!.from)
        .mockReturnValueOnce(membersQuery as ReturnType<typeof supabaseAdmin.from>) // fetchUsers inicial
        .mockReturnValue(deleteQuery as ReturnType<typeof supabaseAdmin.from>)      // delete + refetches

      vi.mocked(supabaseAdmin!.auth.admin.deleteUser).mockResolvedValue({ data: { user: null as unknown as Parameters<typeof supabaseAdmin.auth.admin.deleteUser>[0] extends string ? never : never }, error: null } as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.deleteUser>>)

      const { result } = renderHook(() => useAdminData())

      // Aguardar o carregamento inicial
      await act(async () => { await new Promise(r => setTimeout(r, 0)) })

      let ok: boolean | undefined
      await act(async () => {
        ok = await result.current.deleteUser('member-1')
      })

      expect(ok).toBe(true)
      expect(supabaseAdmin!.auth.admin.deleteUser).toHaveBeenCalledWith('auth-uuid-1')
    })

    it('retorna false quando a deleção do member falha', async () => {
      const errorQuery = makeQueryMock({ data: null, error: { message: 'delete failed' } })
      vi.mocked(supabaseAdmin!.from).mockReturnValue(errorQuery as ReturnType<typeof supabaseAdmin.from>)

      const { result } = renderHook(() => useAdminData())

      let ok: boolean | undefined
      await act(async () => {
        ok = await result.current.deleteUser('member-1')
      })

      expect(ok).toBe(false)
      expect(supabaseAdmin!.auth.admin.deleteUser).not.toHaveBeenCalled()
    })
  })

  describe('setUserAuthId — atualiza pendingUsers após vincular', () => {
    it('chama listUsers (fetchPendingUsers) após um setUserAuthId bem-sucedido', async () => {
      const updateQuery = makeQueryMock({ data: null, error: null })
      vi.mocked(supabaseAdmin!.from).mockReturnValue(updateQuery as ReturnType<typeof supabaseAdmin.from>)
      vi.mocked(supabaseAdmin!.auth.admin.listUsers).mockResolvedValue({
        data: { users: [], aud: '' },
        error: null,
      } as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.listUsers>>)

      const { result } = renderHook(() => useAdminData())

      const callsBefore = vi.mocked(supabaseAdmin!.auth.admin.listUsers).mock.calls.length

      await act(async () => {
        await result.current.setUserAuthId('member-1', 'auth-uuid-new', null)
      })

      const callsAfter = vi.mocked(supabaseAdmin!.auth.admin.listUsers).mock.calls.length
      expect(callsAfter).toBeGreaterThan(callsBefore)
    })
  })
})
```

- [ ] **Step 2: Rodar os testes para ver se passam**

```bash
npm run test:run -- src/views/admin/hooks/__tests__/useAdminData.test.ts
```

Esperado: todos os testes passam (4 testes no total).

Se houver falha de resolução de módulo (`@/lib/supabase` não encontrado), verificar se o `vitest.config.ts` ou `vite.config.ts` tem o alias `@` configurado. Se não tiver, adicionar ao `vite.config.ts`:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/hooks/__tests__/useAdminData.test.ts
git commit -m "test: :white_check_mark: adiciona testes para deleteUser e fix de setUserAuthId"
```
