import { describe, it, expect } from 'vitest'
import {
  resolveAccessRole,
  hasRolePermission,
  canAccessView,
} from '../accessControl'

describe('accessControl', () => {
  describe('resolveAccessRole', () => {
    it('retorna null se member é null', () => {
      expect(resolveAccessRole(null)).toBeNull()
    })

    it('retorna null se access_role é undefined', () => {
      expect(resolveAccessRole({ id: '1' } as never)).toBeNull()
    })

    it('retorna admin para access_role admin', () => {
      expect(resolveAccessRole({ id: '1', access_role: 'admin' } as never)).toBe('admin')
    })

    it('retorna user para access_role user', () => {
      expect(resolveAccessRole({ id: '1', access_role: 'user' } as never)).toBe('user')
    })
  })

  describe('hasRolePermission', () => {
    it('retorna false se role é null', () => {
      expect(hasRolePermission(null, 'view:admin')).toBe(false)
    })

    it('retorna true se admin pode acessar view:admin', () => {
      expect(hasRolePermission('admin', 'view:admin')).toBe(true)
    })

    it('retorna false se user não pode acessar view:admin', () => {
      expect(hasRolePermission('user', 'view:admin')).toBe(false)
    })

    it('user pode acessar view:dashboard', () => {
      expect(hasRolePermission('user', 'view:dashboard')).toBe(true)
    })
  })

  describe('canAccessView', () => {
    it('retorna false se role é null', () => {
      expect(canAccessView('calendar', null, true)).toBe(false)
    })

    it('admin com client pode acessar calendar', () => {
      expect(canAccessView('calendar', 'admin', true)).toBe(true)
    })

    it('user com client pode acessar calendar', () => {
      expect(canAccessView('calendar', 'user', true)).toBe(true)
    })

    it('calendar requer client ativo', () => {
      expect(canAccessView('calendar', 'admin', false)).toBe(false)
    })

    it('admin sem client pode acessar home', () => {
      expect(canAccessView('home', 'admin', false)).toBe(true)
    })

    it('admin pode acessar admin sem client', () => {
      expect(canAccessView('admin', 'admin', false)).toBe(true)
    })

    it('user não pode acessar admin', () => {
      expect(canAccessView('admin', 'user', false)).toBe(false)
    })
  })
})