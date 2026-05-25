import { motion } from "framer-motion"
import { LayoutDashboard, LogOut, Sun, Moon, UserCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui"
import { ClientPickerView } from "@/views/client-picker"
import type { ClientOption } from "@/contexts/AuthContext"

function getInitials(email?: string) {
  if (!email) return "?"
  const name = email.split("@")[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface ClientPickerLayoutProps {
  userName: string
  userEmail?: string
  userAvatarUrl?: string | null
  darkMode: boolean
  onToggleDark: () => void
  clients: ClientOption[]
  onSelectClient: (client: ClientOption) => void
  onSignOut: () => void
  onGoToProfile: () => void
}

export function ClientPickerLayout({
  userName,
  userEmail,
  userAvatarUrl,
  darkMode,
  onToggleDark,
  clients,
  onSelectClient,
  onSignOut,
  onGoToProfile,
}: ClientPickerLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="bg-neutral-100 dark:bg-neutral-950 border-b border-border sticky top-0 z-10">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-black dark:bg-white p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
            </div>
            <h1
              className="text-xl text-foreground hidden sm:block"
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
            >
              Run/Way
            </h1>
          </div>
          <button
            onClick={onToggleDark}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Mini-sidebar — sempre recolhida */}
        <aside className="hidden md:flex flex-col border-r bg-card w-[52px] relative z-20">
          <div className="flex-1 flex flex-col items-center pt-4 gap-3">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center opacity-30" />
            <div className="w-6 h-1 rounded bg-muted opacity-20" />
            <div className="w-6 h-1 rounded bg-muted opacity-20" />
            <div className="w-6 h-1 rounded bg-muted opacity-20" />
          </div>
          <div className="p-2 border-t flex flex-col gap-1 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center rounded-full w-8 h-8 bg-primary text-primary-foreground text-xs overflow-hidden hover:opacity-80 transition-opacity"
                  aria-label="Menu do utilizador"
                >
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(userEmail)
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end">
                <DropdownMenuLabel className="truncate max-w-48">{userEmail}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onGoToProfile}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <motion.main
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 overflow-auto p-0"
        >
          <ClientPickerView
            userName={userName}
            clients={clients}
            onSelectClient={onSelectClient}
          />
        </motion.main>
      </div>

    </div>
  )
}
