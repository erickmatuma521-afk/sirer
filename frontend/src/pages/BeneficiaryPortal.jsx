import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { beneficiaries } from '../api';

const STATUS_LABELS = {
  ACTIF: 'Actif (En règle)',
  SUSPENDU: 'Suspendu (Action requise)',
  RADIE: 'Radié',
  EN_ATTENTE: 'En attente de validation',
  INACTIF: 'Inactif',
};

export default function BeneficiaryPortal() {
  const { matricule } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    beneficiaries.verify(matricule)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [matricule]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div className="login-spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
      <div style={{ maxWidth: '400px', textAlign: 'center', background: '#fff', padding: '2rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ color: 'var(--navy-deep)', marginBottom: '1rem' }}>Erreur</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>{error}</p>
        <button onClick={() => navigate('/verification')} className="btn btn-primary" style={{ width: '100%' }}>Retour</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ color: 'var(--navy-deep)', margin: 0, fontFamily: 'var(--font-serif)', fontSize: '2.2rem' }}>Espace Bénéficiaire</h1>
            <p style={{ color: '#64748b', margin: '5px 0 0' }}>SIRER · Service de Recensement National</p>
          </div>
          <button onClick={() => navigate('/verification')} className="btn btn-secondary" style={{ borderRadius: '12px' }}>Quitter</button>
        </div>

        {/* Status Banner */}
        <div style={{ 
          background: data.status === 'ACTIF' ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #dc2626, #ef4444)',
          padding: '1.5rem 2rem', borderRadius: '16px', color: 'white', marginBottom: '2rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
        }}>
          <div>
            <span style={{ fontSize: '0.9rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Statut</span>
            <h2 style={{ margin: '5px 0 0', fontSize: '1.8rem' }}>{STATUS_LABELS[data.status] || data.status}</h2>
          </div>
          <div style={{ fontSize: '2.5rem' }}>{data.status === 'ACTIF' ? '✓' : '⚠️'}</div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Left Column: Photo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              {data.photoData ? (
                <img src={data.photoData} alt="" style={{ width: '100%', borderRadius: '12px', marginBottom: '1rem' }} />
              ) : (
                <div style={{ width: '100%', height: '200px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Sans Photo</div>
              )}
              <strong style={{ display: 'block', color: 'var(--navy-deep)', textTransform: 'uppercase' }}>{data.lastName} {data.firstName}</strong>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Matricule: {data.matricule}</span>
            </div>
          </div>

          {/* Right Column: Details */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem', color: 'var(--navy-deep)' }}>Informations Enregistrées</h3>
            
            <div style={{ display: 'grid', gap: '1.2rem' }}>
              <DetailRow label="Grade" value={data.grade?.name || 'Non renseigné'} />
              <DetailRow label="Province" value={data.province?.name} />
              <DetailRow label="Genre" value={data.gender === 'M' ? 'Masculin' : 'Féminin'} />
              <DetailRow label="Type" value={data.type === 'RETRAITE' ? 'Retraité' : 'Rentier'} />
              <DetailRow label="Banque" value={data.bank || 'Non renseigné'} />
              <DetailRow label="Institution" value={data.institution || 'Non renseigné'} />
              <DetailRow label="Salaire Brut" value={data.grade?.grossSalary !== undefined && data.grade?.grossSalary !== null ? `${data.grade.grossSalary} FC` : 'Non renseigné'} />
            </div>

            <div style={{ 
              marginTop: '2rem', 
              padding: '1.5rem', 
              background: data.isPaid ? '#f0fdf4' : '#f8fafc', 
              borderRadius: '20px', 
              border: `2px solid ${data.isPaid ? '#bbf7d0' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: data.isPaid ? '0 4px 12px rgba(22, 163, 74, 0.08)' : 'none'
            }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Net à payer</span>
                <h3 style={{ margin: '4px 0 0', color: data.isPaid ? '#16a34a' : 'var(--navy-deep)', fontWeight: '800' }}>
                  {data.isPaid ? `PAYÉ (${data.paymentAmount} FC)` : 'NON PAYÉ'}
                </h3>
              </div>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                background: data.isPaid ? '#16a34a' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem'
              }}>
                {data.isPaid ? '₣' : '?'}
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                <strong>Note importante :</strong> Ces informations sont extraites de la base de données du SIRER du Ministère de la Fonction Publique / SGRR. 
                Si vous constatez une erreur, veuillez vous présenter au bureau SIRER muni de vos documents originaux.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ color: '#64748b', fontWeight: '500' }}>{label}</span>
      <strong style={{ 
        color: highlight ? '#16a34a' : 'var(--navy-deep)',
        background: highlight ? '#dcfce7' : 'transparent',
        padding: highlight ? '2px 8px' : '0',
        borderRadius: '4px'
      }}>{value}</strong>
    </div>
  );
}
