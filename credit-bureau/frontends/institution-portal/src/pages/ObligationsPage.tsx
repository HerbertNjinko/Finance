import { useEffect, useMemo, useState } from 'react';
import './table.css';
import { getTokens } from '../lib/auth';

const authHeader = () => {
  const token = getTokens()?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type Obligation = {
  obligationId: string;
  institutionId: string;
  institutionName?: string;
  borrowerName?: string;
  status: string;
  principalAmount: number;
  pastDueAmount?: number;
  nextDueDate?: string;
};

type Repayment = {
  repaymentId: string;
  obligationId: string;
  institutionId?: string;
  institutionName?: string;
  borrowerName?: string;
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
  const [institutions, setInstitutions] = useState<Record<string, string>>({});
  const [filterInstitution, setFilterInstitution] = useState<string>('');
  const [repaymentPage, setRepaymentPage] = useState(0);
  const [repaymentPageSize] = useState(10);
  const [repaymentTotal, setRepaymentTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const defaultInstitutionId = import.meta.env.VITE_INSTITUTION_ID ?? '11111111-1111-1111-1111-111111111111';
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(defaultInstitutionId);
  const institutionId = filterInstitution || selectedInstitutionId || defaultInstitutionId;

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch('/api/institutions', {
          headers: authHeader()
        });
        if (!response.ok) throw new Error('Failed to load institutions');
        const data = await response.json();
        const map: Record<string, string> = {};
        (data.items || []).forEach((inst: { institutionId: string; name: string }) => {
          map[inst.institutionId] = inst.name;
        });
        setInstitutions(map);
      } catch (error) {
        console.error(error);
      }
    };
    fetchInstitutions();
  }, []);

  useEffect(() => {
    const fetchObligations = async () => {
      try {
        const params = new URLSearchParams();
        params.set('limit', String(pageSize));
        params.set('offset', String(page * pageSize));
        if (filterInstitution) params.set('institutionId', filterInstitution);
        const response = await fetch(`/api/obligations?${params.toString()}`, {
          headers: authHeader()
        });
        if (!response.ok) throw new Error('Failed to load obligations');
        const data = await response.json();
        const items = (data.items || []).map((item: Obligation) => ({
          ...item,
          institutionName: item.institutionName || institutions[item.institutionId] || '—'
        }));
        setObligations(items);
        setTotal(data.total || items.length);
      } catch (error) {
        console.error(error);
        alert('Unable to fetch obligations');
      } finally {
        setLoading(false);
      }
    };
    fetchObligations();
  }, [institutions, filterInstitution, page, pageSize]);

  useEffect(() => {
    const fetchRepayments = async () => {
      setRepaymentsLoading(true);
      setRepaymentsError(null);
      try {
        const params = new URLSearchParams();
        if (filterInstitution) params.set('institutionId', filterInstitution);
        params.set('limit', String(repaymentPageSize));
        params.set('offset', String(repaymentPage * repaymentPageSize));
        const response = await fetch(`/api/repayments${params.toString() ? `?${params.toString()}` : ''}`, {
          headers: authHeader()
        });
        if (!response.ok) throw new Error('Failed to load repayments');
        const data = await response.json();
        const items = (data.items || []).map((item: Repayment) => ({
          ...item,
          institutionName: item.institutionName || institutions[item.institutionId ?? institutionId] || '—'
        }));
        setRepayments(items);
        setRepaymentTotal(data.total ?? items.length);
      } catch (error) {
        console.error(error);
        setRepaymentsError('Unable to fetch repayments');
      } finally {
        setRepaymentsLoading(false);
      }
    };
    fetchRepayments();
  }, [filterInstitution, repaymentPage, repaymentPageSize, institutions, institutionId]);

  const totals = useMemo(() => {
    const outstanding = obligations.reduce((sum, item) => sum + (item.principalAmount || 0), 0);
    const delinquent = obligations.filter((item) => item.status === 'delinquent').length;
    return { outstanding, delinquent };
  }, [obligations]);

  const repaymentTotals = useMemo(() => {
    const byObligation = new Map<string, number>();
    repayments.forEach((p) => {
      byObligation.set(p.obligationId, (byObligation.get(p.obligationId) || 0) + (p.amount || 0));
    });
    return byObligation;
  }, [repayments]);

  const obligationsWithOutstanding = useMemo(() => {
    return obligations.map((o) => {
      const repaid = repaymentTotals.get(o.obligationId) || 0;
      return { ...o, outstanding: Math.max((o.principalAmount || 0) - repaid, 0) };
    });
  }, [obligations, repaymentTotals]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
        institutionId: selectedInstitutionId,
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
        <div className="filters">
          <label>
            Institution
            <select
              value={filterInstitution}
              onChange={(e) => {
                setPage(0);
                setFilterInstitution(e.target.value);
              }}
            >
              <option value="">All institutions</option>
              {Object.entries(institutions).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={() => setShowUpload(true)}>
          Upload new batch
        </button>
      </header>

      <table className="data-table">
        <thead>
          <tr>
            <th>Borrower</th>
            <th>Institution</th>
            <th>Status</th>
            <th>Principal</th>
            <th>Outstanding</th>
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
          {obligationsWithOutstanding.map((obligation) => (
            <tr key={obligation.obligationId}>
              <td>{obligation.borrowerName ?? '—'}</td>
              <td>{obligation.institutionName ?? '—'}</td>
              <td>
                <span className={`status-pill status-pill--${obligation.status}`}>{obligation.status}</span>
              </td>
              <td>{obligation.principalAmount?.toLocaleString() ?? '-'} XAF</td>
              <td>{obligation.outstanding?.toLocaleString() ?? '-'} XAF</td>
              <td>{obligation.pastDueAmount ? `${obligation.pastDueAmount.toLocaleString()} XAF` : '-'}</td>
              <td>{obligation.nextDueDate ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
          Previous
        </button>
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
          disabled={page + 1 >= totalPages}
        >
          Next
        </button>
      </div>

      <section className="card mt-32">
        <header className="table-header">
          <div>
            <h3>Recent repayments</h3>
            <p>Latest repayments reported across {filterInstitution ? 'this institution' : 'all institutions'}.</p>
          </div>
        </header>
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
                <td>{repayment.borrowerName ?? '—'}</td>
                <td>{repayment.institutionName ?? '—'}</td>
                <td>
                  {repayment.amount?.toLocaleString()} {repayment.currency}
                </td>
                <td>{repayment.channel ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <button
            type="button"
            onClick={() => setRepaymentPage((p) => Math.max(p - 1, 0))}
            disabled={repaymentPage === 0}
          >
            Previous
          </button>
          <span>
            Page {repaymentPage + 1} of {Math.max(1, Math.ceil(repaymentTotal / repaymentPageSize))}
          </span>
          <button
            type="button"
            onClick={() =>
              setRepaymentPage((p) =>
                p + 1 < Math.max(1, Math.ceil(repaymentTotal / repaymentPageSize)) ? p + 1 : p
              )
            }
            disabled={repaymentPage + 1 >= Math.max(1, Math.ceil(repaymentTotal / repaymentPageSize))}
          >
            Next
          </button>
        </div>
      </section>

      {showUpload && (
        <div className="modal">
          <div className="modal__content">
            <h3>Upload JSON batch</h3>
            <label>
              Institution to submit as
              <select value={selectedInstitutionId} onChange={(e) => setSelectedInstitutionId(e.target.value)}>
                {Object.entries(institutions).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
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
