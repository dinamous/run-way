import { useReportsData } from '../useReportsData';
import FlowMetricsCards from '../components/FlowMetricsCards';
import StateDistribution from '../components/StateDistribution';
import DemandsTable from '../components/DemandsTable';

export function ReportsGeralSubview() {
  const { filteredEnriched, members, total, active, bloqueadas, semSteps, concluidas, flowMetrics } = useReportsData();

  return (
    <div className="space-y-6">
      <FlowMetricsCards flowMetrics={flowMetrics} />
      
      <div className="grid gap-6">
        <StateDistribution total={total} bloqueadas={bloqueadas} active={active} semSteps={semSteps} concluidas={concluidas} />
      </div>

      <DemandsTable enriched={filteredEnriched} members={members} />
    </div>
  );
}

export default ReportsGeralSubview;