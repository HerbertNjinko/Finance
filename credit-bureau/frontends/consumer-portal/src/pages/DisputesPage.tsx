import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Dispute = {
  disputeId: string;
  status: string;
  reason: string;
  openedAt: string;
  resolutionSummary?: string;
};

export function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');

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

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!reason) {
      alert('Please enter a reason');
      return;
    }
    try {
      await api.createDispute({ reason, channel: 'portal' });
      setShowForm(false);
      setReason('');
      load();
    } catch (err) {
      console.error(err);
      alert('Unable to submit dispute');
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Disputes</h2>
          <p>Track submitted disputes and create new ones.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)}>
          New dispute
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Opened</th>
            <th>Resolution</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5}>Loading…</td>
            </tr>
          )}
          {!loading && disputes.length === 0 && (
            <tr>
              <td colSpan={5}>No disputes found.</td>
            </tr>
          )}
          {disputes.map((d) => (
            <tr key={d.disputeId}>
              <td>{d.disputeId.slice(0, 8)}</td>
              <td>
                <span className={`status-pill status-pill--${d.status}`}>{d.status}</span>
              </td>
              <td>{d.reason}</td>
              <td>{new Date(d.openedAt).toLocaleDateString()}</td>
              <td>{d.resolutionSummary || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <div className="modal">
          <div className="modal__content">
            <h3>New dispute</h3>
            <label>
              Reason
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="modal__actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="button" onClick={submit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
