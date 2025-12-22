import { useEffect, useState } from 'react';
import './table.css';
import { getTokens } from '../lib/auth';

type Dispute = {
  disputeId: string;
  entityId: string;
  borrowerName?: string;
  institutionName?: string;
  reason: string;
  status: string;
  openedAt: string;
  dueAt?: string;
  resolutionSummary?: string;
};

const statusOptions = ['open', 'pending', 'approved', 'denied', 'closed'];

const authHeader = () => {
  const token = getTokens()?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function DisputesPage() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ entityId: '', borrowerName: '', reason: '', channel: 'portal' });
  const [disputeList, setDisputeList] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageId, setManageId] = useState<string | null>(null);
  const [manageStatus, setManageStatus] = useState<string>('open');
  const [manageResolution, setManageResolution] = useState<string>('');

  const fetchDisputes = async () => {
    try {
      const response = await fetch('/api/disputes', { headers: authHeader() });
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

  useEffect(() => {
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
          ...authHeader()
        },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error('Failed to submit dispute');
      alert('Dispute submitted for review.');
      setShowForm(false);
      setForm({ entityId: '', borrowerName: '', reason: '', channel: 'portal' });
      fetchDisputes();
    } catch (error) {
      console.error(error);
      alert('Unable to submit dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  const openManage = (dispute: Dispute) => {
    setManageId(dispute.disputeId);
    setManageStatus(dispute.status);
    setManageResolution(dispute.resolutionSummary || '');
  };

  const handleManage = async () => {
    if (!manageId) return;
    try {
      const response = await fetch(`/api/disputes/${manageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ status: manageStatus, resolutionSummary: manageResolution })
      });
      if (!response.ok) throw new Error('Failed to update dispute');
      setManageId(null);
      await fetchDisputes();
    } catch (error) {
      console.error(error);
      alert('Unable to update dispute.');
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
            <th>Institution</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Opened</th>
            <th>Due</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7}>Loading disputes…</td>
            </tr>
          )}
          {!loading && disputeList.length === 0 && (
            <tr>
              <td colSpan={7}>No disputes found.</td>
            </tr>
          )}
          {disputeList.map((dispute) => (
            <tr key={dispute.disputeId}>
              <td>{dispute.disputeId.slice(0, 8)}</td>
              <td>{dispute.borrowerName || dispute.entityId}</td>
              <td>{dispute.institutionName || '—'}</td>
              <td>{dispute.reason}</td>
              <td>
                <span className={`status-pill status-pill--${dispute.status}`}>{dispute.status}</span>
              </td>
              <td>{new Date(dispute.openedAt).toLocaleDateString()}</td>
              <td>{dispute.dueAt ? new Date(dispute.dueAt).toLocaleDateString() : '-'}</td>
              <td>
                <button type="button" onClick={() => openManage(dispute)}>
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <div className="modal">
          <div className="modal__content">
            <h3>New dispute</h3>
            <label>
              Borrower name (optional)
              <input
                type="text"
                value={form.borrowerName}
                onChange={(event) => setForm({ ...form, borrowerName: event.target.value })}
              />
            </label>
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
            <label>
              Attachments (supporting docs)
              <input type="file" multiple />
              <small>Upload evidence; files are not sent in this demo.</small>
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

      {manageId && (
        <div className="modal">
          <div className="modal__content">
            <h3>Update dispute</h3>
            <label>
              Status
              <select value={manageStatus} onChange={(e) => setManageStatus(e.target.value)}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Resolution / notes
              <textarea value={manageResolution} onChange={(e) => setManageResolution(e.target.value)} />
            </label>
            <label>
              Request supporting documents
              <input type="file" multiple />
              <small>Upload requests can be added here; files are not persisted in this demo.</small>
            </label>
            <div className="modal__actions">
              <button type="button" onClick={() => setManageId(null)}>
                Cancel
              </button>
              <button type="button" onClick={handleManage}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
