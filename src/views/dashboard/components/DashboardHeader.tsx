import { CalendarDays, AlignLeft, List } from 'lucide-react';

export type CalView = 'calendar' | 'timeline' | 'list';

interface DashboardHeaderProps {
  calView: CalView;
  onChangeView: (view: CalView) => void;
}

export function DashboardHeader({ calView, onChangeView }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 print:hidden">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Visão Geral</h2>
        <p className="text-muted-foreground text-sm">Gestão das entregas criativas e de desenvolvimento.</p>
      </div>
      <div className="w-full lg:w-auto">
        <div className="inline-flex w-full sm:w-auto bg-muted rounded-lg p-1 gap-1">
          <button
            onClick={() => onChangeView('calendar')}
            className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'calendar' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendário
          </button>
          <button
            onClick={() => onChangeView('timeline')}
            className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'timeline' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <AlignLeft className="w-3.5 h-3.5" /> Linha do Tempo
          </button>
          <button
            onClick={() => onChangeView('list')}
            className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>
      </div>
    </div>
  );
}
