import { useReportsData } from '../useReportsData';
import PredictiveAlerts from '../components/PredictiveAlerts';
import AlertsSection from '../components/AlertsSection';
import UpcomingDeadlines from '../components/UpcomingDeadlines';

export function ReportsAlertasSubview() {
  const { filteredEnriched, upcomingDeadlines, flowMetrics } = useReportsData();

  return (
    <div className="space-y-6">
      <PredictiveAlerts enriched={filteredEnriched} p85ByStep={flowMetrics.p85ByStep} />
      <AlertsSection enriched={filteredEnriched} />
      <UpcomingDeadlines upcomingDeadlines={upcomingDeadlines} />
    </div>
  );
}

export default ReportsAlertasSubview;