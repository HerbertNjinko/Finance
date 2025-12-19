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

type Repayment = {
  repaymentId: string;
  obligationId: string;
  paymentDate: string | null;
  amount: number;
  currency: string;
  channel?: string | null;
};

export function ObligationsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'obligations' | 'payments'>('obligations');
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [repaymentsLoading, setRepaymentsLoading] = useState(true);
  const [repaymentsError, setRepaymentsError] = useState<string | null>(null);
  const institutionId = import.meta.env.VITE_INSTITUTION_ID ?? '11111111-1111-1111-1111-111111111111';

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

  useEffect(() => {
    const fetchRepayments = async () => {
      setRepaymentsLoading(true);
      setRepaymentsError(null);
      try {
        const response = await fetch(`/api/repayments?institutionId=${encodeURIComponent(institutionId)}`, {
          headers: {
            'x-api-key': import.meta.env.VITE_GATEWAY_KEY ?? ''
          }
        });
        if (!response.ok) throw new Error('Failed to load repayments');
        const data = await response.json();
        setRepayments(data.items || []);
      } catch (error) {
        console.error(error);
        setRepaymentsError('Unable to fetch repayments');
      } finally {
        setRepaymentsLoading(false);
      }
    };
    fetchRepayments();
  }, [institutionId]);

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
      let records: unknown;
      try {
        records = JSON.parse(text);
        if (!Array.isArray(records)) {
          throw new Error('JSON is not an array of records');
        }
      } catch (jsonError) {
        console.error(jsonError);
        alert('Invalid JSON structure. Please provide an array of records.');
        return;
      }
      const payload = {
        institutionId,
        batchReference: `${uploadType.toUpperCase()}-${Date.now()}`,
        records
      };
      const submissionPath =
        uploadType === 'payments' ? '/api/submissions/payments' : '/api/submissions/obligations';
      const response = await fetch(submissionPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_GATEWAY_KEY ?? ''
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Upload failed');
      alert(`${uploadType === 'payments' ? 'Payment' : 'Obligation'} batch submitted successfully.`);
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

      <section className="card mt-32">
        <header className="table-header">
          <div>
            <h3>Recent repayments</h3>
            <p>Latest repayments reported across this institution.</p>
          </div>
        </header>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Obligation</th>
              <th>Amount</th>
              <th>Channel</th>
            </tr>
          </thead>
          <tbody>
            {repaymentsLoading && (
              <tr>
                <td colSpan={4}>Loading repayments…</td>
              </tr>
            )}
            {!repaymentsLoading && repaymentsError && (
              <tr>
                <td colSpan={4}>{repaymentsError}</td>
              </tr>
            )}
            {!repaymentsLoading && !repaymentsError && repayments.length === 0 && (
              <tr>
                <td colSpan={4}>No repayments reported yet.</td>
              </tr>
            )}
            {repayments.map((repayment) => (
              <tr key={repayment.repaymentId}>
                <td>{repayment.paymentDate ?? '—'}</td>
                <td>{repayment.obligationId.slice(0, 8)}</td>
                <td>
                  {repayment.amount?.toLocaleString()} {repayment.currency}
                </td>
                <td>{repayment.channel ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showUpload && (
        <div className="modal">
          <div className="modal__content">
            <h3>Upload JSON batch</h3>
            <label>
              Batch type
              <select value={uploadType} onChange={(event) => setUploadType(event.target.value as 'obligations' | 'payments')}>
                <option value="obligations">Obligation records</option>
                <option value="payments">Repayment records</option>
              </select>
            </label>
            <p className="text-muted">
              Upload an array of {uploadType === 'payments' ? 'repayment' : 'obligation'} objects. Each submission will be
              wrapped with your institution identifier automatically.
            </p>
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
