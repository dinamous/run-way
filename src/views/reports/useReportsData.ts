import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { todayStr, enrichTask, computeMemberLoad, calDaysBetween, calculatePercentile } from './utils';
import type { StepType } from '@/lib/steps';

export type TimeFilter = 'all' | '30d' | '90d' | '180d' | '365d';

export interface ReportsData {
  enriched: ReturnType<typeof enrichTask>[];
  filteredEnriched: ReturnType<typeof enrichTask>[];
  members: import('@/hooks/useSupabase').Member[];
  total: number;
  active: number;
  bloqueadas: number;
  semSteps: number;
  concluidas: number;
  upcomingDeadlines: ReturnType<typeof enrichTask>[];
  stepLoad: Partial<Record<StepType, number>>;
  maxStepLoad: number;
  memberLoad: Awaited<ReturnType<typeof computeMemberLoad>>[];
  workloadData: {
    memberId: string;
    memberName: string;
    avatar: string;
    role: string;
    totalDays: number;
    taskCount: number;
    avgDaysPerTask: number;
  }[];
  avgTimeData: {
    avgDays: number;
    byStep: Record<StepType, number>;
  };
  timelineData: {
    month: string;
    completed: number;
    pending: number;
    total: number;
  }[];
  bottlenecksData: {
    type: StepType;
    avgDuration: number;
    totalTasks: number;
    delays: number;
  }[];
  flowMetrics: {
    avgLeadTime: number;
    p85LeadTime: number;
    avgCycleTime: number;
    p85CycleTime: number;
    throughput: Record<string, number>;
    scatterData: { date: string; duration: number; stepType: StepType; title: string }[];
    p85ByStep: Record<StepType, number>;
  };
  heatmapData: {
    memberId: string;
    memberName: string;
    stepType: StepType;
    avgDays: number;
    taskCount: number;
  }[];
  isLoading: boolean;
  errorMessage: string | null;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  memberFilter: string;
  setMemberFilter: (filter: string) => void;
  invalidate: () => void;
}

export function useReportsData(): ReportsData {
  const { isAdmin } = useAuthContext();
  const { effectiveClientId } = useClients();
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading: tasksLoading, error: tasksErr } = useTasksQuery(effectiveClientId, isAdmin);
  const { data: members = [], isLoading: membersLoading, error: membersErr } = useMembersQuery(effectiveClientId);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const today = todayStr();

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
  const active = filteredEnriched.filter(t => t.risk !== 'concluido' && t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today).length;
  const bloqueadas = filteredEnriched.filter(t => t.isBlocked).length;
  const semSteps = filteredEnriched.filter(t => t.visibleSteps.length === 0).length;
  const concluidas = filteredEnriched.filter(t => t.risk === 'concluido').length;

  const upcomingDeadlines = useMemo(
    () => filteredEnriched
      .filter(t => t.lastDeadline && t.daysLeft >= 0 && t.daysLeft <= 14 && !t.isBlocked)
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [filteredEnriched]
  );

  const stepLoad = useMemo(() => {
    const counts: Partial<Record<StepType, number>> = {};
    for (const t of filteredEnriched) {
      if (t.risk === 'concluido') continue;
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
        avatar: m.avatar ?? '',
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

  const isLoading = tasksLoading || membersLoading;
  const errorMessage = tasksErr?.message ?? membersErr?.message ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  return {
    enriched,
    filteredEnriched,
    members,
    total,
    active,
    bloqueadas,
    semSteps,
    concluidas,
    upcomingDeadlines,
    stepLoad,
    maxStepLoad,
    memberLoad,
    workloadData,
    avgTimeData,
    timelineData,
    bottlenecksData,
    flowMetrics,
    heatmapData,
    isLoading,
    errorMessage,
    timeFilter,
    setTimeFilter,
    memberFilter,
    setMemberFilter,
    invalidate,
  };
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}