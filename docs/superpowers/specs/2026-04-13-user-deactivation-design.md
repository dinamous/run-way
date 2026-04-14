# Spec: Desativação de Usuários (Soft Delete)

**Data:** 2026-04-13  
**Branch:** feature/briefing-tools  
**Status:** aprovado

## Problema

O botão "Excluir" na AdminView deletava o member permanentemente do banco, junto com o usuário da Supabase Auth. Isso tornava impossível preservar o histórico de tasks e steps onde o usuário era responsável. A solução é substituir a exclusão permanente por uma desativação reversível.

## Decisões de design

- Sem tocar na conta Google (auth_user_id permanece no member)
- Usuários desativados somem das listas padrão e só aparecem no filtro "Desativados"
- Badge "Desativado" aparece no card apenas quando o filtro "Desativados" está ativo
- Reativação pelo mesmo drawer de edição (botão troca de label conforme estado)
- `deleteUser` permanente é removido do hook e da UI

## Modelo de Dados

### Migration Supabase

```sql
ALTER TABLE members ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```

Todos os members existentes ficam ativos (`true`) por padrão.

### Tipo `Member` (`src/hooks/useSupabase.ts`)

Adicionar campo:

```ts
is_active?: boolean
```

### `fetchUsers` em `useAdminData`

A query continua retornando todos os members (ativos e desativados). O filtro por `is_active` é feito no front para permitir listar desativados no painel admin.

```ts
.select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role, is_active')
```

## Hook `useAdminData`

### Remover

- Função `deleteUser`
- Export de `deleteUser` no `return`

### Adicionar

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

Ambas exposta no `return` do hook.

## Componente `UsersPanel`

### Interface `UsersPanelProps`

- Remover: `onDelete: (userId: string) => Promise<boolean>`
- Adicionar:
  ```ts
  onDeactivate: (userId: string) => Promise<boolean>
  onReactivate: (userId: string) => Promise<boolean>
  ```

### Filtros do tab Membros

De: `Todos / Ativos / Sem acesso`  
Para: `Todos / Ativos / Sem acesso / Desativados`

- **Todos, Ativos, Sem acesso** — filtram apenas `is_active = true`
- **Desativados** — filtra `is_active = false`

### Badge no card

Quando `is_active = false`, exibir tag cinza `"Desativado"` ao lado do nome do member (visível apenas no filtro "Desativados").

### DrawerFooter do drawer de edição

Botão à esquerda dinâmico:

```tsx
{editingUser?.is_active !== false ? (
  <Button variant="destructive" size="sm" onClick={() => setShowDeactivateConfirm(true)} disabled={savingEdit}>
    <UserX className="w-4 h-4 mr-1" />
    Desativar
  </Button>
) : (
  <Button variant="outline" size="sm" onClick={() => setShowReactivateConfirm(true)} disabled={savingEdit}>
    <UserCheck className="w-4 h-4 mr-1" />
    Reativar
  </Button>
)}
```

### ConfirmModals

**Desativar:**
- Título: `"Desativar utilizador?"`
- Mensagem: `"O membro "${name}" perderá o acesso à plataforma. As tasks e steps associadas serão preservadas. Esta ação pode ser revertida."`
- Botão: `"Desativar"`

**Reativar:**
- Título: `"Reativar utilizador?"`
- Mensagem: `"O membro "${name}" voltará a ter acesso à plataforma."`
- Botão: `"Reativar"`

### Remover

- Estado `showDeleteConfirm` e `deletingUser`
- Handler `handleDeleteUser`
- Import de `Trash2` (se não usado em outro lugar)
- ConfirmModal de deleção

### Adicionar estados

```ts
const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
const [togglingActive, setTogglingActive] = useState(false)
```

### Adicionar handlers

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

## `AdminView.tsx`

- Remover: `onDelete={deleteUser}` de `<UsersPanel>`
- Adicionar: `onDeactivate={deactivateUser}` e `onReactivate={reactivateUser}`

## Testes (`useAdminData.test.ts`)

Remover testes de `deleteUser`. Adicionar:

| Teste | Cenário |
|---|---|
| `deactivateUser` | Atualiza `is_active: false`, retorna `true` |
| `deactivateUser` | Retorna `false` quando Supabase falha |
| `reactivateUser` | Atualiza `is_active: true`, retorna `true` |

## Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `src/hooks/useSupabase.ts` | Adicionar `is_active?: boolean` ao tipo `Member` |
| `src/views/admin/hooks/useAdminData.ts` | Remover `deleteUser`, adicionar `deactivateUser` e `reactivateUser` + select com `is_active` |
| `src/views/admin/components/UsersPanel.tsx` | Remover prop `onDelete`, adicionar `onDeactivate`/`onReactivate`, novo filtro, badge, botão dinâmico no drawer |
| `src/views/admin/AdminView.tsx` | Atualizar props passadas ao `<UsersPanel>` |
| `src/views/admin/hooks/__tests__/useAdminData.test.ts` | Atualizar testes |
| Supabase Dashboard | Migration: `ALTER TABLE members ADD COLUMN is_active boolean NOT NULL DEFAULT true` |
