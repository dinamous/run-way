import React from 'react';
import { useReportsData } from './useReportsData';
import { todayStr } from './utils';
import { formatDateToBR } from '@/lib/utils';
import { ViewState } from '@/components/ViewState';
import { Skeleton } from 'boneyard-js/react';
import { FileBarChart } from 'lucide-react';
import {
  ReportsGeralSubview,
  ReportsFluxoSubview,
  ReportsTimelineSubview,
  ReportsMembrosSubview,
  ReportsAlertasSubview,
} from './subviews';

type ReportsSubview = 'geral' | 'fluxo' | 'timeline' | 'membros' | 'alertas';

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

interface ReportsViewProps {
  subview?: ReportsSubview;
}

const ReportsView: React.FC<ReportsViewProps> = ({ subview = 'geral' }) => {
  const {
    isLoading,
    errorMessage,
    total,
    members,
    timeFilter,
    setTimeFilter,
    memberFilter,
    setMemberFilter,
  } = useReportsData();

  const today = todayStr();

  if (errorMessage && total === 0 && isLoading) {
    return (
      <ViewState
        icon={FileBarChart}
        title="Erro ao carregar relatórios"
        description={`Não foi possível obter dados no banco. Detalhe: ${errorMessage}`}
      />
    );
  }

  if (total === 0 && !isLoading) {
    return (
      <ViewState
        icon={FileBarChart}
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

        {subview === 'geral' && <ReportsGeralSubview />}
        {subview === 'fluxo' && <ReportsFluxoSubview />}
        {subview === 'timeline' && <ReportsTimelineSubview />}
        {subview === 'membros' && <ReportsMembrosSubview />}
        {subview === 'alertas' && <ReportsAlertasSubview />}
      </div>
    </Skeleton>
  );
};

export default ReportsView;

export type { ReportsSubview };