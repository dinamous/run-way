import React, { useMemo, useEffect, useState } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClientStore } from '@/store/useClientStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { BarChart2, DatabaseZap, Calendar, Users, Activity, AlertTriangle } from 'lucide-react';
import { todayStr, enrichTask, computeMemberLoad, calDaysBetween, calculatePercentile } from './utils';
import { formatDateToBR } from '@/lib/utils';
import type { StepType } from '@/lib/steps';
import { ViewState } from '@/components/ViewState';
import { Skeleton } from 'boneyard-js/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import DemandsTable from './components/DemandsTable';
import UpcomingDeadlines from './components/UpcomingDeadlines';
import TeamCapacity from './components/TeamCapacity';
import StepLoadChart from './components/StepLoadChart';
import StateDistribution from './components/StateDistribution';
import AlertsSection from './components/AlertsSection';
import WorkloadChart from './components/WorkloadChart';
import AvgTimeChart from './components/AvgTimeChart';
import TimelineChart from './components/TimelineChart';
import ProcessBottlenecks from './components/ProcessBottlenecks';
import FlowMetricsCards from './components/FlowMetricsCards';
import ThroughputChart from './components/ThroughputChart';
import ScatterPlot from './components/ScatterPlot';
import PredictiveAlerts from './components/PredictiveAlerts';
import CapacityHeatmap from './components/CapacityHeatmap';

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

