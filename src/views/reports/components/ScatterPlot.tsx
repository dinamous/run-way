import React from 'react';
import { ScatterChart as ScatterIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEP_META } from '@/lib/steps';
import TermTooltip from './TermTooltip';

interface ScatterData {
  date: string;
  duration: number;
  stepType: string;
  title: string;
}

interface ScatterPlotProps {
  scatterData: ScatterData[];
  p85LeadTime: number;
}

const ScatterPlot: React.FC<ScatterPlotProps> = ({ scatterData, p85LeadTime }) => {
  const sortedData = [...scatterData].sort((a, b) => a.date.localeCompare(b.date));
  const maxDuration = Math.max(...scatterData.map(d => d.duration), p85LeadTime, 1);
  const outlierThreshold = p85LeadTime * 1.5;

  const isEmpty = scatterData.length === 0;
  const isSingle = scatterData.length === 1;

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <ScatterIcon className="w-4 h-4 text-primary" /> 
        Scatter Plot de Entregas
        <TermTooltip 
          term="Scatter Plot" 
          definition="Gráfico de dispersão que mostra cada entrega como um ponto. Eixo X = data, Eixo Y = duração. Pontos acima da linha P85 são outliers que precisam de análise." 
        />
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados de scatter.</p>
        ) : (
          <div className="relative h-64 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-muted-foreground py-2">
              <span>{maxDuration}d</span>
              <span>{Math.round(maxDuration / 2)}d</span>
              <span>0</span>
            </div>
            <div className="ml-10 mr-4 h-full relative">
              <div className="absolute left-0 right-0 top-0 h-px bg-muted" />
              <div className="absolute left-0 right-0 top-1/2 h-px bg-muted" />
              <div className="absolute left-0 right-0 bottom-0 h-px bg-muted" />
              
              {p85LeadTime > 0 && (
                <div 
                  className="absolute top-0 bottom-0 w-px bg-amber-500/50 border-l border-dashed border-amber-500"
                  style={{ left: `${Math.min(100, (p85LeadTime / maxDuration) * 100)}%` }}
                  title={`P85: ${p85LeadTime}d`}
                />
              )}
              
              <div className="absolute inset-0">
                {sortedData.map((d, i) => {
                  const meta = STEP_META[d.stepType as keyof typeof STEP_META];
                  const isOutlier = d.duration > outlierThreshold;
                  const left = isSingle ? 50 : (i / Math.max(sortedData.length - 1, 1)) * 100;
                  const bottomPct = Math.min(100, (d.duration / maxDuration) * 100);
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        'absolute w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-200',
                        isOutlier ? 'bg-red-500' : meta?.dot ?? 'bg-primary'
                      )}
                      style={{ 
                        left: `${left}%`, 
                        transform: 'translate(-50%, -50%)',
                        bottom: `${bottomPct}%` 
                      }}
                      title={`${d.title}: ${d.duration}d (${d.date})`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 pt-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>P85 ({p85LeadTime}d)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Outlier ({'>'}{Math.round(outlierThreshold)}d)</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScatterPlot;