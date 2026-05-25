export type ValidationErrors = { name?: string; slug?: string }
export type StatusFilter = 'all' | 'with_pending' | 'no_pending'

export const PAGE_SIZE = 15
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const

export function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export function validateFields(n: string, s: string): ValidationErrors {
  const errs: ValidationErrors = {}
  if (!n.trim()) errs.name = 'Nome é obrigatório'
  else if (n.trim().length < 2) errs.name = 'Mínimo 2 caracteres'
  else if (n.trim().length > 100) errs.name = 'Máximo 100 caracteres'

  if (!s.trim()) errs.slug = 'Slug é obrigatório'
  else if (!/^[a-z0-9-]+$/.test(s.trim())) errs.slug = 'Apenas letras minúsculas, números e hífens'
  else if (s.trim().length < 2) errs.slug = 'Mínimo 2 caracteres'
  else if (s.trim().length > 50) errs.slug = 'Máximo 50 caracteres'
  return errs
}
