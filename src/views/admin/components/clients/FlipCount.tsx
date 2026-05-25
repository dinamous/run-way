import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export function FlipCount({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(value)
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    if (value === displayed) return
    const delay = reduced ? 0 : 140
    const t1 = reduced ? undefined : setTimeout(() => setFlip(true), 0)
    const t = setTimeout(() => { setDisplayed(value); if (!reduced) setFlip(false) }, delay)
    return () => { clearTimeout(t); if (t1 !== undefined) clearTimeout(t1) }
  }, [value, displayed, reduced])

  return (
    <motion.span
      key={displayed}
      animate={flip ? { y: [0, -6, 0], opacity: [1, 0, 1] } : {}}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="tabular-nums"
    >
      {displayed}
    </motion.span>
  )
}
