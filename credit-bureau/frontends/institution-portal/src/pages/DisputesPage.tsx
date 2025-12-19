import './table.css';

const disputes = [
  { id: 'DSP-778', borrower: 'Nange F.', reason: 'Incorrect balance', status: 'open', opened: '2024-06-21', due: '2024-07-05' },
  { id: 'DSP-765', borrower: 'Douala Logistics', reason: 'Fraud allegation', status: 'pending', opened: '2024-06-14', due: '2024-07-01' },
  { id: 'DSP-742', borrower: 'Petit Shop', reason: 'Late reporting', status: 'resolved', opened: '2024-05-02', due: '2024-05-20' }
];

export function DisputesPage() {
  return (
    <section>
      <header className="table-header">
        <div>
          <h2>Disputes</h2>
          <p>Prioritize cases needing supporting documents or clarifications.</p>
        </div>
        <button type="button">Log new dispute</button>
      </header>

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Borrower</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Opened</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((dispute) => (
            <tr key={dispute.id}>
              <td>{dispute.id}</td>
              <td>{dispute.borrower}</td>
              <td>{dispute.reason}</td>
              <td>
                <span className={`status-pill status-pill--${dispute.status}`}>{dispute.status}</span>
              </td>
              <td>{dispute.opened}</td>
              <td>{dispute.due}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
