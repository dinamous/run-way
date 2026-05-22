import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useSpring } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  Users,
  TrendingUp,
  ChevronDown,
  Home,
  Briefcase,
  Settings,
  LogOut,
  CalendarRange,
  UserCircle,
  Plus,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { HelpModal } from "@/components/HelpModal"
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

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Visão Geral", Icon: LayoutGrid, view: "client-overview", requiresClient: true },
      { label: "Demandas", Icon: CalendarRange, view: "demandas", requiresClient: true },
      { label: "Membros", Icon: Users, view: "members", requiresClient: true },
      {
        label: "Relatórios",
        Icon: TrendingUp,
        requiresClient: true,
        children: [
          { view: "reports", label: "Geral" },
          { view: "reports-fluxo", label: "Fluxo" },
          { view: "reports-timeline", label: "Timeline" },
          { view: "reports-membros", label: "Membros" },
          { view: "reports-alertas", label: "Alertas" },
        ],
      },
    ],
  },
  {
    label: "Operações",
    items: [
      { label: "Cliente", Icon: Briefcase, view: "clients", requiresClient: true },
      // {
      //   label: "Ferramentas",
      //   Icon: Zap,
      //   requiresClient: true,
      //   children: [
      //     { view: "tools-briefing-analyzer", label: "Analisador de Briefing" },
      //     { view: "tools-import", label: "Importação" },
      //     { view: "tools-export", label: "Exportação" },
      //     { view: "tools-integrations", label: "Integrações" },
      //   ],
      // },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Admin", Icon: Settings, view: "admin", isAdminOnly: true, homeOnly: true },
    ],
  },
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return reduced
}

