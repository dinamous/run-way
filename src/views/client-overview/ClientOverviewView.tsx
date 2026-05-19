import { useClientOverviewData } from './hooks/useClientOverviewData'
import { ClientOverviewHeader } from './components/ClientOverviewHeader'
import { ClientKpis } from './components/ClientKpis'
import { ClientTaskList } from './components/ClientTaskList'
import { ClientMembersCard } from './components/ClientMembersCard'

interface ClientOverviewViewProps {
  clientId: string | null
}

export function ClientOverviewView({ clientId }: ClientOverviewViewProps) {
  const data = useClientOverviewData(clientId)

  return (
    <div className="overview-root relative min-h-full">
      <div className="overview-ambient" aria-hidden="true" />

      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto flex flex-col gap-8">

        <ClientOverviewHeader client={data.client} loading={data.loading} />

        {/* KPIs */}
        <section className="flex flex-col gap-2">
          <span className="overview-section-label">Resumo</span>
          <ClientKpis kpis={data.kpis} loading={data.loading} />
        </section>

        {/* Demandas + Membros */}
        <section className="flex flex-col gap-2">
          <span className="overview-section-label">Detalhes</span>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
            <ClientTaskList tasks={data.tasks} loading={data.loading} />
            <ClientMembersCard members={data.members} loading={data.loading} />
          </div>
        </section>

      </div>
    </div>
  )
}
