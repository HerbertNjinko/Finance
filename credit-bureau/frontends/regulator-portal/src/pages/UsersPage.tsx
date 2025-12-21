import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

type User = {
  user_id: string;
  email: string;
  role: string;
  institution_id?: string;
  status: string;
  created_at?: string;
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'institution' | 'regulator'>('institution');
  const [inviteInstitution, setInviteInstitution] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listUsers();
      setUsers(data.items || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.inviteUser({
        email: inviteEmail,
        role: inviteRole,
        institutionId: inviteRole === 'institution' ? inviteInstitution || undefined : undefined
      });
      setInviteEmail('');
      setInviteInstitution('');
      await loadUsers();
      alert('Invite sent');
    } catch (err) {
      console.error(err);
      alert('Failed to send invite');
    }
  };

  const handleStatus = async (userId: string, status: string) => {
    try {
      await api.updateUserStatus(userId, { status });
      await loadUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  return (
    <section>
      <header className="table-header">
        <div>
          <h2>Users</h2>
          <p>Manage regulator and institution users.</p>
        </div>
      </header>

      <form className="card" onSubmit={handleInvite} style={{ display: 'grid', gap: '12px', maxWidth: 520 }}>
        <h3>Invite user</h3>
        <label>
          Email
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
        </label>
        <label>
          Role
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'institution' | 'regulator')}>
            <option value="institution">Institution</option>
            <option value="regulator">Regulator</option>
          </select>
        </label>
        {inviteRole === 'institution' && (
          <label>
            Institution ID
            <input
              type="text"
              placeholder="Institution UUID"
              value={inviteInstitution}
              onChange={(e) => setInviteInstitution(e.target.value)}
              required
            />
          </label>
        )}
        <button type="submit">Send invite</button>
      </form>

      <div className="card mt-24">
        <h3>Existing users</h3>
        {loading && <p>Loading…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Institution</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.institution_id || '—'}</td>
                  <td>{user.status}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => handleStatus(user.user_id, 'active')}>
                      Activate
                    </button>
                    <button type="button" onClick={() => handleStatus(user.user_id, 'locked')}>
                      Lock
                    </button>
                    <button type="button" onClick={() => handleStatus(user.user_id, 'reset_required')}>
                      Reset required
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
