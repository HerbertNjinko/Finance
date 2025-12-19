import { useMemo } from 'react';
import './table.css';

const mockObligations = [
  { reference: 'OBL-10293', borrower: 'Aminatou F.', status: 'active', principal: 6000000, pastDue: 0, nextDue: '2024-07-15' },
  { reference: 'OBL-10276', borrower: 'Tchoumi Logistics', status: 'delinquent', principal: 15000000, pastDue: 900000, nextDue: '2024-06-01' },
  { reference: 'OBL-10211', borrower: 'Mbah S.', status: 'closed', principal: 2500000, pastDue: 0, nextDue: '-' }
];

export function ObligationsPage() {
  const totals = useMemo(() => {
    const outstanding = mockObligations.reduce((sum, item) => sum + item.principal, 0);
    const delinquent = mockObligations.filter((item) => item.status === 'delinquent').length;
    return { outstanding, delinquent };
  }, []);

  return (
    <section>
      <header className="table-header">
        <div>
          <h2>Obligations</h2>
          <p>Track active portfolios, delinquent exposures, and repayment statuses.</p>
        </div>
        <div className="table-header__metrics">
          <span>
            Outstanding principal
            <strong>{totals.outstanding.toLocaleString()} XAF</strong>
          </span>
          <span>
            Delinquent accounts
            <strong>{totals.delinquent}</strong>
          </span>
        </div>
        <button type="button">Upload new batch</button>
      </header>

      <table className="data-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Borrower</th>
            <th>Status</th>
            <th>Principal</th>
            <th>Past due</th>
            <th>Next due</th>
          </tr>
        </thead>
        <tbody>
          {mockObligations.map((obligation) => (
            <tr key={obligation.reference}>
              <td>{obligation.reference}</td>
              <td>{obligation.borrower}</td>
              <td>
                <span className={`status-pill status-pill--${obligation.status}`}>{obligation.status}</span>
              </td>
              <td>{obligation.principal.toLocaleString()} XAF</td>
              <td>{obligation.pastDue ? `${obligation.pastDue.toLocaleString()} XAF` : '-'}</td>
              <td>{obligation.nextDue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
