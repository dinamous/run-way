import { motion } from "framer-motion"
import type { ComponentProps } from "react"

export function MotionItem({
  className,
  children,
  delay = 0,
  ...props
}: ComponentProps<typeof motion.div> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
