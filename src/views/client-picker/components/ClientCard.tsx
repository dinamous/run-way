import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClientOption } from "@/contexts/AuthContext"

interface ClientCardProps {
  client: ClientOption
  onClick: () => void
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const initials = client.name.slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between gap-8 rounded-2xl border border-border",
        "bg-background hover:bg-muted/40 dark:hover:bg-neutral-900",
        "p-7 text-left transition-all duration-200",
        "hover:border-foreground/20 hover:shadow-md"
      )}
    >
      {/* Avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-foreground text-background text-base font-bold shrink-0 tracking-tight">
          {initials}
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>

      {/* Nome */}
      <div>
        <p className="font-semibold text-lg text-foreground leading-tight">{client.name}</p>
        <p className="text-xs text-muted-foreground mt-1">Acessar painel</p>
      </div>
    </button>
  )
}
