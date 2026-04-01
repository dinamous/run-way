import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, BarChart2, AlertCircle, Zap } from 'lucide-react';
import KpiCard from './KpiCard';

interface KpiCardsProps {
  total: number;
  active: number;
  atrasadas: number;
  emRisco: number;
  bloqueadas: number;
  semSteps: number;
}

const KpiCards: React.FC<KpiCardsProps> = ({ total, active, atrasadas, emRisco, bloqueadas, semSteps }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    <KpiCard icon={<BarChart2 className="w-4 h-4 text-blue-600" />}       label="Total"        value={total}     color="bg-blue-50 dark:bg-blue-950" />
    <KpiCard icon={<Zap className="w-4 h-4 text-sky-600" />}              label="Em andamento" value={active}    color="bg-sky-50 dark:bg-sky-950" />
    <KpiCard icon={<AlertCircle className="w-4 h-4 text-red-600" />}      label="Atrasadas"    value={atrasadas} color="bg-red-50 dark:bg-red-950" />
    <KpiCard icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />} label="Em risco"     value={emRisco}   color="bg-yellow-50 dark:bg-yellow-950" />
    <KpiCard icon={<Clock className="w-4 h-4 text-orange-600" />}         label="Bloqueadas"   value={bloqueadas} color="bg-orange-50 dark:bg-orange-950" />
    <KpiCard icon={<CheckCircle2 className="w-4 h-4 text-muted-foreground" />} label="Sem steps" value={semSteps} color="bg-muted" />
  </div>
);

export default KpiCards;
