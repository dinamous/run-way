# Design: Melhorias no UsersPanel (AdminView)

**Data:** 2026-04-13  
**Branch:** feature/briefing-tools  
**Escopo:** `src/views/admin/`

---

## Problema 1 — Bug: lista de pendentes não atualiza após vincular

### Causa raiz
`setUserAuthId` em `useAdminData.ts` chama `fetchUsers()` e `reloadAppStores()` após o update, mas **não chama `fetchPendingUsers()`**. O estado `pendingUsers` permanece desatualizado até o próximo `refreshAll()` (F5).

### Solução
Em `useAdminData.ts`, dentro de `setUserAuthId`, adicionar `fetchPendingUsers()` no bloco de refresh:

```ts
await fetchUsers()
await fetchPendingUsers()   // ← adicionar
await reloadAppStores()
```

**Arquivos:** `src/views/admin/hooks/useAdminData.ts`

---

## Problema 2 — Dois filtros com o mesmo nome "Pendentes"

### Causa raiz
Existem dois controles com label "Pendentes" visíveis simultaneamente:
- Tab "Pendentes" — mostra usuários Google sem member vinculado (`pendingUsers`)
- Filtro "Pendentes" dentro do tab Membros — filtra members sem `auth_user_id`

Mesmo nome, conceitos distintos → confusão.

### Solução
Renomear o botão de filtro dentro do tab Membros de **"Pendentes"** para **"Sem acesso"**. Mantém ícone `Clock`, cor laranja e lógica de filtro intactos. Apenas o label muda.

**Arquivos:** `src/views/admin/components/UsersPanel.tsx`

---

## Problema 3 — Falta de delete de usuário

### Requisito
Admin deve poder deletar um member. A deleção deve:
1. Remover o registro da tabela `members`
2. Se o member tiver `auth_user_id`, deletar também o usuário da Supabase Auth via `supabaseAdmin.auth.admin.deleteUser(auth_user_id)`
3. Atualizar `users`, `pendingUsers` e stores da app

### Hook — `useAdminData.ts`
Nova função `deleteUser(userId: string): Promise<boolean>`:

```ts
const deleteUser = useCallback(async (userId: string) => {
  if (!supabaseAdmin) return false
  // 1. Buscar auth_user_id antes de deletar
  const member = users.find(u => u.id === userId)
  // 2. Deletar member
  const { error } = await supabaseAdmin.from('members').delete().eq('id', userId)
  if (error) return false
  // 3. Deletar auth user se vinculado
  if (member?.auth_user_id) {
    await supabaseAdmin.auth.admin.deleteUser(member.auth_user_id)
  }
  // 4. Refresh
  await fetchUsers()
  await fetchPendingUsers()
  await reloadAppStores()
  return true
}, [users, fetchUsers, fetchPendingUsers, reloadAppStores])
```

Expor `deleteUser` no retorno do hook.

### UI — `UsersPanel.tsx`

**Props:** adicionar `onDelete: (userId: string) => Promise<boolean>` à interface `UsersPanelProps`.

**Estado local:** `showDeleteConfirm: boolean` (controla o `ConfirmModal` de confirmação de deleção).

**Drawer de edição (`editDrawerOpen`):**
- `DrawerFooter` passa a ter layout `justify-between`
- Lado esquerdo: botão "Excluir" (`variant="destructive"`, ícone `Trash2`) — desabilitado enquanto `savingEdit`
- Lado direito: botões existentes Cancelar / Guardar

**Fluxo de deleção:**
1. Clique em "Excluir" → `setShowDeleteConfirm(true)`
2. `ConfirmModal` exibe: título "Excluir utilizador?", mensagem avisando que a ação é irreversível e que a conta Google também será deletada se vinculada
3. Confirmar → chama `onDelete(editingUser.id)`, fecha drawer com `resetEditState()` em caso de sucesso
4. Cancelar → fecha modal, drawer permanece aberto

### AdminView — `AdminView.tsx`
Passar `deleteUser` do hook como prop `onDelete` para `<UsersPanel>`.

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/views/admin/hooks/useAdminData.ts` | Bug fix em `setUserAuthId` + nova função `deleteUser` |
| `src/views/admin/components/UsersPanel.tsx` | Label "Pendentes"→"Sem acesso" + prop `onDelete` + botão Excluir + ConfirmModal |
| `src/views/admin/AdminView.tsx` | Passar `onDelete={deleteUser}` para `UsersPanel` |
