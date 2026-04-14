import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { beneficiaries } from '../api';
import logo from '../assets/logo.png';

export default function Verification() {
  const navigate = useNavigate();
  const [matricule, setMatricule] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!matricule.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Basic check if it exists
      await beneficiaries.verify(matricule.trim());
      // On success, redirect to the portal
      navigate(`/v/${matricule.trim()}`);
    } catch (err) {
      setError(err.message || 'Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', width: '100%', maxWidth: '480px' }}>
        <img 
          src={logo} 
          alt="Ministère de la Fonction Publique" 
          style={{ width: '100%', maxWidth: '400px', height: 'auto' }} 
        />
        <div style={{
          width: '100%',
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
          padding: '3.5rem 2.5rem',
          textAlign: 'center'
        }}>
        <h1 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '2.5rem', 
          fontWeight: '800', 
          color: '#0f172a',
          letterSpacing: '-0.02em'
        }}>
          SIRER
        </h1>
        <p style={{ 
          margin: '0 0 2.5rem 0', 
          color: '#64748b', 
          fontSize: '1rem',
          fontWeight: '500'
        }}>
          Système Intégré de Recensement des Retraités et Rentiers
        </p>

        <form onSubmit={handleVerify} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.6rem', 
              fontSize: '0.9rem',
              fontWeight: '600', 
              color: '#475569' 
            }}>
              Insérer votre Numéro Matricule
            </label>
            <input
              type="text"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value.toUpperCase())}
              placeholder="Ex: 5123456"
              required
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '1.1rem',
                outline: 'none',
                transition: 'all 0.2s',
                textAlign: 'center',
                backgroundColor: '#fff',
                color: '#1e293b'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0f172a';
                e.target.style.boxShadow = '0 0 0 4px rgba(15, 23, 42, 0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              fontSize: '1.1rem', 
              borderRadius: '12px',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#15803d')}
            onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#16a34a')}
          >
            {loading ? 'Recherche en cours...' : 'Vérifier maintenant'}
          </button>
        </form>

        {error && (
          <div style={{ 
            marginTop: '2rem',
            background: '#fef2f2', 
            color: '#dc2626', 
            padding: '1rem', 
            borderRadius: '12px', 
            border: '1px solid #fee2e2',
            fontSize: '0.9rem'
          }}>
            {error === 'Not Found' ? 'Matricule non trouvé' : error}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
