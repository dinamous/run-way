import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

interface ClientState {
  selectedClientId: string | null | undefined
  setClient: (id: string | null | undefined) => void
}

export const useClientStore = create<ClientState>()(
  devtools(
    persist(
      (set) => ({
        selectedClientId: undefined,
        setClient: (id) => set({ selectedClientId: id }),
      }),
      {
        name: 'client-store',
        // Não persistir undefined — só string | null
        partialize: (state) =>
          state.selectedClientId !== undefined
            ? { selectedClientId: state.selectedClientId }
            : {},
      }
    ),
    { name: 'app/client', enabled: true }
  )
)
