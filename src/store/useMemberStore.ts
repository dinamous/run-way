// Stub mantido para compatibilidade de imports.
// O fetch de membros foi migrado para useMembersQuery (TanStack Query).
// Esta store pode ser removida quando todos os call sites forem atualizados.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface MemberStoreState {
  _unused: null
}

export const useMemberStore = create<MemberStoreState>()(
  devtools(
    () => ({ _unused: null }),
    { name: 'app/members', enabled: true }
  )
)
