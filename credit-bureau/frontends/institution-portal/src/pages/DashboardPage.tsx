import { StatsCard } from '../components/StatsCard';
import './dashboard.css';

const submissionMetrics = [
  { label: 'Submissions today', value: '184', subtext: '+12 vs yesterday', trend: 'up' as const },
  { label: 'Pending validation', value: '9', subtext: '3 require data fixes', trend: 'down' as const }
];

const scoreMetrics = [
  { label: 'Score lookups (24h)', value: '1,284', subtext: 'Peak at 11:00am', trend: 'up' as const },
  { label: 'Average response', value: '420 ms', subtext: 'SLA 600 ms', trend: 'flat' as const }
];

const delinquencyMetrics = [
  { label: 'Accounts 30+ days', value: '312', subtext: '+4% WoW', trend: 'up' as const },
  { label: 'Recovery pipeline', value: '118', subtext: 'In litigation', trend: 'flat' as const }
];

export function DashboardPage() {
  return (
    <section className="dashboard">
      <header>
        <div>
          <h2>Institution snapshot</h2>
          <p>Monitor submissions, score lookups, and delinquency exposures in one place.</p>
        </div>
        <button type="button">Download daily report</button>
      </header>

      <h3>Submissions</h3>
      <div className="stats-grid">
        {submissionMetrics.map((metric) => (
          <StatsCard key={metric.label} {...metric} />
        ))}
      </div>

      <h3>Score lookups</h3>
      <div className="stats-grid">
        {scoreMetrics.map((metric) => (
          <StatsCard key={metric.label} {...metric} />
        ))}
      </div>

      <h3>Delinquency reports</h3>
      <div className="stats-grid">
        {delinquencyMetrics.map((metric) => (
          <StatsCard key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}
