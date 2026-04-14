import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { alerts as api, provinces } from '../api';

const TYPE_LABELS = {
  ORPHELIN_18_ANS: 'Orphelin 18 ans',
  ORPHELIN_25_ANS: 'Orphelin 25 ans',
  DOCUMENT_EXPIRE: 'Document expiré',
  DOCUMENT_MANQUANT: 'Document manquant',
  ANOMALIE: 'Anomalie',
  SUSPENSION_PREVUE: 'Suspension prévue',
};
const STATUS_LABELS = { OUVERTE: 'Ouverte', EN_COURS: 'En cours', RESOLUE: 'Résolue', IGNOREE: 'Ignorée' };

export default function Alerts() {
  const { user } = useAuth();
  const [data, setData] = useState({ data: [], total: 0 });
  const [provincesList, setProvincesList] = useState([]);
  const [status, setStatus] = useState('OUVERTE');
  const [provinceId, setProvinceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [resolutionModal, setResolutionModal] = useState(null); // stores alert to resolve

  useEffect(() => {
    provinces.list().then(setProvincesList).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 100 };
    if (status) params.status = status;
    if (provinceId) params.provinceId = provinceId;
    api.list(params)
      .then((r) => setData({ data: r.data, total: r.total }))
      .catch(() => setData({ data: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [status, provinceId]);

  const handleResolve = (alertId, blockBeneficiary = false) => {
    setResolving(alertId);
    api.resolve(alertId, { blockBeneficiary })
      .then(() => {
        api.list({ status, provinceId, limit: 100 }).then((r) => setData({ data: r.data, total: r.total }));
        setResolutionModal(null);
      })
      .catch((err) => alert(err.message || 'Erreur lors de la résolution'))
      .finally(() => setResolving(null));
  };

  const handleReport = (alertId) => {
    if (!window.confirm('Signaler cette alerte à l\'Administrateur Central ?')) return;
    setReporting(alertId);
    api.report(alertId)
      .then(() => {
        api.list({ status, provinceId, limit: 100 }).then((r) => setData({ data: r.data, total: r.total }));
      })
      .catch((err) => alert(err.message || 'Erreur lors du signalement'))
      .finally(() => setReporting(null));
  };

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Alertes</h1>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {provincesList.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Province</label>
              <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
                <option value="">Toutes</option>
                {provincesList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        {loading ? (
          <p>Chargement…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Titre</th>
                  <th>Bénéficiaire</th>
                  <th>Province</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((a) => (
                  <tr key={a.id}>
                    <td>{TYPE_LABELS[a.type] || a.type}</td>
                    <td>{a.title}</td>
                    <td>
                      {a.beneficiary ? (
                        <Link to={`/beneficiaries/${a.beneficiary.id}`}>
                          {a.beneficiary.lastName} {a.beneficiary.firstName}
                        </Link>
                      ) : '—'}
                    </td>
                    <td>{a.beneficiary?.province?.name || '—'}</td>
                    <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{STATUS_LABELS[a.status]}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {a.status === 'OUVERTE' && user?.role === 'ADMIN_CENTRAL' && (
                          <button 
                          type="button" 
                          className="btn btn-primary" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.9rem' }} 
                          onClick={() => setResolutionModal(a)} 
                          disabled={resolving === a.id}
                          >
                            {resolving === a.id ? '…' : 'Résoudre'}
                          </button>
                        )}
                        {a.status === 'OUVERTE' && user?.role !== 'ADMIN_CENTRAL' && (
                          <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.9rem' }} 
                          onClick={() => handleReport(a.id)} 
                          disabled={reporting === a.id || a.isReported}
                          >
                            {reporting === a.id ? '…' : a.isReported ? 'Signalé' : 'Signaler'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && data.data.length === 0 && <p>Aucune alerte.</p>}

      {/* ===== Resolution Modal ===== */}
      {resolutionModal && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => setResolutionModal(null)}
        >
          <div 
            style={{
              background: '#fff', borderRadius: 12, padding: '1.5rem', 
              maxWidth: '500px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Détails de l&apos;alerte</h2>
            <p><strong>Type :</strong> {TYPE_LABELS[resolutionModal.type] || resolutionModal.type}</p>
            <p><strong>Bénéficiaire :</strong> {resolutionModal.beneficiary?.lastName} {resolutionModal.beneficiary?.firstName}</p>
            <p><strong>Agent émetteur :</strong> {resolutionModal.createdBy?.fullName || 'Système'}</p>
            <p><strong>Description :</strong> {resolutionModal.description || 'Pas de description'}</p>
            
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-danger" 
                onClick={() => handleResolve(resolutionModal.id, true)} 
                disabled={resolving === resolutionModal.id}
              >
                {resolving === resolutionModal.id ? 'Traitement…' : 'Bloqué (Rendre Inactif)'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleResolve(resolutionModal.id, false)} 
                disabled={resolving === resolutionModal.id}
              >
                Résoudre simplement
              </button>
              <button className="btn btn-secondary" onClick={() => setResolutionModal(null)}>Annuler</button>
            </div>
            {resolutionModal.type === 'SUSPENSION_PREVUE' && (
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                    Note : Le bouton "Bloqué" rendra ce bénéficiaire définitivement INACTIF dans le registre.
                </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
