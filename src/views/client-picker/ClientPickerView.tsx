import { useEffect } from "react"
import { motion } from "framer-motion"
import { ClientCard } from "./components/ClientCard"
import type { ClientOption } from "@/contexts/AuthContext"

interface ClientPickerViewProps {
  userName: string
  clients: ClientOption[]
  onSelectClient: (client: ClientOption) => void
}

const wordVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export function ClientPickerView({ userName, clients, onSelectClient }: ClientPickerViewProps) {
  const firstName = userName.split(" ")[0]
  const headlineWords = ["Qual", "projeto", "hoje?"]

  useEffect(() => {
    if (clients.length === 1) {
      onSelectClient(clients[0])
    }
  }, [clients, onSelectClient])

  if (clients.length === 1) return null

  const gridCols =
    clients.length === 2
      ? "grid-cols-2 max-w-xl"
      : clients.length === 3
        ? "grid-cols-3 max-w-3xl"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-5xl"

  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Grade de fundo blueprint */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Halo central */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.92 0 0 / 0.6) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none dark:block hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.22 0 0 / 0.7) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-12 w-full px-6 py-16">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-1.5 text-xs font-medium tracking-widest uppercase"
          >
            Bem-vindo, {firstName}
          </motion.div>

          <h1
            className="flex gap-[0.25em] text-5xl sm:text-6xl tracking-tight text-foreground"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
          >
            {headlineWords.map((word, i) => (
              <motion.span
                key={word}
                custom={i}
                variants={wordVariants}
                initial="hidden"
                animate="visible"
                style={{ display: "inline-block" }}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-sm text-muted-foreground max-w-xs"
          >
            Selecione um cliente para acessar o painel de capacity planning.
          </motion.p>
        </div>

        {/* Grid de clientes */}
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cliente associado à sua conta.
          </p>
        ) : (
          <div className={`grid ${gridCols} gap-4 w-full mx-auto`}>
            {clients.map((client, i) => (
              <ClientCard
                key={client.id}
                client={client}
                index={i}
                onClick={() => onSelectClient(client)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
