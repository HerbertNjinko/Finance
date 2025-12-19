import { useEffect, useMemo, useState } from 'react';
import './table.css';

type Obligation = {
  obligationId: string;
  borrowerName?: string;
  status: string;
  principalAmount: number;
  pastDueAmount?: number;
  nextDueDate?: string;
};

export function ObligationsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObligations = async () => {
      try {
        const response = await fetch('/api/obligations', {
          headers: {
            'x-api-key': import.meta.env.VITE_GATEWAY_KEY ?? ''
          }
        });
        if (!response.ok) throw new Error('Failed to load obligations');
        const data = await response.json();
        setObligations(data.items || []);
      } catch (error) {
        console.error(error);
        alert('Unable to fetch obligations');
      } finally {
        setLoading(false);
      }
    };
    fetchObligations();
  }, []);

  const totals = useMemo(() => {
    const outstanding = obligations.reduce((sum, item) => sum + (item.principalAmount || 0), 0);
    const delinquent = obligations.filter((item) => item.status === 'delinquent').length;
    return { outstanding, delinquent };
  }, [obligations]);

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }
    try {
      setUploading(true);
      const text = await selectedFile.text();
      const payload = {
        institutionId: '11111111-1111-1111-1111-111111111111',
        batchReference: `UPLOAD-${Date.now()}`,
        records: JSON.parse(text)
      };
      const response = await fetch('/api/submissions/obligations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_GATEWAY_KEY ?? ''
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Upload failed');
      alert('Submission sent successfully.');
      setShowUpload(false);
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      alert('Unable to upload batch. Ensure the JSON structure matches the API schema.');
    } finally {
      setUploading(false);
    }
  };

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
        <button type="button" onClick={() => setShowUpload(true)}>
          Upload new batch
        </button>
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
          {loading && (
            <tr>
              <td colSpan={6}>Loading obligations…</td>
            </tr>
          )}
          {!loading && obligations.length === 0 && (
            <tr>
              <td colSpan={6}>No obligations found.</td>
            </tr>
          )}
          {obligations.map((obligation) => (
            <tr key={obligation.obligationId}>
              <td>{obligation.obligationId.slice(0, 8)}</td>
              <td>{obligation.borrowerName ?? '—'}</td>
              <td>
                <span className={`status-pill status-pill--${obligation.status}`}>{obligation.status}</span>
              </td>
              <td>{obligation.principalAmount?.toLocaleString() ?? '-'} XAF</td>
              <td>{obligation.pastDueAmount ? `${obligation.pastDueAmount.toLocaleString()} XAF` : '-'}</td>
              <td>{obligation.nextDueDate ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showUpload && (
        <div className="modal">
          <div className="modal__content">
            <h3>Upload JSON batch</h3>
            <input type="file" accept="application/json" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            <div className="modal__actions">
              <button type="button" onClick={() => setShowUpload(false)}>
                Cancel
              </button>
              <button type="button" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Submit batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
