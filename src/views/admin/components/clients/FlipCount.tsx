import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export function FlipCount({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(value)
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    if (value === displayed) return
    if (reduced) { setDisplayed(value); return }
    setFlip(true)
    const t = setTimeout(() => { setDisplayed(value); setFlip(false) }, 140)
    return () => clearTimeout(t)
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
