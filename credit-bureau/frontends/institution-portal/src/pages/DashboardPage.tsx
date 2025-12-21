import { useEffect, useMemo, useState } from 'react';
import { StatsCard } from '../components/StatsCard';
import './dashboard.css';
import { getTokens } from '../lib/auth';

const authHeader = () => {
  const token = getTokens()?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function DashboardPage() {
  const [isDownloading, setDownloading] = useState(false);
  const [obligations, setObligations] = useState<any[]>([]);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const institutionId = import.meta.env.VITE_INSTITUTION_ID ?? '11111111-1111-1111-1111-111111111111';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [oblRes, repRes] = await Promise.all([
          fetch('/api/obligations', { headers: authHeader() }),
          fetch(`/api/repayments?institutionId=${encodeURIComponent(institutionId)}`, {
            headers: authHeader()
          })
        ]);
        const oblJson = await oblRes.json();
        const repJson = await repRes.json();
        setObligations(oblJson.items || []);
        setRepayments(repJson.items || []);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [institutionId]);

  const stats = useMemo(() => {
    const totalPrincipal = obligations.reduce((sum, o) => sum + (o.principalAmount || 0), 0);
    const delinquent = obligations.filter((o) => o.status === 'delinquent').length;
    const recentRepayments = repayments.slice(0, 5).reduce((sum, r) => sum + (r.amount || 0), 0);
    return {
      totalPrincipal,
      delinquent,
      repaymentTotal: recentRepayments,
      obligationCount: obligations.length
    };
  }, [obligations, repayments]);

  const handleDailyReport = async () => {
    try {
      setDownloading(true);
      const response = await fetch('/api/reports/daily', {
        headers: authHeader()
      });
      if (!response.ok) {
        throw new Error('Failed to download');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `daily-report-${new Date().toISOString().split('T')[0]}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Unable to download report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="dashboard">
      <header>
        <div>
          <h2>Institution snapshot</h2>
          <p>Monitor submissions, score lookups, and delinquency exposures in one place.</p>
        </div>
        <button type="button" onClick={handleDailyReport} disabled={isDownloading}>
          {isDownloading ? 'Preparing...' : 'Download daily report'}
        </button>
      </header>

      <h3>Submissions</h3>
      <div className="stats-grid">
        <StatsCard
          label="Active obligations"
          value={loading ? '...' : String(stats.obligationCount)}
          subtext="Current portfolio"
          trend="flat"
        />
        <StatsCard
          label="Outstanding principal"
          value={loading ? '...' : `${stats.totalPrincipal.toLocaleString()} XAF`}
          subtext="Sum of active obligations"
          trend="flat"
        />
      </div>

      <h3>Repayments</h3>
      <div className="stats-grid">
        <StatsCard
          label="Recent repayments"
          value={loading ? '...' : `${stats.repaymentTotal.toLocaleString()} XAF`}
          subtext="Last few reported"
          trend="flat"
        />
        <StatsCard
          label="Delinquent accounts"
          value={loading ? '...' : String(stats.delinquent)}
          subtext="Status: delinquent"
          trend={stats.delinquent > 0 ? 'down' : 'up'}
        />
      </div>
    </section>
  );
}
