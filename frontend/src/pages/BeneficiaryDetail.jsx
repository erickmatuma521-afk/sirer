import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { beneficiaries as api, cards as cardsApi, orphans, alerts as alertsApi } from '../api';

const TYPE_LABELS = { RETRAITE: 'Retraité', RENTIER: 'Rentier' };
const STATUS_LABELS = { ACTIF: 'Actif', SUSPENDU: 'Suspendu', RADIE: 'Radié', EN_ATTENTE: 'En attente', INACTIF: 'Inactif' };

export default function BeneficiaryDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [beneficiary, setBeneficiary] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardGen, setCardGen] = useState(null);
  const [attestationExpiresAt, setAttestationExpiresAt] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [viewingCard, setViewingCard] = useState(null);
  const [blockingModal, setBlockingModal] = useState(false);
  const [blockMotif, setBlockMotif] = useState('');

  useEffect(() => {
    api.get(id).then(setBeneficiary).catch(() => setBeneficiary(null)).finally(() => setLoading(false));
    cardsApi.list(id).then(setCards).catch(() => setCards([]));
  }, [id]);

  const handleGenerateCard = () => {
    setActionLoading(true);
    cardsApi.generate(id)
      .then((r) => setCardGen(r))
      .catch((err) => alert(err.message || 'Impossible de générer la carte'))
      .finally(() => setActionLoading(false));
  };

  const handleAttestationEtudes = () => {
    setActionLoading(true);
    orphans.attestationEtudes(id, { attestationExpiresAt: attestationExpiresAt || undefined })
      .then(() => { setBeneficiary((b) => b ? { ...b, poursuitEtudes: true, attestationExpiresAt } : null); })
      .catch((e) => alert(e.message))
      .finally(() => setActionLoading(false));
  };

  const handleSuspendre = () => {
    if (!window.confirm('Confirmer la suspension des avantages pour cet orphelin (pas de poursuite d\'études) ?')) return;
    setActionLoading(true);
    orphans.suspendre(id)
      .then(() => api.get(id).then(setBeneficiary))
      .catch((e) => alert(e.message))
      .finally(() => setActionLoading(false));
  };

  const handleRequestBlock = () => {
    if (!blockMotif.trim()) return alert('Veuillez saisir un motif.');
    setActionLoading(true);
    alertsApi.create({
      beneficiaryId: id,
      type: 'DEMANDE_BLOCAGE',
      title: 'Demande de blocage (Agent)',
      description: `Motif de blocage : ${blockMotif}`,
    })
      .then(() => {
        setBlockingModal(false);
        setBlockMotif('');
        alert('Demande de blocage envoyée à l\'administration centrale.');
        api.get(id).then(setBeneficiary);
      })
      .catch((e) => alert(e.message))
      .finally(() => setActionLoading(false));
  };

  if (loading || !beneficiary) return <div>Chargement…</div>;

  const isOrphelin = beneficiary.type === 'RENTIER' && beneficiary.ayantDroitSubType === 'ORPHELIN';
  const canManageOrphan = user?.role === 'ADMIN_CENTRAL' || user?.role === 'AGENT_PROVINCIAL';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Fiche bénéficiaire</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/beneficiaries/${id}/edit`} className="btn btn-secondary">Modifier</Link>
          {beneficiary.status === 'ACTIF' && (
            <>
              <button type="button" className="btn btn-accent" onClick={handleGenerateCard} disabled={actionLoading || cards.length > 0}>
                {cards.length > 0 ? 'Carte déjà émise' : 'Générer une carte'}
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                onClick={() => setBlockingModal(true)}
                disabled={actionLoading}
              >
                🚫 Bloquer
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Identité</h2>
        <p><strong>{beneficiary.lastName} {beneficiary.firstName} ({beneficiary.gender})</strong></p>
        <p>N° pièce d'identité : {beneficiary.nationalId}</p>
        <p>N° Matricule : {beneficiary.matricule || '—'}</p>
        <p>Type : {TYPE_LABELS[beneficiary.type]} {beneficiary.ayantDroitSubType ? `(${beneficiary.ayantDroitSubType})` : ''}</p>
        <p>Grade : {beneficiary.grade?.name || '—'}</p>
        <p>Statut : <span className={`badge badge-${(beneficiary.status || '').toLowerCase()}`}>{STATUS_LABELS[beneficiary.status]}</span></p>
        <p>Date de naissance : {beneficiary.birthDate ? new Date(beneficiary.birthDate).toLocaleDateString('fr-FR') : '—'}</p>
        <p>Province : {beneficiary.province?.name}</p>
        {beneficiary.institution && <p>Institution : {beneficiary.institution}</p>}
        {beneficiary.address && <p>Adresse : {beneficiary.address}</p>}
        {beneficiary.phone && <p>Téléphone : {beneficiary.phone}</p>}
        {beneficiary.email && <p>E-mail : {beneficiary.email}</p>}
        {beneficiary.bank && <p>Banque : {beneficiary.bank}</p>}
        <p>Salaire Brut : {beneficiary.grade?.grossSalary !== undefined && beneficiary.grade?.grossSalary !== null ? `${beneficiary.grade.grossSalary} FC` : '—'}</p>
        <p>
          Paiement : {beneficiary.isPaid ? (
            <span style={{ marginLeft: '0.4rem', background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              PAYÉ ({beneficiary.paymentAmount} FC)
            </span>
          ) : (
            <span style={{ marginLeft: '0.4rem', background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              NON PAYÉ
            </span>
          )}
        </p>
        {isOrphelin && (
          <>
            <p>Poursuit études : {beneficiary.poursuitEtudes === true ? 'Oui' : beneficiary.poursuitEtudes === false ? 'Non' : '—'}</p>
            {beneficiary.attestationExpiresAt && <p>Fin validité attestation : {new Date(beneficiary.attestationExpiresAt).toLocaleDateString('fr-FR')}</p>}
            {(beneficiary.status === 'SUSPENDU' || beneficiary.status === 'INACTIF') && !beneficiary.poursuitEtudes && (
              <p>
                Fin validité attestation : 
                <span style={{ marginLeft: '0.5rem', background: '#c53030', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>
                  EXPIRE
                </span>
              </p>
            )}
          </>
        )}
      </div>

      {beneficiary.documents?.length > 0 && (
        <div className="card">
          <h2>Documents administratifs</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Nom</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {beneficiary.documents.map((d) => (
                  <tr key={d.id}>
                    <td>{d.type}</td>
                    <td>{d.name}</td>
                    <td>{new Date(d.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a href={d.filePath} download={d.name} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Télécharger">
                        ⬇ Télécharger
                      </a>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        title="Voir le document"
                        onClick={() => setPreviewDoc(d)}
                      >
                        👁 Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isOrphelin && canManageOrphan && beneficiary.status === 'ACTIF' && (
        <div className="card">
          <h2>Actions orphelin</h2>
          <p style={{ marginBottom: '1rem' }}>Si l&apos;orphelin poursuit les études, enregistrez une attestation. Sinon, validez la suspension des avantages.</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Fin validité attestation (optionnel)</label>
              <input type="date" value={attestationExpiresAt} onChange={(e) => setAttestationExpiresAt(e.target.value)} />
            </div>
            <button type="button" className="btn btn-primary" onClick={handleAttestationEtudes} disabled={actionLoading}>
              Enregistrer attestation études
            </button>
            <button type="button" className="btn btn-danger" onClick={handleSuspendre} disabled={actionLoading}>
              Suspendre (pas d&apos;études)
            </button>
          </div>
        </div>
      )}

      {cardGen && (
        <div className="card">
          <h2>Carte du bénéficiaire</h2>
          <div id="sirer-card-print" className="sirer-card-container">
            <div className="sirer-card-premium">
              <div className="sirer-card-header">
                <span className="sirer-card-logo">SIRER</span>
                <span className="sirer-card-subtitle">Carte de bénéficiaire</span>
              </div>
              <div className="sirer-card-body">
                <div className="sirer-card-photo">
                  {(cardGen.beneficiary?.photoData || beneficiary?.photoData) ? (
                    <img src={cardGen.beneficiary?.photoData || beneficiary?.photoData} alt="" />
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>Photo</div>
                  )}
                </div>
                <div className="sirer-card-info">
                  <p className="sirer-card-name">
                    {cardGen.beneficiary?.lastName} {cardGen.beneficiary?.firstName}
                  </p>
                  <p>N° carte : <strong>{cardGen.card.cardNumber}</strong></p>
                  <p>Valide jusqu&apos;au : <strong>{new Date(cardGen.card.expiresAt).toLocaleDateString('fr-FR')}</strong></p>
                  {cardGen.beneficiary?.province && <p>Province : <strong>{cardGen.beneficiary.province}</strong></p>}
                  <p>Statut : <strong>{STATUS_LABELS[beneficiary.status]}</strong></p>
                </div>
              </div>
              {cardGen.qrCodeDataUrl && (
                <div className="sirer-card-qr">
                  <img src={cardGen.qrCodeDataUrl} alt="QR Code" />
                </div>
              )}
            </div>
          </div>
          <div className="sirer-card-actions no-print">
            <button type="button" className="btn btn-accent" onClick={() => window.print()}>Imprimer la carte</button>
            <button type="button" className="btn btn-secondary" onClick={() => setCardGen(null)}>Fermer</button>
          </div>
        </div>
      )}

      {cards.length > 0 && (
        <div className="card">
          <h2>Cartes délivrées</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Numéro</th><th>Émise le</th><th>Expire le</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td>{c.cardNumber}</td>
                    <td>{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setViewingCard(c)}
                      >
                        👁 Voir la Carte
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== Document Preview Modal ===== */}
      {previewDoc && (
        <div
          role="dialog"
          aria-label="Aperçu du document"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12,
              maxWidth: '90vw', maxHeight: '90vh',
              overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column', minWidth: 320
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #eee' }}>
              <strong style={{ fontSize: '1rem' }}>{previewDoc.name}</strong>
              <button type="button" onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, color: '#666' }}>✕</button>
            </div>
            {/* Body */}
            <div style={{ overflow: 'auto', flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              {previewDoc.filePath?.startsWith('data:image/') ? (
                <img src={previewDoc.filePath} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 6 }} />
              ) : previewDoc.filePath?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.filePath}
                  title={previewDoc.name}
                  style={{ width: '75vw', height: '75vh', border: 'none', borderRadius: 6 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ marginBottom: '1rem' }}>Aperçu non disponible pour ce type de fichier.</p>
                  <a href={previewDoc.filePath} download={previewDoc.name} className="btn btn-primary">⬇ Télécharger</a>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ borderTop: '1px solid #eee', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <a href={previewDoc.filePath} download={previewDoc.name} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>⬇ Télécharger</a>
              <button type="button" className="btn btn-primary" style={{ fontSize: '0.9rem' }} onClick={() => setPreviewDoc(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {beneficiary.alerts?.length > 0 && (
        <div className="card">
          <h2>Alertes</h2>
          <ul>
            {beneficiary.alerts.map((a) => (
              <li key={a.id}>{a.title} — {a.status} {a.dueDate ? `(échéance ${new Date(a.dueDate).toLocaleDateString('fr-FR')})` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== Card View Modal ===== */}
      {viewingCard && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => setViewingCard(null)}
        >
          <div 
            className="modal-content"
            style={{ 
              background: '#fff', 
              borderRadius: '24px', 
              padding: '3rem', 
              width: 'auto',
              maxWidth: '95vw', 
              maxHeight: '95vh',
              overflow: 'visible',
              boxShadow: '0 30px 90px rgba(0,0,0,0.7)',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div id="sirer-card-modal-preview" className="sirer-card-container" style={{ margin: '1.5rem 0', transform: 'scale(1.1)', transformOrigin: 'center center' }}>
              <div className="sirer-card-premium">
                <div className="sirer-card-header">
                  <span className="sirer-card-logo">SIRER</span>
                  <span className="sirer-card-subtitle">CARTE DE BÉNÉFICIAIRE</span>
                </div>
                <div className="sirer-card-body">
                  <div className="sirer-card-photo">
                    {beneficiary.photoData ? (
                      <img src={beneficiary.photoData} alt="" />
                    ) : (
                      <div style={{ fontSize: '0.6rem', color: '#888' }}>Photo</div>
                    )}
                  </div>
                  <div className="sirer-card-info">
                    <p className="sirer-card-name">
                      {beneficiary.lastName} {beneficiary.firstName}
                    </p>
                    <p>N° carte : <strong>{viewingCard.cardNumber}</strong></p>
                    <p>Valide jusqu&apos;au : <strong>{new Date(viewingCard.expiresAt).toLocaleDateString('fr-FR')}</strong></p>
                    <p>Province : <strong>{beneficiary.province?.name || '—'}</strong></p>
                    {beneficiary.institution && <p>Institution : <strong>{beneficiary.institution}</strong></p>}
                    <p>Statut : <strong>{STATUS_LABELS[beneficiary.status]}</strong></p>
                  </div>
                </div>
                {/* QR Code */}
                <div className="sirer-card-qr">
                    {viewingCard.qrCodePayload ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(viewingCard.qrCodePayload)}`} 
                        alt="QR Code" 
                      />
                    ) : (
                      <div style={{ fontSize: '0.5rem', color: '#999', textAlign: 'center' }}>[QR]</div>
                    )}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '3.5rem', zIndex: 10 }} className="no-print">
              <button 
                type="button" 
                className="btn btn-accent btn-lg" 
                style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', borderRadius: '12px' }}
                onClick={() => {
                  window.print();
                }}
              >
                Imprimer
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-lg" 
                style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', borderRadius: '12px' }}
                onClick={() => setViewingCard(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== Blocking Request Modal ===== */}
      {blockingModal && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setBlockingModal(false)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', borderRadius: '20px', background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} 
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, color: '#1a202c', fontSize: '1.5rem' }}>🚫 Motif de blocage</h2>
            <p style={{ color: '#5a6780', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Veuillez indiquer précisément la raison pour laquelle vous souhaitez bloquer ce bénéficiaire. 
              Cette demande sera transmise à l&apos;Administration Centrale pour validation finale.
            </p>
            <div className="form-group">
              <label>Raison du blocage</label>
              <textarea
                className="form-control"
                style={{ width: '100%', minHeight: '130px', background: '#f8f9fa', color: '#1a202c', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.8rem' }}
                placeholder="Ex: Fraude détectée sur le matricule, décès non signalé, dossiers incomplets..."
                value={blockMotif}
                onChange={e => setBlockMotif(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setBlockingModal(false)} style={{ padding: '0.6rem 1.5rem' }}>Annuler</button>
              <button 
                className="btn btn-danger" 
                onClick={handleRequestBlock}
                disabled={actionLoading || !blockMotif.trim()}
                style={{ padding: '0.6rem 1.5rem' }}
              >
                {actionLoading ? 'Traitement en cours...' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden card for printing - rendered at body level via Portal */}
      {viewingCard && ReactDOM.createPortal(
        <div className="printable-card-wrapper">
          <div className="sirer-card">
            <div className="sirer-card-header">
              <span className="sirer-card-logo">SIRER</span>
              <span className="sirer-card-subtitle">CARTE DE BÉNÉFICIAIRE</span>
            </div>
            <div className="sirer-card-body">
              <div className="sirer-card-photo">
                {beneficiary.photoData && <img src={beneficiary.photoData} alt="" />}
              </div>
              <div className="sirer-card-info">
                <p className="sirer-card-name">
                  {beneficiary.lastName} {beneficiary.firstName}
                </p>
                <p>N° carte : <strong>{viewingCard.cardNumber}</strong></p>
                <p>Valide jusqu&apos;au : <strong>{new Date(viewingCard.expiresAt).toLocaleDateString('fr-FR')}</strong></p>
                <p>Province : <strong>{beneficiary.province?.name || '—'}</strong></p>
                {beneficiary.institution && <p>Institution : <strong>{beneficiary.institution}</strong></p>}
                <p>Statut : <strong>{STATUS_LABELS[beneficiary.status]}</strong></p>
              </div>
            </div>
            <div className="sirer-card-qr">
                {viewingCard.qrCodePayload && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(viewingCard.qrCodePayload)}`} 
                    alt="QR Code" 
                  />
                )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
