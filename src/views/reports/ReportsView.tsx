import React, { useMemo, useEffect } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClientStore } from '@/store/useClientStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { BarChart2, DatabaseZap } from 'lucide-react';
import { todayStr, enrichTask, computeMemberLoad } from './utils';
import type { StepType } from '@/lib/steps';
import { ViewState } from '@/components/ViewState';
import { Skeleton } from 'boneyard-js/react';
import KpiCards from './components/KpiCards';
import DemandsTable from './components/DemandsTable';
import UpcomingDeadlines from './components/UpcomingDeadlines';
import TeamCapacity from './components/TeamCapacity';
import StepLoadChart from './components/StepLoadChart';
import StateDistribution from './components/StateDistribution';
import AlertsSection from './components/AlertsSection';

const REPORTS_BONES = {
  name: 'reports-view',
  viewportWidth: 1280,
  width: 1100,
  height: 760,
  bones: [
    { x: 0, y: 0, w: 35, h: 30, r: 8 },
    { x: 0, y: 40, w: 46, h: 16, r: 8 },
    { x: 0, y: 78, w: 100, h: 110, r: 12 },
    { x: 0, y: 204, w: 100, h: 210, r: 12 },
    { x: 0, y: 430, w: 49, h: 140, r: 12 },
    { x: 51, y: 430, w: 49, h: 140, r: 12 },
    { x: 0, y: 586, w: 49, h: 140, r: 12 },
    { x: 51, y: 586, w: 49, h: 140, r: 12 },
  ],
};

const ReportsView: React.FC = () => {
  const { isAdmin } = useAuthContext();
  const { selectedClientId } = useClientStore();
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
    fetchTasks(selectedClientId, isAdmin);
    fetchMembers(selectedClientId);
  }, [selectedClientId, isAdmin, fetchTasks, fetchMembers]);

  const enriched = useMemo(
    () => tasks.map(task => enrichTask(task, today, members)),
    [tasks, today, members]
  );

  const total = enriched.length;
  const active = enriched.filter(t => t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today).length;
  const atrasadas = enriched.filter(t => t.risk === 'atrasado').length;
  const emRisco = enriched.filter(t => t.risk === 'risco').length;
  const bloqueadas = enriched.filter(t => t.isBlocked).length;
  const semSteps = enriched.filter(t => t.visibleSteps.length === 0).length;

  const upcomingDeadlines = useMemo(
    () => enriched
      .filter(t => t.lastDeadline && t.daysLeft >= 0 && t.daysLeft <= 14 && !t.isBlocked)
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [enriched]
  );

  const stepLoad = useMemo(() => {
    const counts: Partial<Record<StepType, number>> = {};
    for (const t of enriched) {
      for (const step of t.visibleSteps) {
        if (step.start <= today && step.end >= today) {
          counts[step.type as StepType] = (counts[step.type as StepType] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [enriched, today]);
  const maxStepLoad = Math.max(...Object.values(stepLoad), 1);

  const memberLoad = useMemo(
    () => members.map(m => computeMemberLoad(m, enriched, today)),
    [members, enriched, today]
  );

  const hasData = tasks.length > 0 || members.length > 0;
  const isLoading = tasksLoading || membersLoading;
  const errorMessage = tasksError || membersError;

  const handleRetry = () => {
    invalidateTasks();
    invalidateMembers();
    fetchTasks(selectedClientId, isAdmin);
    fetchMembers(selectedClientId);
  };

  if (errorMessage && !hasData) {
    return (
      <ViewState
        icon={DatabaseZap}
        title="Erro ao carregar relatórios"
        description={`Não foi possível obter dados no banco. Detalhe: ${errorMessage}`}
        actionLabel="Tentar novamente"
        onAction={handleRetry}
      />
    );
  }

  if (total === 0 && !isLoading) {
    return (
      <ViewState
        icon={BarChart2}
        title="Sem demandas para analisar"
        description="Crie demandas no calendário para começar a gerar relatórios."
      />
    );
  }

  const content = (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground text-sm">Visão analítica das demandas · Hoje: {today}</p>
      </div>

      <KpiCards total={total} active={active} atrasadas={atrasadas} emRisco={emRisco} bloqueadas={bloqueadas} semSteps={semSteps} />

      <DemandsTable enriched={enriched} members={members} />

      <div className="grid md:grid-cols-2 gap-6">
        <UpcomingDeadlines upcomingDeadlines={upcomingDeadlines} />
        <TeamCapacity memberLoad={memberLoad} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <StepLoadChart stepLoad={stepLoad} maxStepLoad={maxStepLoad} />
        <StateDistribution total={total} bloqueadas={bloqueadas} active={active} semSteps={semSteps} />
      </div>

      <AlertsSection enriched={enriched} />
    </div>
  );

  return (
    <Skeleton loading={isLoading} initialBones={REPORTS_BONES} animate="shimmer">
      {content}
    </Skeleton>
  );
};

export default ReportsView;
