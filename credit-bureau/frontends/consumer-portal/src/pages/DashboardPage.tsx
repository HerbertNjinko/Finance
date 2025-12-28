import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Score = { score: number; riskTier?: string; modelVersion?: string; calculatedAt?: string };
type Obligation = { status: string; principalAmount?: number; institutionName?: string; nextDueDate?: string; pastDueAmount?: number };
type Repayment = { paymentDate: string | null; amount: number; currency: string; channel?: string; institutionName?: string };
type Dispute = { status: string; reason: string; openedAt: string };

export function DashboardPage() {
  const [score, setScore] = useState<Score | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [scoreRes, oblRes, repRes, dispRes] = await Promise.all([
          api.getScore(),
          api.listObligations({ limit: 10 }),
          api.listRepayments({ limit: 5 }),
          api.listDisputes()
        ]);
        setScore(scoreRes || null);
        setObligations(oblRes.items || []);
        setRepayments(repRes.items || []);
        setDisputes(dispRes.items || []);
      } catch (err) {
        console.error(err);
        setError('Unable to load your credit overview.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const totalObl = obligations.length;
    const delinquent = obligations.filter((o) => o.status === 'delinquent').length;
    const dueSoon = obligations.filter((o) => o.nextDueDate).length;
    return { totalObl, delinquent, dueSoon };
  }, [obligations]);

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Your Credit Overview</h2>
          <p>Recent score, obligations, repayments, and disputes.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Stat label="Credit score" value={loading ? '...' : score?.score ?? '—'} />
        <Stat label="Obligations" value={loading ? '...' : stats.totalObl} />
        <Stat label="Delinquent" value={loading ? '...' : stats.delinquent} tone="warning" />
        <Stat label="Upcoming dues" value={loading ? '...' : stats.dueSoon} tone="info" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div className="card">
          <h3>Obligations</h3>
          {loading && <p>Loading…</p>}
          {!loading && obligations.length === 0 && <p>No obligations found.</p>}
          {!loading && obligations.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Status</th>
                  <th>Principal</th>
                  <th>Next due</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((o, idx) => (
                  <tr key={idx}>
                    <td>{o.institutionName || '—'}</td>
                    <td>
                      <span className={`status-pill status-pill--${o.status}`}>{o.status}</span>
                    </td>
                    <td>{o.principalAmount?.toLocaleString()} XAF</td>
                    <td>{o.nextDueDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>Recent repayments</h3>
          {loading && <p>Loading…</p>}
          {!loading && repayments.length === 0 && <p>No repayments found.</p>}
          {!loading && repayments.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Institution</th>
                  <th>Amount</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {repayments.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '—'}</td>
                    <td>{r.institutionName || '—'}</td>
                    <td>
                      {r.amount?.toLocaleString()} {r.currency}
                    </td>
                    <td>{r.channel || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Disputes</h3>
        {loading && <p>Loading…</p>}
        {!loading && disputes.length === 0 && <p>No disputes found.</p>}
        {!loading && disputes.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Reason</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d, idx) => (
                <tr key={idx}>
                  <td>
                    <span className={`status-pill status-pill--${d.status}`}>{d.status}</span>
                  </td>
                  <td>{d.reason}</td>
                  <td>{new Date(d.openedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'warning' | 'info' }) {
  const toneClass = tone === 'warning' ? 'stat-warning' : tone === 'info' ? 'stat-info' : 'stat-default';
  return (
    <div className={`card ${toneClass}`}>
      <p style={{ margin: 0, color: '#475467', fontSize: 14 }}>{label}</p>
      <h3 style={{ margin: '6px 0 0' }}>{value}</h3>
    </div>
  );
}
