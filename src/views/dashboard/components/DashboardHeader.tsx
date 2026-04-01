import { Button } from '@/components/ui';
import { Plus, Download, CalendarDays, AlignLeft } from 'lucide-react';

interface DashboardHeaderProps {
  calView: 'calendar' | 'timeline';
  onChangeView: (view: 'calendar' | 'timeline') => void;
  onExport: () => void;
  onOpenNew: () => void;
}

export function DashboardHeader({ calView, onChangeView, onExport, onOpenNew }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Visão Geral</h2>
        <p className="text-muted-foreground text-sm">Gestão das entregas criativas e de desenvolvimento.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          <button
            onClick={() => onChangeView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'calendar' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendário
          </button>
          <button
            onClick={() => onChangeView('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'timeline' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <AlignLeft className="w-3.5 h-3.5" /> Linha do Tempo
          </button>
        </div>
        <Button variant="outline" onClick={onExport}><Download className="w-4 h-4 mr-1.5" /> PDF</Button>
        <Button onClick={onOpenNew}><Plus className="w-4 h-4 mr-1.5" /> Nova Demanda</Button>
      </div>
    </div>
  );
}
