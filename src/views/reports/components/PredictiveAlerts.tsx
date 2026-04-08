import React from 'react';
import { AlertTriangle, Clock, Ban, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedTask } from '../utils';
import type { StepType } from '@/lib/steps';

interface PredictiveAlertsProps {
  enriched: EnrichedTask[];
  p85ByStep: Record<StepType, number>;
}

interface Alert {
  type: 'unrealistic_deadline' | 'stagnant' | 'wip_excess' | 'chronic_block';
  severity: 'high' | 'medium' | 'low';
  message: string;
  taskTitle: string;
  taskId: string;
}

const PredictiveAlerts: React.FC<PredictiveAlertsProps> = ({ enriched, p85ByStep }) => {
  const alerts = React.useMemo(() => {
    const result: Alert[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const t of enriched) {
      const step = t.currentStep;
      const p85 = step ? p85ByStep[step.type] : 0;
      const plannedDuration = step?.start && step?.end 
        ? Math.ceil((new Date(step.end + 'T00:00:00').getTime() - new Date(step.start + 'T00:00:00').getTime()) / 86400000) + 1
        : 0;

      if (step && p85 > 0 && plannedDuration < p85 * 0.7) {
        result.push({
          type: 'unrealistic_deadline',
          severity: 'high',
          message: `Prazo de ${plannedDuration}d é muito curto. Historicamente este step leva ${p85}d (P85).`,
          taskTitle: t.title,
          taskId: t.id,
        });
      }

      if (t.isStagnant && t.risk !== 'atrasado' && t.risk !== 'concluido') {
        result.push({
          type: 'stagnant',
          severity: 'medium',
          message: `Task sem movimentação há ${t.stagnationDays} dias.`,
          taskTitle: t.title,
          taskId: t.id,
        });
      }

      if (t.isBlocked && t.status?.blockedAt) {
        const blockedDays = Math.ceil((new Date(today + 'T00:00:00').getTime() - new Date(t.status.blockedAt + 'T00:00:00').getTime()) / 86400000);
        if (blockedDays > 5) {
          result.push({
            type: 'chronic_block',
            severity: 'high',
            message: `Bloqueada há ${blockedDays} dias. Impacto significativo no Lead Time.`,
            taskTitle: t.title,
            taskId: t.id,
          });
        }
      }
    }

    for (const memberId of [...new Set(enriched.flatMap(t => t.taskMembers.map(m => m.id)))]) {
      const memberTasks = enriched.filter(t => t.taskMembers.some(m => m.id === memberId) && t.currentStep);
      const wipCount = memberTasks.length;
      
      if (wipCount > 3) {
        const memberName = memberTasks[0].taskMembers.find(m => m.id === memberId)?.name ?? 'Membro';
        result.push({
          type: 'wip_excess',
          severity: 'medium',
          message: `${memberName} tem ${wipCount} tasks simultâneas ativas. Risco de context switching.`,
          taskTitle: memberTasks.map(t => t.title).slice(0, 2).join(', '),
          taskId: memberId,
        });
      }
    }

    return result.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [enriched, p85ByStep]);

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'unrealistic_deadline': return Zap;
      case 'stagnant': return Clock;
      case 'wip_excess': return Zap;
      case 'chronic_block': return Ban;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-500/10';
      case 'medium': return 'border-amber-500 bg-amber-500/10';
      case 'low': return 'border-blue-500 bg-blue-500/10';
    }
  };

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-primary" /> Alertas Preditivos
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta preditivo no momento.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, i) => {
              const Icon = getIcon(alert.type);
              return (
                <div 
                  key={i} 
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-l-4',
                    getSeverityColor(alert.severity)
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 shrink-0 mt-0.5',
                    alert.severity === 'high' ? 'text-red-500' : 
                    alert.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
                  )} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{alert.taskTitle}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PredictiveAlerts;