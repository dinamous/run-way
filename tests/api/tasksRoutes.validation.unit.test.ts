import { describe, expect, it } from 'vitest'
import { validateTaskPayload } from '@/api/tasksRoutes'

describe('Task payload validation unit', () => {
  const oversized = 'x'.repeat(121)

  it('falha com payload null e undefined', () => {
    const nullPayload = validateTaskPayload(null, true)
    expect(nullPayload.ok).toBe(false)

    const undefinedPayload = validateTaskPayload(undefined, true)
    expect(undefinedPayload.ok).toBe(false)
  })

  it('valida campo title para undefined, vazio, oversized e caracteres especiais inseguros', () => {
    const missingTitle = validateTaskPayload({}, true)
    expect(missingTitle.ok).toBe(false)

    const emptyTitle = validateTaskPayload({ title: '   ' }, true)
    expect(emptyTitle.ok).toBe(false)

    const oversizedTitle = validateTaskPayload({ title: oversized }, true)
    expect(oversizedTitle.ok).toBe(false)

    const specialCharsTitle = validateTaskPayload({ title: "abc' OR 1=1 --" }, true)
    expect(specialCharsTitle.ok).toBe(false)
  })

  it('valida campo clickupLink para null, vazio, oversized e caracteres especiais inseguros', () => {
    const nullLink = validateTaskPayload({ title: 'Ok', clickupLink: null }, true)
    expect(nullLink.ok).toBe(true)

    const emptyLink = validateTaskPayload({ title: 'Ok', clickupLink: '' }, true)
    expect(emptyLink.ok).toBe(true)

    const oversizedLink = validateTaskPayload({ title: 'Ok', clickupLink: `https://x.com/${'a'.repeat(600)}` }, true)
    expect(oversizedLink.ok).toBe(false)

    const specialCharsLink = validateTaskPayload({ title: 'Ok', clickupLink: 'https://x.com/--' }, true)
    expect(specialCharsLink.ok).toBe(false)
  })

  it('valida campo clientId para undefined, null, vazio e especiais', () => {
    const undefinedClient = validateTaskPayload({ title: 'Ok' }, true)
    expect(undefinedClient.ok).toBe(true)

    const nullClient = validateTaskPayload({ title: 'Ok', clientId: null }, true)
    expect(nullClient.ok).toBe(true)

    const emptyClient = validateTaskPayload({ title: 'Ok', clientId: '' }, true)
    expect(emptyClient.ok).toBe(false)

    const specialClient = validateTaskPayload({ title: 'Ok', clientId: "x' OR 1=1 --" }, true)
    expect(specialClient.ok).toBe(false)
  })

  it('aceita payload valido', () => {
    const payload = validateTaskPayload(
      {
        title: 'Demanda segura',
        clickupLink: 'https://app.clickup.com/t/abc123',
        clientId: '33333333-3333-4333-8333-333333333333',
      },
      true
    )

    expect(payload.ok).toBe(true)
  })
})
