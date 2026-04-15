import React, { useEffect } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import MemberCard from './components/MemberCard';
import { ViewState } from '@/components/ViewState';
import { DatabaseZap, Users2 } from 'lucide-react';
import { Skeleton } from 'boneyard-js/react';

const MEMBERS_BONES = {
  name: 'members-view',
  viewportWidth: 1280,
  width: 960,
  height: 520,
  bones: [
    { x: 0, y: 0, w: 45, h: 30, r: 8 },
    { x: 0, y: 40, w: 32, h: 18, r: 8 },
    { x: 0, y: 82, w: 48, h: 196, r: 12 },
    { x: 52, y: 82, w: 48, h: 196, r: 12 },
    { x: 0, y: 294, w: 48, h: 196, r: 12 },
    { x: 52, y: 294, w: 48, h: 196, r: 12 },
  ],
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MembersView: React.FC = () => {
  const { isAdmin } = useAuthContext();
  const { effectiveClientId } = useClients();
  const setView = useUIStore((s) => s.setView);
  const setDashboardRedirect = useUIStore((s) => s.setDashboardRedirect);
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasks,
    invalidate: invalidateTasks,
  } = useTaskStore();
  const {
    members,
    loading: membersLoading,
    error: membersError,
    fetchMembers,
    invalidate: invalidateMembers,
  } = useMemberStore();
  const today = todayStr();

  useEffect(() => {
    fetchTasks(effectiveClientId, isAdmin);
    fetchMembers(effectiveClientId);
  }, [effectiveClientId, isAdmin, fetchTasks, fetchMembers]);

  const hasData = tasks.length > 0 || members.length > 0;
  const isLoading = tasksLoading || membersLoading;
  const errorMessage = tasksError || membersError;

  const handleRetry = () => {
    invalidateTasks();
    invalidateMembers();
    fetchTasks(effectiveClientId, isAdmin);
    fetchMembers(effectiveClientId);
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

  const content = (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Capacity da Equipe</h2>
        <p className="text-muted-foreground">Visão informativa por membro com atalhos para abrir o calendário filtrado.</p>
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
    </div>
  );

  return (
    <Skeleton loading={isLoading} initialBones={MEMBERS_BONES} animate="shimmer">
      {content}
    </Skeleton>
  );
};

export default MembersView;
