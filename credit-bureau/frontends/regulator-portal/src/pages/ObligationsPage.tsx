import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Obligation = {
  obligationId: string;
  institutionId: string;
  institutionName?: string;
  borrowerName?: string;
  status: string;
  principalAmount: number;
};

type Repayment = {
  repaymentId: string;
  obligationId: string;
  institutionId: string;
  institutionName?: string;
  borrowerName?: string;
  amount: number;
  currency: string;
  paymentDate: string | null;
  channel?: string | null;
};

export function ObligationsPage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [obligationResponse, repaymentResponse] = await Promise.all([
          api.listObligations(),
          api.listRepayments({ limit: 25 })
        ]);
        setObligations(obligationResponse.items ?? []);
        setRepayments(repaymentResponse.items ?? []);
      } catch (err) {
        console.error(err);
        setError('Unable to load obligation data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalOutstanding = obligations.reduce((sum, obligation) => sum + (obligation.principalAmount || 0), 0);
  const delinquent = obligations.filter((obligation) => obligation.status === 'delinquent').length;

  const byInstitution = useMemo(() => {
    return obligations.reduce<Record<string, { name: string; count: number; outstanding: number; delinquent: number }>>(
      (acc, o) => {
        const key = o.institutionId;
        const entry = acc[key] || {
          name: o.institutionName || o.institutionId,
          count: 0,
          outstanding: 0,
          delinquent: 0
        };
        entry.count += 1;
        entry.outstanding += o.principalAmount || 0;
        if (o.status === 'delinquent') entry.delinquent += 1;
        acc[key] = entry;
        return acc;
      },
      {}
    );
  }, [obligations]);

  const topInstitutions = useMemo(
    () => Object.values(byInstitution).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5),
    [byInstitution]
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Obligation overview</h2>
          <p>System-wide snapshots of exposures and repayments.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Stat label="Outstanding principal" value={loading ? '...' : `${totalOutstanding.toLocaleString()} XAF`} />
        <Stat label="Active obligations" value={loading ? '...' : obligations.length} />
        <Stat label="Delinquent accounts" value={loading ? '...' : delinquent} tone="warning" />
        <Stat
          label="Reporting institutions"
          value={loading ? '...' : topInstitutions.length || Object.keys(byInstitution).length}
          tone="info"
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div className="card">
          <h3>Top institutions by exposure</h3>
          {loading && <p>Loading…</p>}
          {!loading && error && <p>{error}</p>}
          {!loading && !error && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Obligations</th>
                  <th>Outstanding</th>
                  <th>Delinquent</th>
                </tr>
              </thead>
              <tbody>
                {topInstitutions.length === 0 && (
                  <tr>
                    <td colSpan={4}>No data</td>
                  </tr>
                )}
                {topInstitutions.map((inst) => (
                  <tr key={inst.name}>
                    <td>{inst.name}</td>
                    <td>{inst.count}</td>
                    <td>{inst.outstanding.toLocaleString()} XAF</td>
                    <td>{inst.delinquent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>Recent repayments</h3>
          {loading && <p>Loading repayments…</p>}
          {!loading && error && <p>{error}</p>}
          {!loading && !error && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Borrower</th>
                  <th>Institution</th>
                  <th>Amount</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {repayments.length === 0 && (
                  <tr>
                    <td colSpan={5}>No repayments recorded.</td>
                  </tr>
                )}
                {repayments.map((repayment) => (
                  <tr key={repayment.repaymentId}>
                    <td>{repayment.paymentDate ? new Date(repayment.paymentDate).toLocaleDateString() : '—'}</td>
                    <td>{repayment.borrowerName || '—'}</td>
                    <td>{repayment.institutionName || repayment.institutionId}</td>
                    <td>
                      {repayment.amount?.toLocaleString()} {repayment.currency}
                    </td>
                    <td>{repayment.channel ?? '—'}</td>
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

function Stat({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'warning' | 'info' }) {
  const toneClass = tone === 'warning' ? 'stat-warning' : tone === 'info' ? 'stat-info' : 'stat-default';
  return (
    <div className={`card ${toneClass}`}>
      <p style={{ margin: 0, color: '#475467', fontSize: 14 }}>{label}</p>
      <h3 style={{ margin: '6px 0 0' }}>{value}</h3>
    </div>
  );
}