type TimeFilter = 'all' | '30d' | '90d' | '180d' | '365d';

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

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks(selectedClientId, isAdmin);
    fetchMembers(selectedClientId);
  }, [selectedClientId, isAdmin, fetchTasks, fetchMembers]);

  const enriched = useMemo(
    () => tasks.map(task => enrichTask(task, today, members)),
    [tasks, today, members]
  );

  const filteredEnriched = useMemo(() => {
    let result = enriched;
    
    if (timeFilter !== 'all') {
      const daysMap: Record<TimeFilter, number> = {
        'all': Infinity,
        '30d': 30,
        '90d': 90,
        '180d': 180,
        '365d': 365,
      };
      const maxDays = daysMap[timeFilter];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxDays);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      
      result = result.filter(t => {
        const start = t.firstStart;
        return start && start >= cutoffStr;
      });
    }
    
    if (memberFilter !== 'all') {
      result = result.filter(t => 
        t.taskMembers.some(m => m.id === memberFilter)
      );
    }
    
    return result;
  }, [enriched, timeFilter, memberFilter]);

  const total = filteredEnriched.length;
  const active = filteredEnriched.filter(t => t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today).length;
  const bloqueadas = filteredEnriched.filter(t => t.isBlocked).length;
  const semSteps = filteredEnriched.filter(t => t.visibleSteps.length === 0).length;

  const upcomingDeadlines = useMemo(
    () => filteredEnriched
      .filter(t => t.lastDeadline && t.daysLeft >= 0 && t.daysLeft <= 14 && !t.isBlocked)
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [filteredEnriched]
  );

  const stepLoad = useMemo(() => {
    const counts: Partial<Record<StepType, number>> = {};
    for (const t of filteredEnriched) {
      for (const step of t.visibleSteps) {
        if (step.start <= today && step.end >= today) {
          counts[step.type as StepType] = (counts[step.type as StepType] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [filteredEnriched, today]);
  const maxStepLoad = Math.max(...Object.values(stepLoad), 1);

  const memberLoad = useMemo(
    () => members.map(m => computeMemberLoad(m, filteredEnriched, today)),
    [members, filteredEnriched, today]
  );

  const workloadData = useMemo(() => {
    return members.map(m => {
      let totalDays = 0;
      let taskCount = 0;
      for (const t of filteredEnriched) {
        for (const step of t.visibleSteps) {
          if (step.assignees.includes(m.id) && step.start && step.end) {
            totalDays += calDaysBetween(step.start, step.end) + 1;
            taskCount++;
          }
        }
      }
      return {
        memberId: m.id,
        memberName: m.name,
        avatar: m.avatar,
        role: m.role,
        totalDays,
        taskCount,
        avgDaysPerTask: taskCount > 0 ? Math.round((totalDays / taskCount) * 10) / 10 : 0,
      };
    });
  }, [members, filteredEnriched]);

  const avgTimeData = useMemo(() => {
    const completed = filteredEnriched.filter(t => t.risk === 'concluido' || (t.lastDeadline && t.lastDeadline < today && t.visibleSteps.length > 0));
    if (completed.length === 0) return { avgDays: 0, byStep: {} as Record<StepType, number> };
    
    let totalDays = 0;
    const byStepCounts: Record<string, { total: number; count: number }> = {};
    
    for (const t of completed) {
      if (t.firstStart && t.lastDeadline) {
        const days = calDaysBetween(t.firstStart, t.lastDeadline) + 1;
        totalDays += days;
        
        for (const step of t.visibleSteps) {
          if (!byStepCounts[step.type]) {
            byStepCounts[step.type] = { total: 0, count: 0 };
          }
          const stepDays = calDaysBetween(step.start, step.end) + 1;
          byStepCounts[step.type].total += stepDays;
          byStepCounts[step.type].count += 1;
        }
      }
    }
    
    const byStep: Record<StepType, number> = {} as Record<StepType, number>;
    for (const [type, data] of Object.entries(byStepCounts)) {
      byStep[type as StepType] = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
    }
    
    return {
      avgDays: Math.round((totalDays / completed.length) * 10) / 10,
      byStep,
    };
  }, [filteredEnriched, today]);

  const timelineData = useMemo(() => {
    const months: Record<string, { completed: number; pending: number; total: number }> = {};
    for (const t of filteredEnriched) {
      if (!t.lastDeadline) continue;
      const date = new Date(t.lastDeadline + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = { completed: 0, pending: 0, total: 0 };
      }
      months[monthKey].total++;
      if (t.risk === 'concluido' || t.lastDeadline < today) {
        months[monthKey].completed++;
      } else {
        months[monthKey].pending++;
      }
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }, [filteredEnriched, today]);

  const bottlenecksData = useMemo(() => {
    const stepStats: Record<string, { avgDuration: number; totalTasks: number; delays: number }> = {};
    for (const t of filteredEnriched) {
      for (const step of t.visibleSteps) {
        if (!stepStats[step.type]) {
          stepStats[step.type] = { avgDuration: 0, totalTasks: 0, delays: 0 };
        }
        stepStats[step.type].totalTasks++;
        const duration = calDaysBetween(step.start, step.end) + 1;
        stepStats[step.type].avgDuration = Math.round(((stepStats[step.type].avgDuration * (stepStats[step.type].totalTasks - 1)) + duration) / stepStats[step.type].totalTasks);
      }
    }
    return Object.entries(stepStats)
      .map(([type, stats]) => ({ type: type as StepType, ...stats }))
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }, [filteredEnriched]);

  const flowMetrics = useMemo(() => {
    const completedTasks = filteredEnriched.filter(t => t.risk === 'concluido' || (t.lastDeadline && t.lastDeadline < today));
    
    const leadTimes = completedTasks.map(t => t.leadTime).filter((l): l is number => l !== null);
    const cycleTimes = completedTasks.map(t => t.cycleTime).filter((c): c is number => c !== null);
    
    const avgLeadTime = leadTimes.length > 0 ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length * 10) / 10 : 0;
    const p85LeadTime = calculatePercentile(leadTimes, 85);
    const avgCycleTime = cycleTimes.length > 0 ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length * 10) / 10 : 0;
    const p85CycleTime = calculatePercentile(cycleTimes, 85);

    const throughput: Record<string, number> = {};
    for (const t of completedTasks) {
      if (!t.lastDeadline) continue;
      const date = new Date(t.lastDeadline + 'T00:00:00');
      const weekKey = getWeekKey(date);
      throughput[weekKey] = (throughput[weekKey] || 0) + 1;
    }

    const scatterData: { date: string; duration: number; stepType: StepType; title: string }[] = [];
    for (const t of completedTasks) {
      if (t.lastDeadline && t.leadTime) {
        scatterData.push({
          date: t.lastDeadline,
          duration: t.leadTime,
          stepType: t.currentStep?.type ?? 'desenvolvimento',
          title: t.title,
        });
      }
    }

    const p85ByStep: Record<StepType, number> = {} as Record<StepType, number>;
    const stepDurations: Record<string, number[]> = {};
    for (const t of completedTasks) {
      for (const step of t.visibleSteps) {
        if (!stepDurations[step.type]) stepDurations[step.type] = [];
        stepDurations[step.type].push(calDaysBetween(step.start, step.end) + 1);
      }
    }
    for (const [type, durations] of Object.entries(stepDurations)) {
      p85ByStep[type as StepType] = calculatePercentile(durations, 85);
    }

    return { avgLeadTime, p85LeadTime, avgCycleTime, p85CycleTime, throughput, scatterData, p85ByStep };
  }, [filteredEnriched, today]);

  const heatmapData = useMemo(() => {
    const data: { memberId: string; memberName: string; stepType: StepType; avgDays: number; taskCount: number }[] = [];
    for (const m of members) {
      for (const stepType of Object.keys(flowMetrics.p85ByStep) as StepType[]) {
        let totalDays = 0;
        let count = 0;
        for (const t of filteredEnriched) {
          for (const step of t.visibleSteps) {
            if (step.assignees.includes(m.id) && step.type === stepType) {
              totalDays += calDaysBetween(step.start, step.end) + 1;
              count++;
            }
          }
        }
        data.push({
          memberId: m.id,
          memberName: m.name,
          stepType,
          avgDays: count > 0 ? Math.round((totalDays / count) * 10) / 10 : 0,
          taskCount: count,
        });
      }
    }
    return data;
  }, [members, filteredEnriched, flowMetrics.p85ByStep]);

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

  return (
    <Skeleton loading={isLoading} initialBones={REPORTS_BONES} animate="shimmer">
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Relatórios</h2>
            <p className="text-muted-foreground text-sm">Visão analítica das demandas · Hoje: {formatDateToBR(today)}</p>
          </div>
          
          <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Período:</span>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              {([30, 90, 180, 365] as const).map(days => (
                <button
                  key={days}
                  onClick={() => setTimeFilter(days === 365 ? '365d' : days === 180 ? '180d' : days === 90 ? '90d' : '30d')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${timeFilter === (days === 365 ? '365d' : days === 180 ? '180d' : days === 90 ? '90d' : '30d') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {days}d
                </button>
              ))}
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${timeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Tudo
              </button>
            </div>
          </div>
            
            <select
              value={memberFilter}
              onChange={e => setMemberFilter(e.target.value)}
              className="w-40 text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os membros</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="geral" className="gap-2">
              <BarChart2 className="w-4 h-4" /> Geral
            </TabsTrigger>
            <TabsTrigger value="fluxo" className="gap-2">
              <Activity className="w-4 h-4" /> Fluxo
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="w-4 h-4" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="membros" className="gap-2">
              <Users className="w-4 h-4" /> Membros
            </TabsTrigger>
            <TabsTrigger value="alertas" className="gap-2">
              <AlertTriangle className="w-4 h-4" /> Alertas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6 mt-6">
            <FlowMetricsCards flowMetrics={flowMetrics} />
            
            <div className="grid gap-6">
              <StateDistribution total={total} bloqueadas={bloqueadas} active={active} semSteps={semSteps} />
            </div>

            <DemandsTable enriched={filteredEnriched} members={members} />
          </TabsContent>

          <TabsContent value="fluxo" className="space-y-6 mt-6">
            <ThroughputChart throughput={flowMetrics.throughput} />
            
            <ProcessBottlenecks bottlenecksData={bottlenecksData} p85ByStep={flowMetrics.p85ByStep} />
            
            <ScatterPlot scatterData={flowMetrics.scatterData} p85LeadTime={flowMetrics.p85LeadTime} />
            
            <StepLoadChart stepLoad={stepLoad} maxStepLoad={maxStepLoad} />
            
            <AvgTimeChart avgTimeData={avgTimeData} />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6 mt-6">
            <TimelineChart timelineData={timelineData} />
            <UpcomingDeadlines upcomingDeadlines={upcomingDeadlines} />
          </TabsContent>

          <TabsContent value="membros" className="space-y-6 mt-6">
            <TeamCapacity memberLoad={memberLoad} />
            <CapacityHeatmap heatmapData={heatmapData} p85ByStep={flowMetrics.p85ByStep} />
            <WorkloadChart workloadData={workloadData} />
          </TabsContent>

          <TabsContent value="alertas" className="space-y-6 mt-6">
            <PredictiveAlerts enriched={filteredEnriched} p85ByStep={flowMetrics.p85ByStep} />
            <AlertsSection enriched={filteredEnriched} />
            <UpcomingDeadlines upcomingDeadlines={upcomingDeadlines} />
          </TabsContent>
        </Tabs>
      </div>
    </Skeleton>
  );
};

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default ReportsView;