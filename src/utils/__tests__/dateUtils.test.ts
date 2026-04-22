import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateDisplay,
  addBusinessDays,
  nextBusinessDay,
  cascadePhases,
  businessDaysBetween,
  DEFAULT_DURATIONS,
} from '../dateUtils'

describe('dateUtils', () => {
  const monday = new Date(2026, 3, 6)
  const tuesday = new Date(2026, 3, 7)
  const friday = new Date(2026, 3, 10)
  const saturday = new Date(2026, 3, 11)
  const _sunday = new Date(2026, 3, 12)
  const mondayNext = new Date(2026, 3, 13)
  const _tuesdayNext = new Date(2026, 3, 14)

  describe('formatDate', () => {
    it('formata Date para YYYY-MM-DD', () => {
      expect(formatDate(new Date(2026, 3, 15))).toBe('2026-04-15')
    })

    it('formata string ISO para YYYY-MM-DD', () => {
      expect(formatDate(new Date(2026, 3, 15))).toBe('2026-04-15')
    })

    it('pad com zero em month < 10', () => {
      expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    })
  })

  describe('formatDateDisplay', () => {
    it('formata para DD/MM/YYYY', () => {
      expect(formatDateDisplay(new Date(2026, 3, 15))).toBe('15/04/2026')
    })
  })

  describe('addBusinessDays', () => {
    it('adiciona dias úteis corretamente', () => {
      const result = addBusinessDays(monday, 5)
      expect(result).toBe(formatDate(new Date(2026, 3, 13)))
    })

    it('retorna startDate se já é dia útil e 0 dias', () => {
      const result = addBusinessDays(monday, 0)
      expect(result).toBe(formatDate(monday))
    })

    it('retorna próximo dia útil se startDate é sábado e 0 dias', () => {
      const result = addBusinessDays(saturday, 0)
      expect(result).toBe(formatDate(mondayNext))
    })

    it('pula sábado e domingo', () => {
      const result = addBusinessDays(friday, 1)
      expect(result).toBe(formatDate(mondayNext))
    })
  })

  describe('nextBusinessDay', () => {
    it('retorna próximo dia útil', () => {
      expect(nextBusinessDay(friday)).toBe(formatDate(mondayNext))
    })

    it('retorna dia seguinte se já é dia útil', () => {
      expect(nextBusinessDay(monday)).toBe(formatDate(tuesday))
    })
  })

  describe('businessDaysBetween', () => {
    it('conta dias úteis entre duas datas', () => {
      const count = businessDaysBetween('2026-04-06', '2026-04-10')
      expect(count).toBeGreaterThanOrEqual(4)
    })

    it('retorna mínimo de 1', () => {
      expect(businessDaysBetween('2026-04-06', '2026-04-06')).toBe(1)
    })
  })

  describe('cascadePhases', () => {
    it('calcula fases em sequência', () => {
      const phases = cascadePhases(monday)
      expect(phases).toHaveProperty('design')
      expect(phases).toHaveProperty('approval')
      expect(phases).toHaveProperty('dev')
      expect(phases).toHaveProperty('qa')
    })

    it('design.start é a data inicial', () => {
      const phases = cascadePhases(monday)
      expect(phases.design.start).toBe(formatDate(monday))
    })

    it('approval começa após design', () => {
      const phases = cascadePhases(monday)
      expect(phases.approval.start).toBe(phases.design.end)
    })

    it('dev começa após approval', () => {
      const phases = cascadePhases(monday)
      expect(phases.dev.start).toBe(phases.approval.end)
    })

    it('qa começa após dev', () => {
      const phases = cascadePhases(monday)
      expect(phases.qa.start).toBe(phases.dev.end)
    })

    it('cada fase tem start e end', () => {
      const phases = cascadePhases(monday)
      for (const phase of ['design', 'approval', 'dev', 'qa']) {
        expect(phases[phase as keyof typeof phases]).toHaveProperty('start')
        expect(phases[phase as keyof typeof phases]).toHaveProperty('end')
      }
    })
  })

  describe('DEFAULT_DURATIONS', () => {
    it('tem durações definidas', () => {
      expect(DEFAULT_DURATIONS).toEqual({
        design: 5,
        approval: 3,
        dev: 7,
        qa: 3,
      })
    })
  })
})