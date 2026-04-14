import { describe, it, expect, vi } from 'vitest'
import { render, screen, createContext } from '@testing-library/react'
import { AdminView } from '../AdminView'
import type { ReactNode } from 'react'
import type { AuthContextValue } from '@/contexts/AuthContext'
import * as AuthContextModule from '@/contexts/AuthContext'

const mockContextValue: AuthContextValue = {
  session: null,
  user: null,
  member: { id: 'admin-1', name: 'Admin User' } as never,
  clients: [],
  isAdmin: true,
  impersonatedClientId: null,
  setImpersonatedClientId: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  authError: null,
  loading: false,
  refreshProfile: vi.fn(),
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: null,
}))

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext')
  return {
    ...actual,
    useAuthContext: () => mockContextValue,
  }
})

describe('AdminView — sem supabaseAdmin', () => {
  it('renderiza ViewState de configuração necessária', () => {
    render(<AdminView />)
    expect(screen.getByText('Configuração necessária')).toBeInTheDocument()
  })
})