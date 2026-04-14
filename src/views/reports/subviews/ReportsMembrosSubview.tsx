import { useReportsData } from '../useReportsData';
import TeamCapacity from '../components/TeamCapacity';
import CapacityHeatmap from '../components/CapacityHeatmap';
import WorkloadChart from '../components/WorkloadChart';

export function ReportsMembrosSubview() {
  const { memberLoad, workloadData, heatmapData, flowMetrics } = useReportsData();

  return (
    <div className="space-y-6">
      <TeamCapacity memberLoad={memberLoad} />
      <CapacityHeatmap heatmapData={heatmapData} p85ByStep={flowMetrics.p85ByStep} />
      <WorkloadChart workloadData={workloadData} />
    </div>
  );
}

export default ReportsMembrosSubview;