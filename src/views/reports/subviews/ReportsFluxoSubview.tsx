import { useReportsData } from '../useReportsData';
import ThroughputChart from '../components/ThroughputChart';
import ProcessBottlenecks from '../components/ProcessBottlenecks';
import ScatterPlot from '../components/ScatterPlot';
import StepLoadChart from '../components/StepLoadChart';
import AvgTimeChart from '../components/AvgTimeChart';

export function ReportsFluxoSubview() {
  const { flowMetrics, bottlenecksData, stepLoad, maxStepLoad, avgTimeData } = useReportsData();

  return (
    <div className="space-y-6">
      <ThroughputChart throughput={flowMetrics.throughput} />
      
      <ProcessBottlenecks bottlenecksData={bottlenecksData} p85ByStep={flowMetrics.p85ByStep} />
      
      <ScatterPlot scatterData={flowMetrics.scatterData} p85LeadTime={flowMetrics.p85LeadTime} />
      
      <StepLoadChart stepLoad={stepLoad} maxStepLoad={maxStepLoad} />
      
      <AvgTimeChart avgTimeData={avgTimeData} />
    </div>
  );
}

export default ReportsFluxoSubview;