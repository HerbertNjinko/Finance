import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import './layout.css';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/obligations', label: 'Obligations' },
  { to: '/disputes', label: 'Disputes' },
  { to: '/institutions', label: 'Institutions' },
  { to: '/users', label: 'Users' }
];

export function AppLayout({ title }: { title: string }) {
  const location = useLocation();
  const { logout } = useAuth();
  return (
    <div className="layout">
      <aside>
        <h1>{title}</h1>
        <nav>
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className={location.pathname === item.to ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
