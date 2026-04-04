import { type ReactNode } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'

interface RequireAdminProps {
  children: ReactNode
  fallback?: ReactNode
}

export function RequireAdmin({ children, fallback = null }: RequireAdminProps) {
  const { isAdmin, loading } = useAuthContext()
  if (loading) return null
  if (!isAdmin) return <>{fallback}</>
  return <>{children}</>
}
