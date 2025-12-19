import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

type Institution = {
  institutionId: string;
  name: string;
  shortCode: string;
  institutionType: string;
  contactEmail: string;
  contactPhone?: string;
  status: string;
};

const defaultForm = {
  name: '',
  shortCode: '',
  institutionType: 'bank',
  contactEmail: '',
  contactPhone: ''
};

export function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listInstitutions();
        setInstitutions(data.items ?? []);
      } catch (err) {
        console.error(err);
        setError('Unable to fetch institutions.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function refreshInstitutions() {
    try {
      const data = await api.listInstitutions();
      setInstitutions(data.items ?? []);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch institutions.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateInstitution(editingId, form);
      } else {
        await api.createInstitution(form);
      }
      setForm(defaultForm);
      setEditingId(null);
      await refreshInstitutions();
    } catch (err) {
      console.error(err);
      setError('Failed to save institution. Please verify the details.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(institution: Institution) {
    setForm({
      name: institution.name,
      shortCode: institution.shortCode,
      institutionType: institution.institutionType,
      contactEmail: institution.contactEmail,
      contactPhone: institution.contactPhone ?? ''
    });
    setEditingId(institution.institutionId);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(defaultForm);
  }

  async function handleDelete(institutionId: string) {
    if (!window.confirm('Delete this institution?')) {
      return;
    }
    setError(null);
    try {
      await api.deleteInstitution(institutionId);
      if (editingId === institutionId) {
        cancelEdit();
      }
      await refreshInstitutions();
    } catch (err) {
      console.error(err);
      setError('Failed to delete institution.');
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Institutions</h2>
          <p>Register new reporting institutions and review existing participants.</p>
        </div>
      </header>

      <div className="grid">
        <form className="card" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit institution' : 'Register institution'}</h3>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label>
            Short code
            <input
              type="text"
              value={form.shortCode}
              onChange={(event) => setForm({ ...form, shortCode: event.target.value.toUpperCase() })}
              required
            />
          </label>
          <label>
            Institution type
            <select
              value={form.institutionType}
              onChange={(event) => setForm({ ...form, institutionType: event.target.value })}
            >
              <option value="bank">Bank</option>
              <option value="mfi">Microfinance</option>
              <option value="telco">Telco</option>
              <option value="utility">Utility</option>
            </select>
          </label>
          <label>
            Contact email
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
              required
            />
          </label>
          <label>
            Contact phone
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Update institution' : 'Register'}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={cancelEdit} disabled={submitting}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="card">
          <h3>Active institutions</h3>
          {loading ? (
            <p>Loading institutions…</p>
          ) : institutions.length === 0 ? (
            <p>No institutions registered yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Short code</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                <tr key={inst.institutionId}>
                  <td>{inst.name}</td>
                  <td>{inst.shortCode}</td>
                  <td>{inst.institutionType}</td>
                  <td>
                    <div>{inst.contactEmail}</div>
                    {inst.contactPhone && <small>{inst.contactPhone}</small>}
                  </td>
                  <td>
                    <div>{inst.status}</div>
                    <div className="table-actions">
                      <button type="button" onClick={() => startEdit(inst)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => handleDelete(inst.institutionId)}>
                        Delete
                      </button>
                    </div>
                  </td>
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
