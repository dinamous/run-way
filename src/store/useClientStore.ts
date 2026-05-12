import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

const CLIENT_BUFF_MS = 4 * 60 * 60 * 1000 // 4 horas

interface ClientState {
  selectedClientId: string | null | undefined
  selectedAt: number | null
  setClient: (id: string | null | undefined) => void
  isClientBuffValid: () => boolean
}

export const useClientStore = create<ClientState>()(
  devtools(
    persist(
      (set, get) => ({
        selectedClientId: undefined,
        selectedAt: null,
        setClient: (id) => set({ selectedClientId: id, selectedAt: id ? Date.now() : null }),
        isClientBuffValid: () => {
          const { selectedAt } = get()
          if (!selectedAt) return false
          return Date.now() - selectedAt < CLIENT_BUFF_MS
        },
      }),
      {
        name: 'client-store',
        partialize: (state) =>
          state.selectedClientId !== undefined
            ? { selectedClientId: state.selectedClientId, selectedAt: state.selectedAt }
            : {},
      }
    ),
    { name: 'app/client', enabled: true }
  )
)
