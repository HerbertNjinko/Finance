import { useState } from 'react';

export function ProfilePage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    alert('Profile saved (placeholder).');
  };

  return (
    <section>
      <h2>Profile</h2>
      <p>Manage your personal information and notification preferences.</p>
      <div className="card" style={{ maxWidth: 480 }}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>
          Phone
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237..." />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
          Receive email notifications
        </label>
        <button type="button" onClick={handleSave}>
          Save
        </button>
      </div>
    </section>
  );
}
