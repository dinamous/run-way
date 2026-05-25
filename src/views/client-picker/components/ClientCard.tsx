import { motion } from "framer-motion"
import type { ClientOption } from "@/contexts/AuthContext"

interface ClientCardProps {
  client: ClientOption
  onClick: () => void
  index: number
}

export function ClientCard({ client, onClick, index }: ClientCardProps) {
  const initials = client.name.slice(0, 2).toUpperCase()

  return (
    <motion.button
      onClick={onClick}
      initial={{ clipPath: "inset(50% 0% 50% 0%)", opacity: 0 }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      transition={{
        clipPath: { duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.2, delay: index * 0.08 },
      }}
      whileHover="hover"
      className="group relative flex flex-col justify-between gap-8 rounded-2xl border border-border cursor-pointer bg-background p-7 text-left overflow-hidden"
      style={{ WebkitClipPath: "inset(0% 0% 0% 0%)" }}
    >
      {/* Fundo invertido que expande no hover */}
      <motion.div
        className="absolute inset-0 bg-foreground"
        initial={{ scaleY: 0, originY: 1 }}
        variants={{
          hover: { scaleY: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
        }}
        style={{ transformOrigin: "bottom" }}
      />

      {/* Avatar */}
      <div className="relative flex items-center justify-between">
        <motion.div
          className="flex items-center justify-center w-12 h-12 rounded-xl text-base font-bold shrink-0 tracking-tight"
          variants={{
            hover: { scale: 1.05, transition: { duration: 0.25, ease: "easeOut" } },
          }}
          style={{ backgroundColor: "var(--foreground)", color: "var(--background)" }}
        >
          <motion.span
            variants={{
              hover: { color: "var(--foreground)", transition: { duration: 0.25 } },
            }}
            style={{ color: "var(--background)" }}
          >
            {initials}
          </motion.span>
        </motion.div>

        <motion.div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          initial={{ opacity: 0, x: -4 }}
          variants={{
            hover: { opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.05 } },
          }}
        >
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            variants={{ hover: { stroke: "var(--background)" } }}
            style={{ stroke: "var(--muted-foreground)" }}
          >
            <path d="M2 7h10M8 3l4 4-4 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>
      </div>

      {/* Nome */}
      <div className="relative">
        <motion.p
          className="font-semibold text-lg leading-tight"
          style={{ color: "var(--foreground)" }}
          variants={{
            hover: { color: "var(--background)", transition: { duration: 0.2 } },
          }}
        >
          {client.name}
        </motion.p>
        <motion.p
          className="text-xs mt-1"
          style={{ color: "var(--muted-foreground)" }}
          variants={{
            hover: { color: "oklch(0.7 0 0)", transition: { duration: 0.2 } },
          }}
        >
          Acessar painel
        </motion.p>
      </div>
    </motion.button>
  )
}
