import { useReportsData } from '../useReportsData';
import TimelineChart from '../components/TimelineChart';
import UpcomingDeadlines from '../components/UpcomingDeadlines';

export function ReportsTimelineSubview() {
  const { timelineData, upcomingDeadlines } = useReportsData();

  return (
    <div className="space-y-6">
      <TimelineChart timelineData={timelineData} />
      <UpcomingDeadlines upcomingDeadlines={upcomingDeadlines} />
    </div>
  );
}

export default ReportsTimelineSubview;