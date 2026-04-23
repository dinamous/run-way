import { useCallback } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import type { ClientOption } from "@/contexts/AuthContext"
import type { ViewType } from "@/store/useUIStore"
import { clientToSlug, slugToClient } from "@/lib/clientSlug"

// ─── URL → ViewType ───────────────────────────────────────────────────────────

export function urlToView(pathname: string): ViewType {
  const segments = pathname.replace(/^\//, "").split("/")

  // Rotas globais (sem clientSlug)
  const first = segments[0]
  if (first === "profile") return "profile"
  if (first === "admin") return "admin"
  if (first === "clients") return "clients"

  // /:clientSlug/...
  const rest = segments.slice(1)
  if (rest.length === 0) return "home"

  const [section, sub] = rest

  if (section === "client-info") return "clients"

  if (section === "tasks") {
    if (!sub || sub === "id") return "demandas"
    if (sub === "calendar") return "calendar"
    if (sub === "timeline") return "timeline"
    if (sub === "list") return "list"
    return "demandas"
  }

  if (section === "members") return "members"

  if (section === "reports") {
    if (!sub) return "reports"
    if (sub === "fluxo") return "reports-fluxo"
    if (sub === "timeline") return "reports-timeline"
    if (sub === "membros") return "reports-membros"
    if (sub === "alertas") return "reports-alertas"
    return "reports"
  }

  if (section === "tools") {
    if (!sub) return "tools"
    if (sub === "briefing-analyzer") return "tools-briefing-analyzer"
    if (sub === "import") return "tools-import"
    if (sub === "export") return "tools-export"
    if (sub === "integrations") return "tools-integrations"
    return "tools"
  }

  return "home"
}

// ─── ViewType + clientSlug → path ────────────────────────────────────────────

export function viewToPath(view: ViewType, clientSlug: string | null): string {
  if (view === "profile") return "/profile"
  if (view === "admin") return "/admin"
  if (view === "clients") return "/clients"

  if (!clientSlug) return "/"

  const base = `/${clientSlug}`

  const MAP: Partial<Record<ViewType, string>> = {
    home: base,
    clients: `${base}/client-info`,
    demandas: `${base}/tasks`,
    calendar: `${base}/tasks/calendar`,
    timeline: `${base}/tasks/timeline`,
    list: `${base}/tasks/list`,
    members: `${base}/members`,
    reports: `${base}/reports`,
    "reports-fluxo": `${base}/reports/fluxo`,
    "reports-timeline": `${base}/reports/timeline`,
    "reports-membros": `${base}/reports/membros`,
    "reports-alertas": `${base}/reports/alertas`,
    tools: `${base}/tools`,
    "tools-briefing-analyzer": `${base}/tools/briefing-analyzer`,
    "tools-import": `${base}/tools/import`,
    "tools-export": `${base}/tools/export`,
    "tools-integrations": `${base}/tools/integrations`,
  }

  return MAP[view] ?? base
}

// ─── Task path ────────────────────────────────────────────────────────────────

export function taskPath(
  taskId: string,
  clientSlug: string,
  subview: "calendar" | "timeline" | "list" = "calendar"
): string {
  return `/${clientSlug}/tasks/${subview}/id/${taskId}`
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useAppNavigation(clients: ClientOption[]) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ clientSlug?: string; taskId?: string }>()

  const currentSlug = params.clientSlug ?? null
  const currentClient = currentSlug ? slugToClient(currentSlug, clients) : null
  const view = urlToView(location.pathname)

  // taskId presente na URL (para abrir modal)
  const urlTaskId = params.taskId ?? null

  const navigateTo = useCallback(
    (newView: ViewType, client?: ClientOption | null) => {
      const slug = client ? clientToSlug(client) : currentSlug
      navigate(viewToPath(newView, slug))
    },
    [navigate, currentSlug]
  )

  const navigateToClient = useCallback(
    (client: ClientOption, keepView = false) => {
      const slug = clientToSlug(client)
      if (keepView && view !== "home" && view !== "clients") {
        navigate(viewToPath(view, slug))
      } else {
        navigate(`/${slug}`)
      }
    },
    [navigate, view]
  )

  const openTask = useCallback(
    (taskId: string, subview: "calendar" | "timeline" | "list" = "calendar") => {
      if (!currentSlug) return
      navigate(taskPath(taskId, currentSlug, subview))
    },
    [navigate, currentSlug]
  )

  const closeTask = useCallback(() => {
    if (!currentSlug) return
    // Remove o segmento /id/:taskId mantendo a subview
    const segments = location.pathname.replace(/^\//, "").split("/")
    const idIdx = segments.indexOf("id")
    if (idIdx !== -1) {
      navigate("/" + segments.slice(0, idIdx).join("/"), { replace: true })
    }
  }, [navigate, location.pathname, currentSlug])

  return {
    view,
    currentSlug,
    currentClient,
    urlTaskId,
    navigateTo,
    navigateToClient,
    openTask,
    closeTask,
  }
}