/* Staggered entrance for nav items when sidebar panel opens */
function useStaggeredEntrance(active: boolean, count: number, reducedMotion: boolean) {
  const [visible, setVisible] = useState<boolean[]>(() => Array(count).fill(!active || reducedMotion))

  useEffect(() => {
    if (!active || reducedMotion) {
      setVisible(Array(count).fill(true))
      return
    }
    setVisible(Array(count).fill(false))
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(() => {
          setVisible((prev) => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, 40 + i * 28)
      )
    }
    return () => timers.forEach(clearTimeout)
  }, [active, count, reducedMotion])

  return visible
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
  const reducedMotion = usePrefersReducedMotion()
  const [helpOpen, setHelpOpen] = useState(false)
  const prevOpenRef = useRef(open)
  const desktopSidebarRef = useRef<HTMLDivElement>(null)
  const [panelJustOpened, setPanelJustOpened] = useState(false)

  /* ── Morph toggle tab ────────────────────────────────────────── */
  const springY = useSpring(0, { stiffness: 180, damping: 24, mass: 0.6 })
  const springOpacity = useSpring(0, { stiffness: 160, damping: 20, mass: 0.5 })
  const springExtraScale = useSpring(1, { stiffness: 200, damping: 22, mass: 0.5 })

  useEffect(() => {
    if (reducedMotion) return
    const sidebar2El = desktopSidebarRef.current
    if (!sidebar2El) return

    const PROXIMITY_ZONE = 140
    let rafId: number | null = null
    let lastX = 0
    let lastY = 0

    const onMove = (e: MouseEvent) => {
      lastX = e.clientX
      lastY = e.clientY
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const rect = sidebar2El.getBoundingClientRect()
        const inVertical = lastY >= rect.top && lastY <= rect.bottom

        if (inVertical) {
          springY.set(lastY - rect.top)
        }

        const dist = lastX - rect.right
        const progress = Math.max(0, Math.min(1, 1 - dist / PROXIMITY_ZONE))

        if (inVertical) {
          springOpacity.set(progress)
          springExtraScale.set(1 + progress * 0.15)
        } else {
          springOpacity.set(0)
        }
      })
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", onMove)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [reducedMotion, springY, springOpacity, springExtraScale])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }

  useEffect(() => {
    if (!prevOpenRef.current && open) {
      setPanelJustOpened(true)
      const t = setTimeout(() => setPanelJustOpened(false), 600)
      prevOpenRef.current = open
      return () => clearTimeout(t)
    }
    prevOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches
      if (!isDesktop) return
      if (event.target instanceof Node && desktopSidebarRef.current?.contains(event.target)) return
      onToggle()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [onToggle, open])

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

  const filterItem = (item: NavItem) => {
    if (item.isAdminOnly && role !== "admin") return false
    if (isGlobalHome) return item.homeOnly ?? false
    if (item.requiresClient && !hasClient) return false
    if (!item.view && !item.children) return true
    if (item.view) return canAccessView(item.view, role, true)
    return true
  }

  const filteredGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(filterItem),
  })).filter((g) => g.items.length > 0)

  const allNavItems = filteredGroups.flatMap((g) => g.items)
  const staggerVisible = useStaggeredEntrance(panelJustOpened, allNavItems.length, reducedMotion)

  /* View Transition helper for client selection */
  const selectClientWithTransition = (clientId: string) => {
    if (!onSelectClient) return
    if (!reducedMotion && "startViewTransition" in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(
        () => { onSelectClient(clientId) }
      )
    } else {
      onSelectClient(clientId)
    }
  }

  /* Track stagger index across groups */
  let staggerIdx = 0

  const isItemActive = (item: NavItem) => {
    if (item.children) return item.children.some((child) => child.view === view)
    return item.view === "demandas" ? PLANNING_VIEWS.includes(view) : view === item.view
  }

  /* ── Nav item ─────────────────────────────────────────────── */
  const renderNavItem = (item: NavItem, itemIdx: number) => {
    const isDisabled = item.requiresClient && !hasClient
    const entryStyle = !reducedMotion && staggerVisible[itemIdx] !== undefined
      ? {
          opacity: staggerVisible[itemIdx] ? 1 : 0,
          transform: staggerVisible[itemIdx] ? "translateX(0)" : "translateX(-6px)",
          transition: "opacity 220ms ease-out, transform 220ms ease-out",
        }
      : undefined

    if (item.children) {
      const isOpen = openGroups.includes(item.label)
      const isChildActive = item.children.some((c) => c.view === view)

      return (
        <div key={item.label} style={entryStyle}>
          <button
            onClick={() => !isDisabled && toggleGroup(item.label)}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors duration-150 relative group",
              isChildActive
                ? "bg-foreground/[0.09] text-foreground font-medium"
                : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              isDisabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {isChildActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-foreground rounded-full" />
            )}
            <div className="flex items-center gap-2.5">
              <item.Icon className={cn("w-[15px] h-[15px] shrink-0", isChildActive ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity duration-150")} />
              <span>{item.label}</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3 h-3 text-muted-foreground/50",
                !reducedMotion
                  ? "transition-transform duration-300 cubic-bezier(0.34,1.56,0.64,1)"
                  : "transition-transform duration-150",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {isOpen && (
            <div className="ml-5 mt-0.5 mb-0.5 flex flex-col gap-px pl-3 border-l border-border/50">
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
                      "text-xs text-left px-2.5 py-1.5 rounded-md transition-colors duration-150 relative",
                      isActive
                        ? "bg-foreground/[0.09] text-foreground font-medium"
                        : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-foreground rounded-full" />
                    )}
                    {child.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    const isActive = isItemActive(item)

    return (
      <button
        key={item.view}
        style={entryStyle}
        onClick={() => {
          if (isDisabled) return
          onViewChange(item.view!)
          onCloseMobile?.()
        }}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors duration-150 relative group",
          isActive
            ? "bg-foreground/[0.09] text-foreground font-medium"
            : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
          isDisabled && "opacity-40 cursor-not-allowed"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-foreground rounded-full" />
        )}
        <item.Icon className={cn("w-[15px] h-[15px] shrink-0", isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity duration-150")} />
        <span>{item.label}</span>
      </button>
    )
  }

  const renderCollapsedNavItem = (item: NavItem) => {
    const isDisabled = item.requiresClient && !hasClient
    const isActive = isItemActive(item)

    const handleClick = () => {
      if (isDisabled) return

      if (item.children) {
        setOpenGroups((prev) => (
          prev.includes(item.label) ? prev : [...prev, item.label]
        ))
        if (!open) onToggle()
        return
      }

      onViewChange(item.view!)
      onCloseMobile?.()
    }

    return (
      <Tooltip key={item.view ?? item.label}>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "relative flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[8px] font-medium leading-none transition-colors duration-150",
              isActive
                ? "bg-foreground/[0.09] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              isDisabled && "cursor-not-allowed opacity-40"
            )}
            aria-label={item.children ? `Abrir ${item.label}` : item.label}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-foreground" />
            )}
            <item.Icon className={cn("h-[15px] w-[15px] shrink-0", isActive ? "opacity-100" : "opacity-65")} />
            <span className="max-w-full truncate">{item.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.children ? `Abrir ${item.label}` : item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  /* ── Sidebar-2 content ────────────────────────────────────── */
  const sidebar2Content = (
    <>
      {/* Workspace header */}
      <div className="h-14 flex items-center px-4 border-b border-border/60 shrink-0">
        {selectedClient ? (
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest leading-none mb-1">
              Workspace
            </span>
            <span
              className="text-sm font-semibold text-foreground truncate leading-tight"
              style={{ viewTransitionName: "workspace-name" }}
            >
              {selectedClient.name}
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">{"Visão geral"}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4">
        {filteredGroups.map((group, i) => {
          const groupItems = group.items
          return (
            <div key={i} className="flex flex-col gap-px">
              {group.label && (
                <span className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  {group.label}
                </span>
              )}
              {groupItems.map((item) => {
                const idx = staggerIdx++
                return renderNavItem(item, idx)
              })}
            </div>
          )
        })}
      </nav>
    </>
  )

  /* ── Sidebar-1 strip ─────────────────────────────────────── */
  const sidebar1 = (
    <aside
      className={cn(
        "w-[52px] h-full flex flex-col items-center py-3 z-[70] shrink-0 border-r",
        /* strip is one tone darker than the card surface */
        "bg-[oklch(0.948_0.005_250)] dark:bg-[oklch(0.138_0.009_250)] border-border"
      )}
    >
      {/* Logo / Home */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-md transition-all duration-200 mb-3 shrink-0",
              !selectedClient
                ? "bg-foreground text-background shadow-sm"
                : "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.12] hover:text-foreground"
            )}
            aria-label="Ir para o início"
            style={!selectedClient ? { viewTransitionName: "home-btn" } : undefined}
          >
            <Home className="w-[17px] h-[17px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Início</TooltipContent>
      </Tooltip>

      <div className="w-5 h-px bg-border/70 mb-3 shrink-0" />

      {/* Client list */}
      <div className="flex-1 w-full flex flex-col items-center gap-1.5 px-2">
        {availableClients.map((client, idx) => {
          const isActive = selectedClient?.id === client.id
          return (
            <Tooltip key={client.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => selectClientWithTransition(client.id)}
                  className={cn(
                    "w-9 h-9 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0",
                    "transition-all duration-200",
                    isActive
                      ? "bg-foreground text-background shadow-sm ring-2 ring-foreground/15 ring-offset-2 ring-offset-[oklch(0.948_0.005_250)] dark:ring-offset-[oklch(0.138_0.009_250)]"
                      : "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.12] hover:text-foreground"
                  )}
                  style={{
                    viewTransitionName: `client-avatar-${idx}`,
                    animationDelay: reducedMotion ? "0ms" : `${idx * 40}ms`,
                  }}
                >
                  {getClientInitials(client.name)}
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
                className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors duration-150 mt-1 shrink-0"
                aria-label="Gerenciar clientes"
              >
                <Plus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Gerenciar clientes</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Bottom actions */}
      <div className="w-full flex flex-col items-center gap-1.5 pt-3 shrink-0">
        <div className="w-5 h-px bg-border/70" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setHelpOpen(true)}
              className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors duration-150"
              aria-label="Ajuda"
            >
              <HelpCircle className="w-[17px] h-[17px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Ajuda</TooltipContent>
        </Tooltip>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0",
                "bg-foreground text-background",
                "hover:opacity-80 transition-opacity duration-150",
                "ring-2 ring-foreground/10 ring-offset-1 ring-offset-[oklch(0.948_0.005_250)] dark:ring-offset-[oklch(0.138_0.009_250)]"
              )}
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
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <>
        {/* MOBILE OVERLAY */}
        <div
          className={cn(
            "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onCloseMobile}
        />

        {/* MOBILE SIDEBAR */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 w-[260px] bg-[oklch(0.970_0.003_250)] dark:bg-[oklch(0.155_0.007_250)] border-r z-50 md:hidden flex flex-col",
            "transition-transform duration-250 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebar2Content}
        </aside>

        {/* DESKTOP: dual-level sidebar */}
        <div ref={desktopSidebarRef} className="hidden md:flex h-full">
          {/* Level 1: strip */}
          {sidebar1}

          {/* Level 2: nav panel — absolute so it overlays content without pushing layout */}
          <aside
            className={cn(
              "group/sidebar2 absolute left-[52px] top-0 h-full bg-[oklch(0.970_0.003_250)] dark:bg-[oklch(0.155_0.007_250)] border-r border-border flex flex-col overflow-visible z-[60]",
              "transition-all duration-200 ease-out",
              open ? "w-[220px] shadow-[2px_0_12px_oklch(0_0_0/0.08)]" : "w-[68px] shadow-[2px_0_10px_oklch(0_0_0/0.05)]"
            )}
          >
            {open ? sidebar2Content : (
              <>
                <div className="flex h-14 shrink-0 items-center justify-center border-b border-border/60 px-1">
                  <span className="max-w-full truncate text-[9px] font-semibold uppercase leading-none tracking-wide text-muted-foreground/60">
                    Menu
                  </span>
                </div>
                <nav className="flex-1 overflow-y-auto px-1.5 py-2">
                  <div className="flex flex-col gap-1">
                    {filteredGroups.flatMap((group) => group.items).map(renderCollapsedNavItem)}
                  </div>
                </nav>
              </>
            )}
            <TooltipProvider delayDuration={600}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {reducedMotion ? (
                    <button
                      onClick={handleToggle}
                      className={cn(
                        "absolute right-0 top-1/2 z-[55] flex h-20 w-10 -translate-y-1/2 translate-x-full items-center justify-start overflow-hidden",
                        "rounded-r-full border-y border-r border-border bg-[oklch(0.970_0.003_250)] dark:bg-[oklch(0.155_0.007_250)] text-muted-foreground",
                        "shadow-[2px_0_8px_oklch(0_0_0/0.10)]",
                        "opacity-0 transition-[opacity,color,background-color] duration-150 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "group-hover/sidebar2:opacity-100"
                      )}
                      aria-label={open ? "Recolher navegação" : "Expandir navegação"}
                    >
                      {open ? <ChevronLeft className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ) : (
                    <motion.button
                      onClick={handleToggle}
                      style={{ top: springY, opacity: springOpacity, scale: springExtraScale, translateY: "-50%", translateX: "100%", originX: 0, originY: 0.5 }}
                      whileTap={{ scale: 1.0 }}
                      className={cn(
                        "absolute right-0 z-[55] flex h-12 w-6 items-center justify-start overflow-hidden",
                        "rounded-r-full border-y border-r border-border bg-[oklch(0.970_0.003_250)] dark:bg-[oklch(0.155_0.007_250)] text-muted-foreground",
                        "shadow-[2px_0_8px_oklch(0_0_0/0.10)]",
                        "hover:bg-foreground hover:text-background hover:border-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "transition-[color,background-color,border-color] duration-150",
                      )}
                      aria-label={open ? "Recolher navegação" : "Expandir navegação"}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={open ? "left" : "right"}
                          initial={{ opacity: 0, x: open ? 4 : -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: open ? -4 : 4 }}
                          transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
                          className="flex items-center justify-center shrink-0"
                        >
                          {open ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right">{open ? "Recolher navegação" : "Expandir navegação"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </aside>
        </div>
      </>
    </TooltipProvider>
  )
}
