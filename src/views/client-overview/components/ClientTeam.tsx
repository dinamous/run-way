import { CapacityTeam } from '@/components/workload/CapacityTeam'
import type { ClientMember } from '../hooks/useClientOverviewData'

interface ClientTeamProps {
  members: ClientMember[]
  loading: boolean
}

export function ClientTeam({ members, loading }: ClientTeamProps) {
  return (
    <CapacityTeam
      members={members}
      loading={loading}
      title="Equipe alocada"
      countLabel={members.length === 1 ? '1 membro' : `${members.length} membros`}
      emptyLabel="Nenhum membro alocado neste cliente"
    />
  )
}
