import { useState } from "react"
import {
  Users,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  Building2,
  Settings,
  Sun,
  Moon,
  LogOut,
  Wrench,
  ListChecks,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui"

import { canAccessView, type AccessRole } from "@/lib/accessControl"
import type { ViewType } from "@/store/useUIStore"

interface ClientOption {
  id: string
  name: string
}

interface NavItem {
  label: string
  Icon: React.ElementType
  view?: ViewType
  children?: { view: ViewType; label: string }[]
  requiresClient?: boolean
  isAdminOnly?: boolean
}

interface AppSidebarProps {
  open: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
  view: ViewType
  onViewChange: (view: ViewType) => void
  hasClient?: boolean
  role: AccessRole | null
  darkMode?: boolean
  onToggleDark?: () => void
  userEmail?: string
  userAvatarUrl?: string | null
  onSignOut?: () => void
  selectedClient?: ClientOption | null
  availableClients?: ClientOption[]
  onSelectClient?: (clientId: string | null | undefined) => void
  isAdmin?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: "Início", Icon: Home, view: "home" },

  {
    label: "Demandas",
    Icon: ListChecks,
    requiresClient: true,
    children: [
      { view: "demandas", label: "Todas Demandas" },
      { view: "calendar", label: "Calendário" },
      { view: "timeline", label: "Linha do Tempo" },
    ],
  },

  { label: "Membros", Icon: Users, view: "members", requiresClient: true },

  {
    label: "Relatórios",
    Icon: BarChart2,
    requiresClient: true,
    children: [
      { view: "reports", label: "Geral" },
      { view: "reports-fluxo", label: "Fluxo" },
      { view: "reports-timeline", label: "Timeline" },
      { view: "reports-membros", label: "Membros" },
      { view: "reports-alertas", label: "Alertas" },
    ],
  },

  { label: "Clientes", Icon: Building2, view: "clients" },

  {
    label: "Ferramentas",
    Icon: Wrench,
    children: [
      { view: "tools-briefing-analyzer", label: "Analisador de Briefing" },
      { view: "tools-import", label: "Importação" },
      { view: "tools-export", label: "Exportação" },
      { view: "tools-integrations", label: "Integrações" },
    ],
  },

  {
    label: "Admin",
    Icon: Settings,
    view: "admin",
    isAdminOnly: true,
  },
]

const CALENDAR_VIEWS: ViewType[] = ["calendar", "timeline", "list"]
const TOOLS_VIEWS: ViewType[] = ["tools", "tools-briefing-analyzer", "tools-import", "tools-export", "tools-integrations"]
const REPORTS_VIEWS: ViewType[] = ["reports", "reports-fluxo", "reports-timeline", "reports-membros", "reports-alertas"]

