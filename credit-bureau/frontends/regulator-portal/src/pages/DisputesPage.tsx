import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Dispute = {
  disputeId: string;
  entityId: string;
  borrowerName?: string;
  obligationId?: string;
  status: string;
  reason: string;
  openedAt: string;
  dueAt?: string;
  resolutionSummary?: string;
};

const statusTone: Record<string, string> = {
  open: 'warning',
  pending: 'warning',
  approved: 'success',
  denied: 'danger',
  closed: 'default'
};

export function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listDisputes();
        setDisputes(data.items || []);
      } catch (err) {
        console.error(err);
        setError('Unable to load disputes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pending = disputes.filter((d) => d.status === 'open' || d.status === 'pending');
  const recentlyClosed = disputes.filter((d) => d.status === 'approved' || d.status === 'denied' || d.status === 'closed').slice(0, 5);

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Disputes</h2>
          <p>Monitor disputes requiring action.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Stat label="Open/pending disputes" value={loading ? '...' : pending.length} tone="warning" />
        <Stat label="Total disputes" value={loading ? '...' : disputes.length} />
        <Stat
          label="Resolved/closed"
          value={loading ? '...' : disputes.length - pending.length}
          tone={pending.length ? 'default' : 'success'}
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div className="card">
          <h3>Needs attention</h3>
          {loading && <p>Loading…</p>}
          {!loading && pending.length === 0 && <p>No open or pending disputes.</p>}
          {!loading && pending.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Borrower</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Opened</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((d) => (
                  <tr key={d.disputeId}>
                    <td>{d.disputeId.slice(0, 8)}</td>
                    <td>{d.borrowerName || d.entityId}</td>
                    <td>
                      <span className={`status-pill status-pill--${d.status}`}>{d.status}</span>
                    </td>
                    <td>{d.reason}</td>
                    <td>{new Date(d.openedAt).toLocaleDateString()}</td>
                    <td>{d.dueAt ? new Date(d.dueAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>Recent resolutions</h3>
          {loading && <p>Loading…</p>}
          {!loading && recentlyClosed.length === 0 && <p>No recent resolutions.</p>}
          {!loading && recentlyClosed.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Resolution</th>
                  <th>Closed/Due</th>
                </tr>
              </thead>
              <tbody>
                {recentlyClosed.map((d) => (
                  <tr key={d.disputeId}>
                    <td>{d.disputeId.slice(0, 8)}</td>
                    <td>
                      <span className={`status-pill status-pill--${d.status}`}>{d.status}</span>
                    </td>
                    <td>{d.reason}</td>
                    <td>{d.resolutionSummary || '—'}</td>
                    <td>{d.dueAt ? new Date(d.dueAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'warning' | 'success' }) {
  const toneClass = tone === 'warning' ? 'stat-warning' : tone === 'success' ? 'stat-success' : 'stat-default';
  return (
    <div className={`card ${toneClass}`}>
      <p style={{ margin: 0, color: '#475467', fontSize: 14 }}>{label}</p>
      <h3 style={{ margin: '6px 0 0' }}>{value}</h3>
    </div>
  );
}
