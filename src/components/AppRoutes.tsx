import { Routes, Route, Navigate } from "react-router-dom"

/**
 * Estrutura de rotas da aplicação (autenticado).
 *
 * /:clientSlug                          → home do cliente
 * /:clientSlug/client-info              → UserClientsView
 * /:clientSlug/tasks                    → TasksView (todas demandas)
 * /:clientSlug/tasks/calendar           → DashboardView (calendário)
 * /:clientSlug/tasks/calendar/id/:taskId
 * /:clientSlug/tasks/timeline           → DashboardView (linha do tempo)
 * /:clientSlug/tasks/timeline/id/:taskId
 * /:clientSlug/tasks/list               → DashboardView (lista)
 * /:clientSlug/tasks/list/id/:taskId
 * /:clientSlug/tasks/id/:taskId         → abre modal em calendar (default)
 * /:clientSlug/members                  → MembersView
 * /:clientSlug/reports                  → ReportsView (geral)
 * /:clientSlug/reports/fluxo
 * /:clientSlug/reports/timeline
 * /:clientSlug/reports/membros
 * /:clientSlug/reports/alertas
 * /:clientSlug/tools                    → ToolsView
 * /:clientSlug/tools/briefing-analyzer
 * /:clientSlug/tools/import
 * /:clientSlug/tools/export
 * /:clientSlug/tools/integrations
 * /profile                              → ProfileView
 * /:clientSlug/admin                    → AdminView
 * /clients                              → UserClientsView (sem cliente)
 * /                                     → HomeView (sem cliente selecionado)
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Raiz sem cliente */}
      <Route path="/" element={null} />

      {/* Rotas globais (sem cliente) */}
      <Route path="/profile" element={null} />
      <Route path="/clients" element={null} />

      {/* Rotas por cliente */}
      <Route path="/:clientSlug" element={null} />
      <Route path="/:clientSlug/client-info" element={null} />

      {/* Tasks */}
      <Route path="/:clientSlug/tasks" element={null} />
      <Route path="/:clientSlug/tasks/id/:taskId" element={null} />
      <Route path="/:clientSlug/tasks/calendar" element={null} />
      <Route path="/:clientSlug/tasks/calendar/id/:taskId" element={null} />
      <Route path="/:clientSlug/tasks/timeline" element={null} />
      <Route path="/:clientSlug/tasks/timeline/id/:taskId" element={null} />
      <Route path="/:clientSlug/tasks/list" element={null} />
      <Route path="/:clientSlug/tasks/list/id/:taskId" element={null} />

      {/* Admin */}
      <Route path="/:clientSlug/admin" element={null} />

      {/* Members */}
      <Route path="/:clientSlug/members" element={null} />

      {/* Reports */}
      <Route path="/:clientSlug/reports" element={null} />
      <Route path="/:clientSlug/reports/fluxo" element={null} />
      <Route path="/:clientSlug/reports/timeline" element={null} />
      <Route path="/:clientSlug/reports/membros" element={null} />
      <Route path="/:clientSlug/reports/alertas" element={null} />

      {/* Tools */}
      <Route path="/:clientSlug/tools" element={null} />
      <Route path="/:clientSlug/tools/briefing-analyzer" element={null} />
      <Route path="/:clientSlug/tools/import" element={null} />
      <Route path="/:clientSlug/tools/export" element={null} />
      <Route path="/:clientSlug/tools/integrations" element={null} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
