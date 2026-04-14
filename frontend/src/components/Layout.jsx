import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Tableau de bord',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    to: '/beneficiaries',
    label: 'Bénéficiaires',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/alerts',
    label: 'Alertes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'Rapports',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'Utilisateurs',
    roles: ['ADMIN_CENTRAL'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 8h2M22 8l-2 2M22 8l-2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/grades',
    label: 'Grille',
    roles: ['ADMIN_CENTRAL'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 3h18v18H3z" stroke="currentColor" strokeWidth="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/audit',
    label: "Journal d'audit",
    roles: ['ADMIN_CENTRAL'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function getRoleLabel(role) {
  if (role === 'SUPER_ADMIN') return 'Super Administrateur';
  if (role === 'ADMIN_CENTRAL') return 'Admin Central';
  if (role === 'AGENT_PROVINCIAL') return 'Agent Provincial';
  if (role === 'AGENT_RECENSEMENT') return 'Agent Recensement';
  return role || '';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const links = NAV_ITEMS.filter((l) => !l.roles || l.roles.includes(user?.role));

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          {sidebarOpen && <span className="sidebar-logo-text">SIRER</span>}
        </div>

        {/* Toggle button */}
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((p) => !p)}
          title={sidebarOpen ? 'Réduire' : 'Agrandir'}
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            {sidebarOpen ? (
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
              title={!sidebarOpen ? l.label : undefined}
            >
              <span className="sidebar-link-icon">{l.icon}</span>
              {sidebarOpen && <span className="sidebar-link-label">{l.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(user?.fullName || 'U')[0].toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.fullName}</span>
                <span className="sidebar-user-role">{getRoleLabel(user?.role)}</span>
                {user?.province && (
                  <span className="sidebar-user-province">{user.province.name}</span>
                )}
              </div>
            )}
          </div>
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="app-content">
        {/* Top bar */}
        <header className="app-topbar">
          <div className="app-topbar-left">
            <div className="app-topbar-breadcrumb">
              <span className="app-topbar-system">Système Intégré de Recensement des Retraités et Rentiers</span>
            </div>
          </div>
          <div className="app-topbar-right">
            {user?.province && (
              <span className="topbar-badge topbar-badge-province">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
                {user.province.name}
              </span>
            )}
            <span className="topbar-badge topbar-badge-role">{getRoleLabel(user?.role)}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
