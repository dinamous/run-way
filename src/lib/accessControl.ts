import type { Member } from '@/hooks/useSupabase'
import type { ViewType } from '@/store/useUIStore'

export type AccessRole = 'admin' | 'user'

export type AppPermission =
  | 'view:home'
  | 'view:clients'
  | 'view:dashboard'
  | 'view:members'
  | 'view:reports'
  | 'view:admin'
  | 'view:tools'

interface ViewRule {
  requiresClient: boolean
  roles: AccessRole[]
  permission: AppPermission
}

const ROLE_PERMISSIONS: Record<AccessRole, ReadonlySet<AppPermission>> = {
  admin: new Set([
    'view:home',
    'view:clients',
    'view:dashboard',
    'view:members',
    'view:reports',
    'view:admin',
    'view:tools',
  ]),
  user: new Set([
    'view:home',
    'view:clients',
    'view:dashboard',
    'view:members',
    'view:reports',
    'view:tools',
  ]),
}

const VIEW_RULES: Record<ViewType, ViewRule> = {
  home: { requiresClient: false, roles: ['admin', 'user'], permission: 'view:home' },
  clients: { requiresClient: false, roles: ['admin', 'user'], permission: 'view:clients' },
  calendar: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:dashboard' },
  timeline: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:dashboard' },
  list: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:dashboard' },
  demandas: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:dashboard' },
  members: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:members' },
  reports: { requiresClient: true, roles: ['admin', 'user'], permission: 'view:reports' },
  'reports-fluxo': { requiresClient: true, roles: ['admin', 'user'], permission: 'view:reports' },
  'reports-timeline': { requiresClient: true, roles: ['admin', 'user'], permission: 'view:reports' },
  'reports-membros': { requiresClient: true, roles: ['admin', 'user'], permission: 'view:reports' },
  'reports-alertas': { requiresClient: true, roles: ['admin', 'user'], permission: 'view:reports' },
  admin: { requiresClient: false, roles: ['admin'], permission: 'view:admin' },
  tools: { requiresClient: false, roles: ['admin', 'user'], permission: 'view:tools' },
  'tools-briefing-analyzer': { requiresClient: false, roles: ['admin', 'user'], permission: 'view:tools' },
  'tools-import': { requiresClient: false, roles: ['admin', 'user'], permission: 'view:tools' },
  'tools-export': { requiresClient: false, roles: ['admin', 'user'], permission: 'view:tools' },
  'tools-integrations': { requiresClient: false, roles: ['admin', 'user'], permission: 'view:tools' },
}

export function resolveAccessRole(member: Member | null): AccessRole | null {
  if (!member?.access_role) return null
  return member.access_role === 'admin' ? 'admin' : 'user'
}

export function hasRolePermission(role: AccessRole | null, permission: AppPermission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role].has(permission)
}

export function canAccessView(view: ViewType, role: AccessRole | null, hasClient: boolean): boolean {
  const rule = VIEW_RULES[view]
  if (!role) return false
  if (!rule.roles.includes(role)) return false
  if (!hasRolePermission(role, rule.permission)) return false
  if (rule.requiresClient && !hasClient) return false
  return true
}
