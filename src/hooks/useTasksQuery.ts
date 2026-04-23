import { useQuery } from '@tanstack/react-query'
import { fetchTasksFromDb, queryKeys } from '@/lib/queries'

export function useTasksQuery(
  clientId: string | null | undefined,
  isAdmin: boolean
) {
  return useQuery({
    queryKey: queryKeys.tasks(clientId ?? null, isAdmin),
    queryFn: () => fetchTasksFromDb(clientId ?? null, isAdmin),
    enabled: clientId !== undefined,
  })
}
