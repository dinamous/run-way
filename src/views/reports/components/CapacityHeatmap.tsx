import React from 'react';
import { Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEP_TYPES_ORDER, STEP_META } from '@/lib/steps';
import type { StepType } from '@/lib/steps';

interface HeatmapData {
  memberId: string;
  memberName: string;
  stepType: StepType;
  avgDays: number;
  taskCount: number;
}

interface CapacityHeatmapProps {
  heatmapData: HeatmapData[];
  p85ByStep: Record<StepType, number>;
}

const CapacityHeatmap: React.FC<CapacityHeatmapProps> = ({ heatmapData, p85ByStep }) => {
  const members = [...new Set(heatmapData.map(d => d.memberId))];
  const steps = STEP_TYPES_ORDER;

  const getColor = (avgDays: number, stepType: StepType): string => {
    if (avgDays === 0) return 'bg-muted/30';
    const p85 = p85ByStep[stepType] || 1;
    const ratio = avgDays / p85;
    if (ratio > 1.5) return 'bg-red-500';
    if (ratio > 1.2) return 'bg-amber-500';
    if (ratio > 0.8) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getTextColor = (avgDays: number): string => {
    if (avgDays === 0) return 'text-muted-foreground';
    return 'text-foreground';
  };

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Grid3X3 className="w-4 h-4 text-primary" /> Heatmap de Capacidade
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-muted-foreground">Membro</th>
              {steps.map(step => (
                <th key={step} className="p-2 font-medium text-muted-foreground text-center">
                  {STEP_META[step].tag}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(memberId => {
              const memberData = heatmapData.filter(d => d.memberId === memberId);
              const memberName = memberData[0]?.memberName ?? 'Unknown';
              return (
                <tr key={memberId}>
                  <td className="p-2 font-medium text-foreground">{memberName}</td>
                  {steps.map(step => {
                    const data = memberData.find(d => d.stepType === step);
                    const avgDays = data?.avgDays ?? 0;
                    return (
                      <td key={step} className="p-1">
                        <div 
                          className={cn(
                            'h-8 rounded flex items-center justify-center font-medium transition-all cursor-default',
                            getColor(avgDays, step),
                            getTextColor(avgDays)
                          )}
                          title={data?.taskCount ? `${avgDays}d (${data.taskCount} tasks)` : 'Sem dados'}
                        >
                          {avgDays > 0 ? `${avgDays}d` : '-'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>&lt; 80% P85</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>80-120% P85</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>120-150% P85</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>&gt; 150% P85</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CapacityHeatmap;