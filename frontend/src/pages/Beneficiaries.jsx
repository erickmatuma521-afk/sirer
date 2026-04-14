import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { beneficiaries as api, provinces, cards } from '../api';
import { Html5QrcodeScanner } from 'html5-qrcode';

const TYPE_LABELS = { RETRAITE: 'Retraité', RENTIER: 'Rentier', AYANT_DROIT: 'Ayant droit' };
const STATUS_LABELS = { ACTIF: 'Actif', SUSPENDU: 'Suspendu', RADIE: 'Radié', EN_ATTENTE: 'En attente' };

export default function Beneficiaries() {
  const { user } = useAuth();
  const [data, setData] = useState({ data: [], total: 0, totalPages: 0 });
  const [provincesList, setProvincesList] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // QR Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBeneficiary, setScannedBeneficiary] = useState(null);
  const [scanningError, setScanningError] = useState('');

  useEffect(() => {
    provinces.list().then(setProvincesList).catch(() => { });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (status) params.status = status;
    if (type) params.type = type;
    if (provinceId) params.provinceId = provinceId;
    if (debouncedSearch) params.search = debouncedSearch;
    api.list(params)
      .then(setData)
      .catch(() => setData({ data: [], total: 0, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [page, status, type, provinceId, debouncedSearch]);

  useEffect(() => {
    let scanner = null;
    if (showScanner) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(onScanSuccess, onScanFailure);
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showScanner]);

  function onScanSuccess(decodedText) {
    setScanningError('');
    cards.verify(decodedText)
      .then(res => {
        setScannedBeneficiary(res.beneficiary);
        setShowScanner(false);
      })
      .catch(err => {
        setScanningError(err.message || "Erreur de vérification");
      });
  }

  function onScanFailure(error) {
    // console.warn(error);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Bénéficiaires</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {user?.role === 'ADMIN_CENTRAL' && (
            <button onClick={() => setShowScanner(true)} className="btn btn-accent">Scan</button>
          )}
          <Link to="/beneficiaries/new" className="btn btn-primary">Nouveau bénéficiaire</Link>
        </div>
      </div>

      {showScanner && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Scanner QR Code</h2>
              <button onClick={() => setShowScanner(false)} className="btn btn-secondary">Fermer</button>
            </div>
            {scanningError && <p style={{ color: 'red' }}>{scanningError}</p>}
            <div id="reader" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      {scannedBeneficiary && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Bénéficiaire Authentifié</h2>
              <button onClick={() => setScannedBeneficiary(null)} className="btn btn-secondary">Fermer</button>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ width: '120px', height: '120px', background: '#f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                {scannedBeneficiary.photoData ? (
                  <img src={scannedBeneficiary.photoData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>Photo</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 'bold' }}>{scannedBeneficiary.lastName} {scannedBeneficiary.firstName}</p>
                <p><strong>N° Matricule :</strong> {scannedBeneficiary.matricule || 'N/A'}</p>
                <p><strong>N° Pièce :</strong> {scannedBeneficiary.nationalId}</p>
                <p><strong>Type :</strong> {TYPE_LABELS[scannedBeneficiary.type] || scannedBeneficiary.type}</p>
                <p><strong>Statut :</strong> <span className={`badge badge-${(scannedBeneficiary.status || '').toLowerCase()}`}>{STATUS_LABELS[scannedBeneficiary.status] || scannedBeneficiary.status}</span></p>
                <p><strong>Province :</strong> {scannedBeneficiary.province || '—'}</p>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <Link to={`/beneficiaries/${scannedBeneficiary.id}`} onClick={() => setScannedBeneficiary(null)} className="btn btn-primary">Voir Fiche Complète</Link>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Statut</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Tous</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Type</label>
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">Tous</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {provincesList.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Province</label>
              <select value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setPage(1); }}>
                <option value="">Toutes</option>
                {provincesList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
            <label>Recherche (Nom, Matricule)</label>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
      <div className="card">
        {loading ? (
          <p>Chargement…</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nom / Prénom</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Province</th>
                    <th>Date naiss.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((b) => (
                    <tr key={b.id}>
                      <td>{b.lastName} {b.firstName}</td>
                      <td>{TYPE_LABELS[b.type] || b.type}</td>
                      <td><span className={`badge badge-${(b.status || '').toLowerCase()}`}>{STATUS_LABELS[b.status] || b.status}</span></td>
                      <td>{b.province?.name}</td>
                      <td>{b.birthDate ? new Date(b.birthDate).toLocaleDateString('fr-FR') : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link to={`/beneficiaries/${b.id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.9rem' }}>Voir</Link>
                          {user?.role === 'ADMIN_CENTRAL' && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.9rem' }}
                              onClick={() => {
                                if (window.confirm('Supprimer ce bénéficiaire et toutes ses données ?')) {
                                  api.delete(b.id).then(() => {
                                    setData(prev => ({ ...prev, data: prev.data.filter(x => x.id !== b.id), total: prev.total - 1 }));
                                  }).catch(e => alert(e.message));
                                }
                              }}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.totalPages > 1 && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Préc.</button>
                <span>Page {page} / {data.totalPages} ({data.total} au total)</span>
                <button type="button" className="btn btn-secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Suiv.</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
