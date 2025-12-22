import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Obligation = { status: string; principalAmount?: number };
type Dispute = { status: string; reason: string; disputeId: string; openedAt: string };
type Repayment = { amount: number; currency: string; paymentDate: string; borrowerName?: string; institutionName?: string };

export function DashboardPage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [obl, disp, reps] = await Promise.all([api.listObligations(), api.listDisputes(), api.listRepayments()]);
        setObligations(obl.items || []);
        setDisputes(disp.items || []);
        setRepayments(reps.items || []);
      } catch (err) {
        console.error(err);
        setError('Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const totalObl = obligations.length;
    const delinquent = obligations.filter((o) => o.status === 'delinquent').length;
    const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'pending').length;
    const repaymentTotal = repayments.reduce((sum, r) => sum + (r.amount || 0), 0);
    return { totalObl, delinquent, openDisputes, repaymentTotal };
  }, [obligations, disputes, repayments]);

  const recentDisputes = disputes.slice(0, 5);
  const recentRepayments = repayments.slice(0, 5);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Dashboard overview</h2>
          <p>High-level metrics, alerts, and summaries across all institutions.</p>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard label="Active obligations" value={loading ? '...' : stats.totalObl} />
        <StatCard label="Delinquent accounts" value={loading ? '...' : stats.delinquent} tone="warning" />
        <StatCard
          label="Open/pending disputes"
          value={loading ? '...' : stats.openDisputes}
          tone={stats.openDisputes ? 'warning' : 'success'}
        />
        <StatCard
          label="Recent repayment volume"
          value={loading ? '...' : `${stats.repaymentTotal.toLocaleString()} XAF`}
          tone="info"
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div className="card">
          <h3>Recent disputes</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {recentDisputes.length === 0 && (
                <tr>
                  <td colSpan={4}>No disputes</td>
                </tr>
              )}
              {recentDisputes.map((d) => (
                <tr key={d.disputeId}>
                  <td>{d.disputeId.slice(0, 8)}</td>
                  <td>
                    <span className={`status-pill status-pill--${d.status}`}>{d.status}</span>
                  </td>
                  <td>{d.reason}</td>
                  <td>{new Date(d.openedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Recent repayments</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Borrower</th>
                <th>Institution</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentRepayments.length === 0 && (
                <tr>
                  <td colSpan={4}>No repayments</td>
                </tr>
              )}
              {recentRepayments.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '—'}</td>
                  <td>{r.borrowerName || '—'}</td>
                  <td>{r.institutionName || '—'}</td>
                  <td>
                    {r.amount?.toLocaleString()} {r.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'warning' | 'info' | 'success' }) {
  const toneClass =
    tone === 'warning' ? 'stat-warning' : tone === 'info' ? 'stat-info' : tone === 'success' ? 'stat-success' : 'stat-default';
  return (
    <div className={`card ${toneClass}`}>
      <p style={{ margin: 0, color: '#475467', fontSize: 14 }}>{label}</p>
      <h3 style={{ margin: '6px 0 0' }}>{value}</h3>
    </div>
  );
}
