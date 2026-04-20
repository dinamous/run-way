import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountSection } from '../components/AccountSection'

const member = {
  id: 'member-1',
  name: 'Maria Santos',
  email: 'maria@example.com',
  role: 'Designer',
  access_role: 'user' as const,
  avatar: 'MS',
  avatar_url: null,
  auth_user_id: 'auth-1',
  created_at: '2024-03-15T00:00:00Z',
}

describe('AccountSection', () => {
  it('exibe campos do membro', () => {
    render(
      <AccountSection
        member={member}
        saving={false}
        error={null}
        successMessage={null}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('Maria Santos')).toBeDefined()
    expect(screen.getByText('maria@example.com')).toBeDefined()
    expect(screen.getByText('Designer')).toBeDefined()
    expect(screen.getByText('Usuário')).toBeDefined()
  })

  it('chama onSave com dados válidos', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(
      <AccountSection
        member={member}
        saving={false}
        error={null}
        successMessage={null}
        onSave={onSave}
      />
    )

    const nameInput = screen.getByDisplayValue('Maria Santos')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Maria Editada')

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(onSave).toHaveBeenCalledWith({ name: 'Maria Editada', avatar_url: '' })
  })

  it('bloqueia save com nome muito curto', async () => {
    const onSave = vi.fn()
    render(
      <AccountSection
        member={member}
        saving={false}
        error={null}
        successMessage={null}
        onSave={onSave}
      />
    )

    const nameInput = screen.getByDisplayValue('Maria Santos')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'X')

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/pelo menos 2 caracteres/i)).toBeDefined()
  })

  it('exibe mensagem de sucesso', () => {
    render(
      <AccountSection
        member={member}
        saving={false}
        error={null}
        successMessage="Perfil atualizado com sucesso!"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Perfil atualizado com sucesso!')).toBeDefined()
  })

  it('exibe mensagem de erro', () => {
    render(
      <AccountSection
        member={member}
        saving={false}
        error="Erro ao salvar perfil."
        successMessage={null}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Erro ao salvar perfil.')).toBeDefined()
  })

  it('botão salvar desabilitado quando não há alterações', () => {
    render(
      <AccountSection
        member={member}
        saving={false}
        error={null}
        successMessage={null}
        onSave={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: /salvar/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })
})
