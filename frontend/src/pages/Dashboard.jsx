import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboard as dashboardApi } from '../api';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Chargement du tableau de bord…</div>;
  if (!stats) return <div className="card">Impossible de charger les statistiques.</div>;

  return (
    <>
      <div className="card dashboard-header">
        <div className="dashboard-header-main">
          <h1>Tableau de bord / {user?.fullName}</h1>
          <p>Vue d&apos;ensemble des bénéficiaires, de leur statut et des alertes</p>
        </div>
        <div className="dashboard-header-pills">
          <span className="pill pill-success">{stats.actifs} actifs</span>
          <span className="pill pill-warning">{stats.suspendus} suspendus</span>
          <span className="pill pill-danger">{stats.alertesOuvertes} alertes ouvertes</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-accent">
          <div className="stat-card-top">
            <div className="icon-box" style={{ background: 'rgba(201, 162, 39, 0.1)', color: 'var(--gold)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="value">{stats.totalBeneficiaries}</div>
          </div>
          <div className="label">{user?.role === 'ADMIN_CENTRAL' ? 'Bénéficiaires au registre national' : 'Mes bénéficiaires créés'}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="icon-box" style={{ background: 'rgba(31, 107, 69, 0.1)', color: '#1f6b45' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="value">{stats.actifs}</div>
          </div>
          <div className="label">Bénéficiaires actifs</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="icon-box" style={{ background: 'rgba(183, 121, 31, 0.1)', color: '#b7791f' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="value">{stats.suspendus}</div>
          </div>
          <div className="label">Suspensions en cours</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="icon-box" style={{ background: 'rgba(197, 48, 48, 0.1)', color: '#c53030' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className="value">{stats.alertesOuvertes}</div>
          </div>
          <div className="label">Alertes à traiter</div>
        </div>

        {user?.role === 'ADMIN_CENTRAL' && stats.totalUsers !== undefined && (
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="value">{stats.totalUsers}</div>
            </div>
            <div className="label">Utilisateurs enregistrés</div>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 8, height: 24, background: 'var(--gold)', borderRadius: 4 }}></div>
            <h2 style={{ margin: 0 }}>Répartition par type</h2>
          </div>
          <ul className="dashboard-type-list">
            {Object.entries(stats.parType || {}).map(([type, count]) => (
              <li key={type} style={{ padding: '0.75rem 0' }}>
                <span className="type-label" style={{ fontWeight: 500 }}>{type}</span>
                <span className="type-count" style={{ background: 'var(--color-bg-alt)', color: 'var(--navy-primary)', fontWeight: 700 }}>{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card dashboard-shortcuts" style={{ background: 'var(--color-bg-alt)', border: 'none' }}>
          <h2>Actions rapides</h2>
          <p style={{ marginTop: 0, marginBottom: '1.25rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Accédez directement aux services essentiels de la plateforme.
          </p>
          <div className="dashboard-shortcuts-grid">
            <Link to="/beneficiaries" className="btn btn-primary" style={{ padding: '0.8rem' }}>
              Gérer les bénéficiaires
            </Link>
            <Link to="/alerts" className="btn btn-secondary" style={{ background: '#fff' }}>
              Voir les alertes
            </Link>
            <Link to="/reports" className="btn btn-secondary" style={{ background: '#fff' }}>
              Rapports et statistiques
            </Link>
          </div>
        </div>
      </div>

      {stats.parProvince?.length > 0 && (
        <div className="card">
          <h2>Répartition par province</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Nombre de bénéficiaires</th>
                </tr>
              </thead>
              <tbody>
                {stats.parProvince.map((p) => (
                  <tr key={p.provinceId}>
                    <td>{p.provinceName}</td>
                    <td>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
