import { useEffect, useState } from 'react';
import './table.css';

type Dispute = {
  disputeId: string;
  entityId: string;
  reason: string;
  status: string;
  openedAt: string;
  dueAt?: string;
};

export function DisputesPage() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ entityId: '', reason: '', channel: 'portal' });
  const [disputeList, setDisputeList] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const response = await fetch('/api/disputes', {
          headers: { 'x-api-key': import.meta.env.VITE_GATEWAY_KEY ?? '' }
        });
        if (!response.ok) throw new Error('Failed to load disputes');
        const data = await response.json();
        setDisputeList(data.items || []);
      } catch (error) {
        console.error(error);
        alert('Unable to fetch disputes');
      } finally {
        setLoading(false);
      }
    };
    fetchDisputes();
  }, []);

  const handleSubmit = async () => {
    if (!form.entityId || !form.reason) {
      alert('Borrower entity ID and reason are required.');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_GATEWAY_KEY ?? ''
        },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error('Failed to submit dispute');
      alert('Dispute submitted for review.');
      setShowForm(false);
      setForm({ entityId: '', reason: '', channel: 'portal' });
    } catch (error) {
      console.error(error);
      alert('Unable to submit dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <header className="table-header">
        <div>
          <h2>Disputes</h2>
          <p>Prioritize cases needing supporting documents or clarifications.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)}>
          Log new dispute
        </button>
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
          {loading && (
            <tr>
              <td colSpan={6}>Loading disputes…</td>
            </tr>
          )}
          {!loading && disputeList.length === 0 && (
            <tr>
              <td colSpan={6}>No disputes found.</td>
            </tr>
          )}
          {disputeList.map((dispute) => (
            <tr key={dispute.disputeId}>
              <td>{dispute.disputeId.slice(0, 8)}</td>
              <td>{dispute.entityId}</td>
              <td>{dispute.reason}</td>
              <td>
                <span className={`status-pill status-pill--${dispute.status}`}>{dispute.status}</span>
              </td>
              <td>{new Date(dispute.openedAt).toLocaleDateString()}</td>
              <td>{dispute.dueAt ? new Date(dispute.dueAt).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <div className="modal">
          <div className="modal__content">
            <h3>New dispute</h3>
            <label>
              Borrower entity ID
              <input type="text" value={form.entityId} onChange={(event) => setForm({ ...form, entityId: event.target.value })} />
            </label>
            <label>
              Reason
              <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
            </label>
            <label>
              Channel
              <select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}>
                <option value="portal">Portal</option>
                <option value="email">Email</option>
                <option value="branch">Branch</option>
              </select>
            </label>
            <div className="modal__actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
