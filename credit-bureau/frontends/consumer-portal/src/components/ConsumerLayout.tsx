import { Link, Outlet, useLocation } from 'react-router-dom';
import './layout.css';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/disputes', label: 'Disputes' },
  { to: '/profile', label: 'Profile' }
];

export function ConsumerLayout() {
  const location = useLocation();
  return (
    <div className="layout">
      <aside>
        <h1>Consumer Portal</h1>
        <nav>
          {navItems.map((item) => (
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
