import { Link, Outlet, useLocation } from 'react-router-dom';
import './layout.css';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/obligations', label: 'Obligations' },
  { to: '/disputes', label: 'Disputes' }
];

export function AppLayout({ title }: { title: string }) {
  const location = useLocation();
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
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
