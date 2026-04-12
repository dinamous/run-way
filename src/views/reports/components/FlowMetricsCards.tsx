import React from 'react';
import { Clock, Activity, Target, TrendingDown } from 'lucide-react';
import TermTooltip from './TermTooltip';

interface FlowMetricsCardsProps {
  flowMetrics: {
    avgLeadTime: number;
    p85LeadTime: number;
    avgCycleTime: number;
    p85CycleTime: number;
    throughput: Record<string, number>;
    scatterData: { date: string; duration: number; stepType: string; title: string }[];
    p85ByStep: Record<string, number>;
  };
}

const FlowMetricsCards: React.FC<FlowMetricsCardsProps> = ({ flowMetrics }) => {
  const totalCompleted = Object.values(flowMetrics.throughput).reduce((a, b) => a + b, 0);
  const avgThroughput = Object.keys(flowMetrics.throughput).length > 0 
    ? Math.round(totalCompleted / Object.keys(flowMetrics.throughput).length * 10) / 10 
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">Lead Time Médio</span>
          <TermTooltip 
            term="Lead Time" 
            definition="Tempo total desde a criação até a conclusão da demanda. Inclui tempo de espera + tempo de trabalho." 
          />
        </div>
        <p className="text-2xl font-bold text-foreground">{flowMetrics.avgLeadTime}d</p>
        <p className="text-xs text-muted-foreground">Média geral</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-purple-500" />
          <span className="text-xs text-muted-foreground">P85 Lead Time</span>
          <TermTooltip 
            term="P85" 
            definition="85% das demandas são concluídas dentro deste tempo. Melhor para previsões realistas que médias." 
          />
        </div>
        <p className="text-2xl font-bold text-foreground">{flowMetrics.p85LeadTime}d</p>
        <p className="text-xs text-muted-foreground">85% das tasks</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-green-500" />
          <span className="text-xs text-muted-foreground">Vazão Média</span>
          <TermTooltip 
            term="Vazão (Throughput)" 
            definition="Quantidade de demandas concluídas por período. Indica a capacidade real do time." 
          />
        </div>
        <p className="text-2xl font-bold text-foreground">{avgThroughput}</p>
        <p className="text-xs text-muted-foreground">tasks/mês</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-muted-foreground">Cycle Time</span>
          <TermTooltip 
            term="Cycle Time" 
            definition="Tempo real de trabalho ativo (sem tempo de espera). O tempo que a equipe realmente spends produzindo." 
          />
        </div>
        <p className="text-2xl font-bold text-foreground">{flowMetrics.avgCycleTime}d</p>
        <p className="text-xs text-muted-foreground">tempo ativo</p>
      </div>
    </div>
  );
};

export default FlowMetricsCards;