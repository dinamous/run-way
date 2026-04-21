import { useQuery } from '@tanstack/react-query'
import { fetchMembersFromDb, queryKeys } from '@/lib/queries'

export function useMembersQuery(clientId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.members(clientId),
    queryFn: () => fetchMembersFromDb(clientId),
    enabled: clientId !== undefined,
  })
}
