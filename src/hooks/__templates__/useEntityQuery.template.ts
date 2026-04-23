/**
 * TEMPLATE: Query hook com TanStack Query
 *
 * Como usar:
 *  1. Copie este arquivo para src/hooks/use<Entity>Query.ts
 *  2. Substitua Entity/entity pelos nomes reais
 *  3. Adicione a query key em src/lib/queries.ts
 *  4. Adicione a função de fetch em src/lib/queries.ts
 *  5. Consuma com: const { data, isLoading, error } = use<Entity>Query(...)
 *
 * Invalidação após mutação:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.entity(param) })
 *
 * Update otimista (se necessário):
 *   const prev = queryClient.getQueryData(queryKeys.entity(param))
 *   queryClient.setQueryData(queryKeys.entity(param), newData)
 *   // em caso de erro: queryClient.setQueryData(queryKeys.entity(param), prev)
 */

import { useQuery as _useQuery } from '@tanstack/react-query'
// import { fetchEntityFromDb, queryKeys } from '@/lib/queries'

// export function useEntityQuery(param: string | null | undefined) {
//   return useQuery({
//     queryKey: queryKeys.entity(param),
//     queryFn: () => fetchEntityFromDb(param),
//     enabled: param !== undefined,
//   })
// }
