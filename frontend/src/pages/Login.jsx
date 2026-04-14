import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-shell">
        {/* Left panel */}
        <div className="login-panel">
          <div className="login-panel-top">
            <div className="login-logo">
              <div className="login-logo-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="login-logo-text">SIRER</span>
            </div>
            <p className="login-panel-subtitle">
              Système Intégré de Recensement<br />des Retraités et Rentiers
            </p>
          </div>

          <div className="login-panel-features">
            <div className="login-feature">
              <div className="login-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <span>Vue nationale des retraités et rentiers</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span>Règles métiers automatisées pour les orphelins</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <span>Alertes, cartes sécurisées et journal d'audit</span>
            </div>
          </div>

          <p className="login-panel-footer">
            🔒 Accès réservé aux agents autorisés du Ministère de la Fonction Publique / SGRR
          </p>
        </div>

        {/* Right form */}
        <div className="login-box">
          <div className="login-box-header">
            <div className="login-box-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /></svg>
            </div>
            <div>
              <h2 className="login-box-title">Connexion</h2>
              <p className="login-box-subtitle">Accédez à votre espace SIRER</p>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Adresse e-mail</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" /><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" /></svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="nope"
                  placeholder="votre@email.com"
                  className="login-input"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Mot de passe</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="login-input"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.8rem' }}>Vous êtes un bénéficiaire déjà enregistré ?</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/verification')}
              style={{ width: '100%', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              🔍 Vérifier mon enregistrement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
