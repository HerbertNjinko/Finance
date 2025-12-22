import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export function ResetPasswordPage() {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [tempPassword, setTempPassword] = useState(location.state?.tempPassword ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const changeMode = location.state?.mode === 'change' || Boolean(location.state?.tempPassword);

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) throw new Error('Reset request failed');
      setMessage('If the email exists, a temporary password has been sent. Please check your inbox.');
    } catch (err) {
      console.error(err);
      setError('Unable to process reset request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: tempPassword, new_password: newPassword })
      });
      if (!response.ok) throw new Error('Reset failed');
      const data = await response.json();
      login({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        role: data.role,
        institutionId: data.institution_id
      });
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={changeMode ? handleChange : handleRequest}>
        <h2>{changeMode ? 'Set new password' : 'Reset password'}</h2>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {changeMode && (
          <>
            <label>
              Temporary password
              <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} required />
            </label>
            <label>
              New password
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </label>
          </>
        )}
        {!changeMode && <p>We will send a temporary password to this email if an account exists.</p>}
        {message && <div style={{ color: '#0f5132' }}>{message}</div>}
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? (changeMode ? 'Updating…' : 'Sending…') : changeMode ? 'Update password' : 'Send reset link'}
        </button>
      </form>
    </div>
  );
}
