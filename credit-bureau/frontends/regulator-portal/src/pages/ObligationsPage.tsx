import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Obligation = {
  obligationId: string;
  institutionId: string;
  status: string;
  principalAmount: number;
};

type Repayment = {
  repaymentId: string;
  obligationId: string;
  institutionId: string;
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

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Obligation overview</h2>
          <p>System-wide snapshots of exposures and repayments.</p>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Portfolio metrics</h3>
          {loading ? (
            <p>Loading metrics…</p>
          ) : error ? (
            <p>{error}</p>
          ) : (
            <div className="table-header__metrics">
              <span>
                Outstanding principal
                <strong>{totalOutstanding.toLocaleString()} XAF</strong>
              </span>
              <span>
                Delinquent accounts
                <strong>{delinquent}</strong>
              </span>
            </div>
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
                  <th>Obligation</th>
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
                    <td>{repayment.paymentDate ?? '—'}</td>
                    <td>{repayment.obligationId.slice(0, 8)}</td>
                    <td>{repayment.institutionId.slice(0, 8)}</td>
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
