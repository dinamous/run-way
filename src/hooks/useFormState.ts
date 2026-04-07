import { useState, useMemo, useRef } from 'react'

/**
 * Tracks dirty state and submission guard for forms.
 *
 * @param current   - Current form values (re-computed each render)
 * @param isNew     - When true (new record), isDirty is driven by `newDirty` instead of diff
 * @param newDirty  - For new records: whether the form has enough data to submit
 */
export function useFormState<T>(
  current: T,
  isNew: boolean,
  newDirty = false,
) {
  const original = useRef<string>(isNew ? '' : JSON.stringify(current))
  const [submitting, setSubmitting] = useState(false)

  const isDirty = useMemo(() => {
    if (isNew) return newDirty
    return JSON.stringify(current) !== original.current
  }, [current, isNew, newDirty])

  /** Resets the dirty baseline to the current values. */
  function reset() {
    original.current = JSON.stringify(current)
  }

  async function withSubmit(fn: () => Promise<void>): Promise<void> {
    if (submitting || !isDirty) return
    setSubmitting(true)
    try {
      await fn()
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Safe close: if there are unsaved changes, asks for confirmation first.
   * Returns true if the close should proceed.
   */
  function confirmClose(): boolean {
    if (!isDirty) return true
    return window.confirm('Você tem alterações não guardadas. Tem certeza que quer fechar?')
  }

  return { isDirty, submitting, withSubmit, reset, confirmClose }
}
