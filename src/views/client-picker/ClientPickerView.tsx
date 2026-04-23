import { useEffect } from "react"
import { ClientCard } from "./components/ClientCard"
import type { ClientOption } from "@/contexts/AuthContext"

interface ClientPickerViewProps {
  userName: string
  clients: ClientOption[]
  onSelectClient: (client: ClientOption) => void
}

export function ClientPickerView({ userName, clients, onSelectClient }: ClientPickerViewProps) {
  const firstName = userName.split(" ")[0]

  useEffect(() => {
    if (clients.length === 1) {
      onSelectClient(clients[0])
    }
  }, [clients, onSelectClient])

  if (clients.length === 1) return null

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Grade de fundo estilo blueprint */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

<div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-3xl px-6 py-16">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Bem-vindo, {firstName}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Qual projeto hoje?
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Selecione um cliente para acessar o painel de capacity planning.
          </p>
        </div>

        {/* Grid de clientes */}
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cliente associado à sua conta.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => onSelectClient(client)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
