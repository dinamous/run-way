import React from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, sub, color }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm">
    <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default KpiCard;
