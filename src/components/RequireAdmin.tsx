import { type ReactNode } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { hasRolePermission, resolveAccessRole } from '@/lib/accessControl'

interface RequireAdminProps {
  children: ReactNode
  fallback?: ReactNode
}

export function RequireAdmin({ children, fallback = null }: RequireAdminProps) {
  const { member, loading } = useAuthContext()
  const role = resolveAccessRole(member)
  const hasAdminAccess = role === 'admin' && hasRolePermission(role, 'view:admin')
  if (loading) return null
  if (!hasAdminAccess) return <>{fallback}</>
  return <>{children}</>
}
