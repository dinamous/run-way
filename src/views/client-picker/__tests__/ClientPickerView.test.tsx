import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientPickerView } from '../ClientPickerView'
import type { ClientOption } from '@/contexts/AuthContext'

const mockClients: ClientOption[] = [
  { id: '1', name: 'Acme Corp' },
  { id: '2', name: 'Beta Inc' },
  { id: '3', name: 'Gamma Ltd' },
]

describe('ClientPickerView', () => {
  it('exibe saudação e cards quando há múltiplos clientes', () => {
    render(
      <ClientPickerView
        userName="João Silva"
        clients={mockClients}
        onSelectClient={vi.fn()}
      />
    )
    expect(screen.getByText(/Bem-vindo, João/)).toBeDefined()
    expect(screen.getByText('Acme Corp')).toBeDefined()
    expect(screen.getByText('Beta Inc')).toBeDefined()
    expect(screen.getByText('Gamma Ltd')).toBeDefined()
  })

  it('chama onSelectClient ao clicar num card', async () => {
    const onSelectClient = vi.fn()
    render(
      <ClientPickerView
        userName="João Silva"
        clients={mockClients}
        onSelectClient={onSelectClient}
      />
    )
    await userEvent.click(screen.getByText('Beta Inc'))
    expect(onSelectClient).toHaveBeenCalledWith(mockClients[1])
  })

  it('chama onSelectClient automaticamente quando há apenas 1 cliente', () => {
    const onSelectClient = vi.fn()
    render(
      <ClientPickerView
        userName="João Silva"
        clients={[mockClients[0]]}
        onSelectClient={onSelectClient}
      />
    )
    expect(onSelectClient).toHaveBeenCalledWith(mockClients[0])
  })

  it('renderiza null (sem grid) quando há apenas 1 cliente', () => {
    const { container } = render(
      <ClientPickerView
        userName="João Silva"
        clients={[mockClients[0]]}
        onSelectClient={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('exibe mensagem quando não há clientes', () => {
    render(
      <ClientPickerView
        userName="João Silva"
        clients={[]}
        onSelectClient={vi.fn()}
      />
    )
    expect(screen.getByText('Nenhum cliente associado à sua conta.')).toBeDefined()
  })
})
