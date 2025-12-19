import './stats-card.css';

type Trend = 'up' | 'down' | 'flat';

interface StatsCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: Trend;
}

export function StatsCard({ label, value, subtext, trend = 'flat' }: StatsCardProps) {
  return (
    <article className={`stats-card stats-card--${trend}`}>
      <header>
        <p>{label}</p>
        {trend !== 'flat' && <span>{trend === 'up' ? '▲' : '▼'}</span>}
      </header>
      <strong>{value}</strong>
      {subtext && <small>{subtext}</small>}
    </article>
  );
}
