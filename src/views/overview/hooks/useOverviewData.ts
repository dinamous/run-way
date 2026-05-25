// Tipos compartilhados entre os hooks e componentes da OverviewView.
// A lógica de fetch foi modularizada em useKpisData, useClientsData e useWorkloadData.

export interface SubtaskRow {
  id: string
  title: string
  status: string
  start: string
  end: string
  active: boolean
  taskId: string
  taskTitle: string
  taskBlocked: boolean
  clientId: string
  clientName: string
  taskConcludedAt: string | null
}

export type ClientRisk = 'healthy' | 'attention' | 'critical'

export interface ClientSummary {
  id: string
  name: string
  activeTaskCount: number
  lateSubtaskCount: number
  risk: ClientRisk
}

export interface OverviewKpis {
  open: number
  late: number
  today: number
  concluded: number
}
