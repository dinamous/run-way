import type { SubtaskRow } from '@/views/overview/hooks/useOverviewData'

export type UrgencyTier = 'late' | 'today' | 'soon' | 'blocked'

export interface PlanMessage {
  tier: UrgencyTier
  clientName: string
  clientId: string
  taskId: string
  taskTitle: string
  text: string
  subtaskCount: number
  /** Days late (only for 'late' tier) */
  daysLate?: number
  /** Days until due (only for 'soon' tier) */
  daysUntil?: number
}

export interface DayPlan {
  lateCount: number
  todayCount: number
  weekCount: number
  blockedCount: number
  messages: PlanMessage[]
  isEmpty: boolean
}

// SubtaskStatus ordered by proximity to delivery (higher = more urgent)
const PHASE_PRIORITY: Record<string, number> = {
  'publicacao': 7,
  'qa': 6,
  'homologacao': 5,
  'aprovacao-design': 4,
  'desenvolvimento': 3,
  'design': 2,
  'analise-dev': 1,
  'analise-ux': 0,
}

function phasePriority(status: string): number {
  return PHASE_PRIORITY[status] ?? 0
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addBusinessDays(n: number): string {
  const d = new Date(today() + 'T00:00:00')
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000
  )
}

function classify(sub: SubtaskRow): UrgencyTier | null {
  if (!sub.active) return null
  if (sub.taskConcludedAt) return null

  const t = today()
  const diff = daysBetween(t, sub.end)

  if (diff < 0) return 'late'
  if (diff === 0) return 'today'
  if (diff <= 2) return 'soon'
  return null
}

interface GroupKey { clientId: string; clientName: string; taskId: string; taskTitle: string }

function groupKey(sub: SubtaskRow): string {
  return `${sub.clientId}::${sub.taskId}`
}

export function generateDayPlan(subtasks: SubtaskRow[], blockedTasks: BlockedTask[]): DayPlan {
  const t = today()
  const in2Days = addBusinessDays(2)
  const endOfWeek = (() => {
    const d = new Date(t + 'T00:00:00')
    const dow = d.getDay() // 0=Sun
    const daysToFri = dow === 0 ? 5 : (5 - dow + 7) % 7 || 7
    d.setDate(d.getDate() + daysToFri)
    return d.toISOString().slice(0, 10)
  })()

  const active = subtasks.filter((s) => s.active && !s.taskConcludedAt)

  const lateCount = active.filter((s) => s.end < t).length
  const todayCount = active.filter((s) => s.end === t).length
  const weekCount = active.filter((s) => s.end > t && s.end <= endOfWeek).length
  const blockedCount = blockedTasks.length

  // --- Build per-client/task groups for late, today, soon ---
  type GroupEntry = { tier: UrgencyTier; subs: SubtaskRow[]; clientId: string; clientName: string; taskId: string; taskTitle: string }
  const groups = new Map<string, GroupEntry>()

  for (const sub of active) {
    const tier = classify(sub)
    if (!tier) continue

    const key = groupKey(sub)
    if (!groups.has(key)) {
      groups.set(key, { tier, subs: [], clientId: sub.clientId, clientName: sub.clientName, taskId: sub.taskId, taskTitle: sub.taskTitle })
    }
    groups.get(key)!.subs.push(sub)
  }

  // Sort entries: tier order late > today > soon, then phase priority desc, then daysLate desc
  const tierOrder: Record<UrgencyTier, number> = { late: 0, today: 1, soon: 2, blocked: 3 }

  const sorted = Array.from(groups.values()).sort((a, b) => {
    const tA = tierOrder[a.tier]
    const tB = tierOrder[b.tier]
    if (tA !== tB) return tA - tB

    const maxPhaseA = Math.max(...a.subs.map((s) => phasePriority(s.status)))
    const maxPhaseB = Math.max(...b.subs.map((s) => phasePriority(s.status)))
    if (maxPhaseA !== maxPhaseB) return maxPhaseB - maxPhaseA

    const latestA = a.subs.reduce((acc, s) => Math.min(acc, daysBetween(t, s.end)), 0)
    const latestB = b.subs.reduce((acc, s) => Math.min(acc, daysBetween(t, s.end)), 0)
    return latestA - latestB
  })

  const messages: PlanMessage[] = []

  // --- Late & today & soon messages (grouped by client+task) ---
  for (const g of sorted) {
    const count = g.subs.length
    const noun = count === 1 ? 'fase' : 'fases'

    if (g.tier === 'late') {
      const maxDaysLate = Math.max(...g.subs.map((s) => Math.abs(daysBetween(s.end, t))))
      const text =
        count === 1
          ? `"${g.taskTitle}" (${g.clientName}) está atrasada há ${maxDaysLate} ${maxDaysLate === 1 ? 'dia' : 'dias'} — revise o prazo ou comunique o cliente.`
          : `${g.clientName} tem ${count} ${noun} de "${g.taskTitle}" atrasadas há até ${maxDaysLate} dias.`
      messages.push({ tier: 'late', clientName: g.clientName, clientId: g.clientId, taskId: g.taskId, taskTitle: g.taskTitle, text, subtaskCount: count, daysLate: maxDaysLate })
    } else if (g.tier === 'today') {
      const text =
        count === 1
          ? `"${g.taskTitle}" (${g.clientName}) tem 1 fase com entrega hoje.`
          : `${g.clientName} tem ${count} ${noun} de "${g.taskTitle}" para entregar hoje.`
      messages.push({ tier: 'today', clientName: g.clientName, clientId: g.clientId, taskId: g.taskId, taskTitle: g.taskTitle, text, subtaskCount: count })
    } else {
      const minDiff = Math.min(...g.subs.map((s) => daysBetween(t, s.end)))
      const text =
        count === 1
          ? `"${g.taskTitle}" (${g.clientName}) tem 1 fase que vence em ${minDiff} ${minDiff === 1 ? 'dia' : 'dias'}.`
          : `${g.clientName} tem ${count} ${noun} de "${g.taskTitle}" vencendo nos próximos ${minDiff} dias.`
      messages.push({ tier: 'soon', clientName: g.clientName, clientId: g.clientId, taskId: g.taskId, taskTitle: g.taskTitle, text, subtaskCount: count, daysUntil: minDiff })
    }

    if (messages.filter((m) => m.tier !== 'blocked').length >= 7) break
  }

  // --- Blocked tasks section (separate, appended last) ---
  for (const bt of blockedTasks.slice(0, 3)) {
    const text = `"${bt.taskTitle}" (${bt.clientName}) está bloqueada — verifique o impedimento.`
    messages.push({ tier: 'blocked', clientName: bt.clientName, clientId: bt.clientId, taskId: bt.taskId, taskTitle: bt.taskTitle, text, subtaskCount: 0 })
  }

  const isEmpty = lateCount === 0 && todayCount === 0 && weekCount === 0 && blockedCount === 0

  return { lateCount, todayCount, weekCount, blockedCount, messages, isEmpty }
}

export interface BlockedTask {
  taskId: string
  taskTitle: string
  clientId: string
  clientName: string
}
