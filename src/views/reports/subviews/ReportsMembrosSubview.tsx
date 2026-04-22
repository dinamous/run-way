import { useQueryClient } from '@tanstack/react-query';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useUIStore } from '@/store/useUIStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { ViewState } from '@/components/ViewState';
import { DatabaseZap, Users2 } from 'lucide-react';
import MemberCard from '@/views/MembersView/components/MemberCard';
import { useReportsData } from '../useReportsData';
import TeamCapacity from '../components/TeamCapacity';
import CapacityHeatmap from '../components/CapacityHeatmap';
import WorkloadChart from '../components/WorkloadChart';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ReportsMembrosSubview() {
  const { memberLoad, workloadData, heatmapData, flowMetrics } = useReportsData();
  const { isAdmin } = useAuthContext();
  const { effectiveClientId } = useClients();
  const queryClient = useQueryClient();
  const setView = useUIStore((s) => s.setView);
  const setDashboardRedirect = useUIStore((s) => s.setDashboardRedirect);
  const { data: tasks = [], isLoading: tasksLoading, error: tasksErr } = useTasksQuery(effectiveClientId, isAdmin);
  const { data: members = [], isLoading: membersLoading, error: membersErr } = useMembersQuery(effectiveClientId);
  const today = todayStr();

  const hasData = tasks.length > 0 || members.length > 0;
  const isLoading = tasksLoading || membersLoading;
  const errorMessage = tasksErr?.message ?? membersErr?.message ?? null;

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  if (errorMessage && !hasData) {
    return (
      <ViewState
        icon={DatabaseZap}
        title="Erro ao carregar membros"
        description={`Não foi possível consultar o banco agora. Detalhe: ${errorMessage}`}
        actionLabel="Tentar novamente"
        onAction={handleRetry}
      />
    );
  }

  if (members.length === 0 && !isLoading) {
    return (
      <ViewState
        icon={Users2}
        title="Sem membros neste cliente"
        description="Associe membros ao cliente para visualizar a capacidade por etapa."
        actionLabel="Atualizar"
        onAction={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Capacity da Equipe</h3>
        <p className="text-sm text-muted-foreground">Visão por membro com atalhos para abrir o calendário filtrado.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {members.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            tasks={tasks}
            today={today}
            onOpenCalendar={(memberId: string) => {
              setDashboardRedirect({ assigneeId: memberId, mode: 'calendar' });
              setView('calendar');
            }}
          />
        ))}
      </div>

      <TeamCapacity memberLoad={memberLoad} />
      <CapacityHeatmap heatmapData={heatmapData} p85ByStep={flowMetrics.p85ByStep} />
      <WorkloadChart workloadData={workloadData} />
    </div>
  );
}

export default ReportsMembrosSubview;