function getInitials(email?: string) {
  if (!email) return "?"
  const name = email.split("@")[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function AppSidebar({
  open,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
  view,
  onViewChange,
  hasClient = true,
  role,
  darkMode,
  onToggleDark,
  userEmail,
  userAvatarUrl,
  onSignOut,
  selectedClient,
  availableClients = [],
  onSelectClient,
  isAdmin,
}: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const initial: string[] = []
    if (CALENDAR_VIEWS.includes(view)) initial.push("Calendário")
    if (TOOLS_VIEWS.includes(view)) initial.push("Ferramentas")
    if (REPORTS_VIEWS.includes(view)) initial.push("Relatórios")
    return initial
  })

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.isAdminOnly && role !== "admin") return false
    if (!item.view) return true
    return canAccessView(item.view, role, hasClient || !item.requiresClient)
  })

  const showClientSelector =
    availableClients.length > 1 || (isAdmin && availableClients.length > 0)

  const renderItem = (item: NavItem, expanded: boolean, isMobile: boolean) => {
    const isDisabled = item.requiresClient && !hasClient

    if (item.children) {
      const isOpen = openGroups.includes(item.label)
      const isChildActive = item.children.some((c) => c.view === view)

      const groupButton = (
        <button
          onClick={() => !isDisabled && toggleGroup(item.label)}
          className={cn(
            "flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md",
            expanded ? "" : "justify-center",
            isChildActive
              ? "text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            isDisabled && "opacity-40 cursor-not-allowed"
          )}
        >
          <item.Icon className="w-4 h-4 shrink-0" />
          {expanded && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")}
              />
            </>
          )}
        </button>
      )

      return (
        <div key={item.label}>
          {expanded || isMobile ? (
            groupButton
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>{groupButton}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          )}

          {isOpen && expanded && (
            <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
              {item.children.map((child) => {
                const isActive = view === child.view
                return (
                  <button
                    key={child.view}
                    onClick={() => {
                      onViewChange(child.view)
                      if (isMobile) onCloseMobile?.()
                    }}
                    className={cn(
                      "text-xs text-left px-2 py-1.5 rounded-md",
                      isActive
                        ? "bg-muted text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {child.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    const isActive = view === item.view

    const button = (
      <button
        key={item.view}
        onClick={() => {
          if (isDisabled) return
          onViewChange(item.view!)
          if (isMobile) onCloseMobile?.()
        }}
        className={cn(
          "flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm",
          expanded ? "" : "justify-center",
          isActive
            ? "bg-muted text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isDisabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <item.Icon className="w-4 h-4 shrink-0" />
        {expanded && <span>{item.label}</span>}
      </button>
    )

    if (expanded || isMobile) return button

    return (
      <Tooltip key={item.label}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  const clientHeader = (expanded: boolean) =>
    showClientSelector ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted text-sm",
              !expanded && "justify-center"
            )}
          >
            <div className="h-6 w-6 bg-white border border-black text-black flex items-center justify-center rounded text-xs shrink-0 font-semibold">
              {selectedClient ? selectedClient.name.slice(0, 2).toUpperCase() : "—"}
            </div>
            {expanded && (
              <>
                <span className="flex-1 text-left truncate font-medium">
                  {selectedClient?.name ?? "Selecionar cliente"}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          {/* {isAdmin && (
            <>
              <DropdownMenuSeparator />
            </>
          )} */}

          
          {availableClients.map((client) => (
            <DropdownMenuItem
              key={client.id}
              onClick={() => onSelectClient?.(client.id)}
              className={selectedClient?.id === client.id ? "font-semibold" : ""}
            >
              {client.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : selectedClient ? (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-2",
          !expanded && "justify-center"
        )}
      >
        <div className="h-6 w-6 bg-white border border-black text-black flex items-center justify-center rounded text-xs shrink-0 font-semibold">
          {selectedClient.name.slice(0, 2).toUpperCase()}
        </div>
        {expanded && (
          <span className="text-sm font-medium truncate">{selectedClient.name}</span>
        )}
      </div>
    ) : null

  const sidebarFooter = (expanded: boolean) => (
    <div className="p-2 border-t flex flex-col gap-1">
      {expanded ? (
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-1 flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors min-w-0">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0 overflow-hidden">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(userEmail)
                  )}
                </div>
                <span className="text-sm truncate text-muted-foreground">{userEmail}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuLabel className="truncate max-w-48">{userEmail}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onToggle}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Recolher sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1 items-center">
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
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onToggle}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Expandir sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <>
        {/* MOBILE OVERLAY */}
        <div
          className={cn(
            "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onCloseMobile}
        />

        {/* MOBILE SIDEBAR */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 w-[260px] bg-card border-r z-50 md:hidden flex flex-col transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-2 border-b">{clientHeader(true)}</div>
          <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
            {filteredItems.map((item) => renderItem(item, true, true))}
          </nav>
          <div className="p-2 border-t">
            <button
              onClick={onToggleDark}
              className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              <span>{darkMode ? "Modo claro" : "Modo escuro"}</span>
            </button>
          </div>
        </aside>

        {/* DESKTOP SIDEBAR */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r bg-card transition-all duration-200",
            open ? "w-[220px]" : "w-[52px]"
          )}
        >
          <div className="p-2 border-b">{clientHeader(open)}</div>

          <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
            {filteredItems.map((item) => renderItem(item, open, false))}
          </nav>

          {sidebarFooter(open)}
        </aside>
      </>
    </TooltipProvider>
  )
}
