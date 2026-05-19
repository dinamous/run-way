import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  BarChart2,
  ChevronDown,
  Home,
  Building2,
  Settings,
  LogOut,
  Wrench,
  ListChecks,
  UserCircle,
  Plus,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
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

import { canAccessView } from "@/lib/accessControl"
import type { ViewType } from "@/store/useUIStore"
import { useLayoutContext } from "@/contexts/LayoutContext"

interface NavItem {
  label: string
  Icon: React.ElementType
  view?: ViewType
  children?: { view: ViewType; label: string }[]
  requiresClient?: boolean
  isAdminOnly?: boolean
  homeOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: "Visão Geral", Icon: Building2, view: "client-overview", requiresClient: true },
  { label: "Demandas", Icon: ListChecks, view: "demandas", requiresClient: true },
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
  { label: "Clientes", Icon: Building2, view: "clients", requiresClient: true },
  {
    label: "Ferramentas",
    Icon: Wrench,
    requiresClient: true,
    children: [
      { view: "tools-briefing-analyzer", label: "Analisador de Briefing" },
      { view: "tools-import", label: "Importação" },
      { view: "tools-export", label: "Exportação" },
      { view: "tools-integrations", label: "Integrações" },
    ],
  },
  { label: "Admin", Icon: Settings, view: "admin", isAdminOnly: true, homeOnly: true },
]

const TOOLS_VIEWS: ViewType[] = ["tools", "tools-briefing-analyzer", "tools-import", "tools-export", "tools-integrations"]
const REPORTS_VIEWS: ViewType[] = ["reports", "reports-fluxo", "reports-timeline", "reports-membros", "reports-alertas"]
const PLANNING_VIEWS: ViewType[] = ["demandas", "calendar", "timeline", "list", "kanban"]

function getInitials(email?: string) {
  if (!email) return "?"
  const name = email.split("@")[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getClientInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function AppSidebar() {
  const {
    sidebar: {
      sidebarOpen: open,
      mobileSidebarOpen: mobileOpen = false,
      onToggleSidebar: onToggle,
      onCloseMobileSidebar: onCloseMobile,
      view,
      onViewChange,
      hasClients: hasClient = true,
      role,
      userEmail,
      userAvatarUrl,
      onSignOut,
      selectedClient,
      availableClients = [],
      onSelectClient,
      isAdmin,
    },
  } = useLayoutContext()

  const navigate = useNavigate()

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const initial: string[] = []
    if (TOOLS_VIEWS.includes(view)) initial.push("Ferramentas")
    if (REPORTS_VIEWS.includes(view)) initial.push("Relatórios")
    return initial
  })

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const isGlobalHome = !selectedClient

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.isAdminOnly && role !== "admin") return false
    if (isGlobalHome) return item.homeOnly ?? false
    if (item.requiresClient && !hasClient) return false
    if (!item.view && !item.children) return true
    if (item.view) return canAccessView(item.view, role, true)
    return true
  })

  const showMultipleClients = availableClients.length > 1 || (isAdmin && availableClients.length > 0)

  /* ── Nav item (sidebar-2) ─────────────────────────────────── */
  const renderNavItem = (item: NavItem) => {
    const isDisabled = item.requiresClient && !hasClient

    if (item.children) {
      const isOpen = openGroups.includes(item.label)
      const isChildActive = item.children.some((c) => c.view === view)

      return (
        <div key={item.label}>
          <button
            onClick={() => !isDisabled && toggleGroup(item.label)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors duration-150 group",
              isChildActive
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              isDisabled && "opacity-40 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-2.5">
              <item.Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform duration-150 text-muted-foreground",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {isOpen && (
            <div className="ml-7 mt-0.5 flex flex-col gap-px border-l border-border pl-3">
              {item.children.map((child) => {
                const isActive = view === child.view
                return (
                  <button
                    key={child.view}
                    onClick={() => {
                      onViewChange(child.view)
                      onCloseMobile?.()
                    }}
                    className={cn(
                      "text-xs text-left px-2 py-1.5 rounded-md transition-colors duration-150",
                      isActive
                        ? "bg-muted text-foreground font-medium"
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

    const isActive =
      item.view === "demandas" ? PLANNING_VIEWS.includes(view) : view === item.view

    return (
      <button
        key={item.view}
        onClick={() => {
          if (isDisabled) return
          onViewChange(item.view!)
          onCloseMobile?.()
        }}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150",
          isActive
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isDisabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <item.Icon className="w-[18px] h-[18px] shrink-0" />
        <span>{item.label}</span>
      </button>
    )
  }

  /* ── Sidebar-2 content ────────────────────────────────────── */
  const sidebar2Content = (
    <>
      {/* Client name header */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        {selectedClient ? (
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Workspace
            </span>
            <span className="text-sm font-semibold text-foreground truncate leading-tight">
              {selectedClient.name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sua visão geral</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-px">
        {filteredItems.map((item) => renderNavItem(item))}
      </nav>

    </>
  )

  /* ── Sidebar-1 strip ─────────────────────────────────────── */
  const sidebar1 = (
    <aside className="w-[52px] h-full bg-card border-r border-border flex flex-col items-center py-3 z-30 shrink-0">
      {/* Logo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-md transition-all duration-150 mb-3 shrink-0",
              !selectedClient
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            )}
            aria-label="Ir para o início"
          >
            <Home className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Início</TooltipContent>
      </Tooltip>

      <div className="w-5 h-px bg-border mb-3 shrink-0" />

      {/* Client list */}
      <div className="flex-1 w-full flex flex-col items-center gap-2 px-2">
        {availableClients.map((client) => {
          const isActive = selectedClient?.id === client.id
          return (
            <Tooltip key={client.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelectClient?.(client.id)}
                  className={cn(
                    "relative w-9 h-9 rounded-md text-[11px] font-bold transition-all duration-150 flex items-center justify-center shrink-0",
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  )}
                >
                  {getClientInitials(client.name)}
                  {isActive && (
                    <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-[3px] h-5 bg-foreground rounded-r-sm" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{client.name}</TooltipContent>
            </Tooltip>
          )
        })}

        {isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onViewChange("clients")}
                className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 mt-1 shrink-0"
                aria-label="Gerenciar clientes"
              >
                <Plus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Gerenciar clientes</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Bottom */}
      <div className="w-full flex flex-col items-center gap-2 pt-3 shrink-0">
        <div className="w-5 h-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
              aria-label={open ? "Recolher painel" : "Expandir painel"}
            >
              {open ? <ChevronLeft className="w-[18px] h-[18px]" /> : <ChevronRight className="w-[18px] h-[18px]" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{open ? "Recolher" : "Expandir"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150">
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Ajuda</TooltipContent>
        </Tooltip>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 rounded-md bg-foreground text-background flex items-center justify-center text-[11px] font-bold overflow-hidden hover:opacity-80 transition-opacity shrink-0"
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
            <DropdownMenuLabel className="truncate max-w-48 font-normal text-muted-foreground">
              {userEmail}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewChange("profile")}>
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
          {sidebar2Content}
        </aside>

        {/* DESKTOP: dual-level sidebar */}
        <div className="hidden md:flex h-full">
          {/* Level 1: client strip */}
          {sidebar1}

          {/* Level 2: client nav */}
          <aside
            className={cn(
              "h-full bg-card border-r border-border flex flex-col transition-all duration-200 overflow-hidden",
              open ? "w-[220px]" : "w-0 border-r-0"
            )}
          >
            {open && sidebar2Content}
          </aside>
        </div>
      </>
    </TooltipProvider>
  )
}
