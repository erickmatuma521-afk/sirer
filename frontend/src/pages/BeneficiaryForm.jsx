import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { beneficiaries as api, provinces, grades } from '../api';

const TYPE_OPTIONS = [
  { value: 'RETRAITE', label: 'Retraité' },
  { value: 'RENTIER', label: 'Rentier' },
];
const AYANT_DROIT_SUB = [
  { value: 'VEUF', label: 'Veuf' },
  { value: 'VEUVE', label: 'Veuve' },
  { value: 'ORPHELIN', label: 'Orphelin' },
];

export default function BeneficiaryForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [provincesList, setProvincesList] = useState([]);
  const [gradesList, setGradesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingDocuments, setExistingDocuments] = useState({}); // { [type]: true }
  const [documentsToDelete, setDocumentsToDelete] = useState(new Set()); // types to delete on save
  const [form, setForm] = useState({
    nationalId: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M',
    type: 'RETRAITE',
    provinceId: '',
    ayantDroitSubType: '',
    titulaireId: '',
    address: '',
    phone: '',
    email: '',
    bank: '',
    institution: '',
    gradeId: '',
    poursuitEtudes: null,
    attestationExpiresAt: '',
    photoData: '',
    fingerprintData: '',
    matricule: '',
    isPaid: false,
    paymentAmount: '',
    documents: {}, // Stores base64 for each type
  });
  const [fileInputKeys, setFileInputKeys] = useState({});
  const [scannerState, setScannerState] = useState(null); // { docId, status: 'scanning'|'success'|'error', message, imageData }

  useEffect(() => {
    provinces.list().then(setProvincesList).catch(() => { });
    grades.list().then(setGradesList).catch(() => { });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(id).then((b) => {
      const docs = Array.isArray(b.documents) ? b.documents : [];
      const existing = {};
      for (const d of docs) {
        if (d?.type) existing[d.type] = true;
      }
      setExistingDocuments(existing);
      setDocumentsToDelete(new Set());
      setForm({
        nationalId: b.nationalId || '',
        firstName: b.firstName || '',
        lastName: b.lastName || '',
        birthDate: b.birthDate ? b.birthDate.slice(0, 10) : '',
        gender: b.gender || 'M',
        type: b.type || 'RETRAITE',
        provinceId: b.provinceId || '',
        ayantDroitSubType: b.ayantDroitSubType || '',
        titulaireId: b.titulaireId || '',
        address: b.address || '',
        phone: b.phone || '',
        email: b.email || '',
        bank: b.bank || '',
        institution: b.institution || '',
        gradeId: b.gradeId || '',
        poursuitEtudes: b.poursuitEtudes ?? null,
        attestationExpiresAt: b.attestationExpiresAt ? b.attestationExpiresAt.slice(0, 10) : '',
        photoData: b.photoData || '',
        fingerprintData: b.fingerprintData || '',
        matricule: b.matricule || '',
        isPaid: b.isPaid || false,
        paymentAmount: b.paymentAmount || '',
        documents: {},
      });
    }).catch(() => setError('Bénéficiaire introuvable'));
  }, [id, isEdit]);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!showCamera) return;
    setCameraError('');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        setCameraError(err.name === 'NotAllowedError' ? 'Accès à la caméra refusé.' : 'Impossible d\'accéder à la caméra.');
      });
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [showCamera]);

  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photoData: reader.result || '' }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePhotoCapture = () => {
    setShowCamera(true);
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setForm((f) => ({ ...f, photoData: dataUrl }));
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const handleCloseCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'poursuitEtudes') v = value === '' ? null : value === 'true';
    setForm((f) => ({ ...f, [name]: v }));
  };

  // ---- Scanner helpers ----
  const SCANNER_SERVICE_URL = 'http://localhost:18622'; // local companion scanner service

  const handleAdministrativeDocFile = (docId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, documents: { ...f.documents, [docId]: reader.result } }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveExistingDoc = (docId) => {
    setExistingDocuments((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    setDocumentsToDelete((prev) => {
      const next = new Set(prev);
      next.add(docId);
      return next;
    });
    setForm((f) => {
      if (!f.documents?.[docId]) return f;
      const nextDocs = { ...f.documents };
      delete nextDocs[docId];
      return { ...f, documents: nextDocs };
    });
    setFileInputKeys((prev) => ({ ...prev, [docId]: (prev[docId] ?? 0) + 1 }));
  };

  const handleStartScan = async (docId) => {
    setScannerState({ docId, status: 'scanning', message: 'Connexion au scanner en cours…', imageData: null });
    try {
      // 1. Check if service is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const pingRes = await fetch(`${SCANNER_SERVICE_URL}/ping`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);
      
      if (!pingRes || !pingRes.ok) {
        setScannerState({ docId, status: 'error', message: 'Le service scanner local n’est pas détecté (port 18622).\nAssurez-vous que le service d’assistance au scan est lancé sur votre ordinateur.', imageData: null });
        return;
      }
      // 2. Trigger scan
      setScannerState(s => ({ ...s, message: 'Numérisation en cours…' }));
      const scanRes = await fetch(`${SCANNER_SERVICE_URL}/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'png' }) });
      if (!scanRes.ok) throw new Error((await scanRes.json().catch(() => ({}))).error || 'Erreur numérisation');
      const { imageData } = await scanRes.json(); // base64 data URL
      setForm(f => ({ ...f, documents: { ...f.documents, [docId]: imageData } }));
      setScannerState({ docId, status: 'success', message: 'Document numérisé avec succès !', imageData });
    } catch (err) {
      setScannerState(s => ({ ...s, status: 'error', message: err.message || 'Erreur inconnue lors de la numérisation.' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      nationalId: form.nationalId,
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: form.birthDate,
      gender: form.gender,
      type: form.type,
      provinceId: form.provinceId || undefined,
      ayantDroitSubType: form.type === 'RENTIER' ? (form.ayantDroitSubType || undefined) : undefined,
      titulaireId: form.titulaireId || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      bank: form.bank || undefined,
      institution: form.institution || undefined,
      gradeId: form.gradeId || undefined,
      poursuitEtudes: form.poursuitEtudes ?? undefined,
      attestationExpiresAt: form.attestationExpiresAt ? form.attestationExpiresAt : undefined,
      photoData: form.photoData && form.photoData.startsWith('data:') ? form.photoData : undefined,
      fingerprintData: form.fingerprintData || undefined,
      matricule: form.matricule || undefined,
      isPaid: Boolean(form.isPaid),
      paymentAmount: form.isPaid ? Number(form.paymentAmount || 0) : null,
      documents: Object.entries(form.documents || {}).map(([type, data]) => ({
        type,
        name: type.toLowerCase().replace(/_/g, ' '),
        filePath: data
      })).filter(d => d.filePath)
    };
    try {
      if (isEdit) {
        await api.update(id, {
          firstName: payload.firstName,
          lastName: payload.lastName,
          birthDate: payload.birthDate,
          gender: payload.gender,
          address: payload.address,
          phone: payload.phone,
          email: payload.email,
          bank: payload.bank,
          institution: payload.institution,
          gradeId: payload.gradeId,
          poursuitEtudes: payload.poursuitEtudes,
          attestationExpiresAt: payload.attestationExpiresAt,
          photoData: payload.photoData,
          fingerprintData: payload.fingerprintData,
          matricule: payload.matricule,
          isPaid: payload.isPaid,
          paymentAmount: payload.paymentAmount,
          documents: payload.documents,
          documentsToDelete: Array.from(documentsToDelete),
        });
      } else {
        await api.create(payload);
      }
      navigate('/beneficiaries');
    } catch (err) {
      setError(err.message || 'Erreur enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{isEdit ? 'Modifier le bénéficiaire' : 'Nouveau bénéficiaire'}</h1>
      {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>N° pièce d'identité *</label>
              <input name="nationalId" value={form.nationalId} onChange={handleChange} required disabled={isEdit} />
            </div>
            <div className="form-group">
              <label>N° Matricule</label>
              <input name="matricule" value={form.matricule} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Prénom *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Nom complet *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Date de naissance *</label>
              <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Genre</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div className="form-group">
              <label>Type *</label>
              <select name="type" value={form.type} onChange={handleChange} required>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {form.type === 'RENTIER' && (
              <div className="form-group">
                <label>Qualité rentier</label>
                <select name="ayantDroitSubType" value={form.ayantDroitSubType} onChange={handleChange}>
                  <option value="">—</option>
                  {AYANT_DROIT_SUB.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Province *</label>
              <select name="provinceId" value={form.provinceId} onChange={handleChange} required>
                <option value="">—</option>
                {provincesList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Institution</label>
              <input name="institution" value={form.institution} onChange={handleChange} placeholder="Ex: INPP, DGI, etc." />
            </div>
            <div className="form-group">
              <label>Grade</label>
              <select name="gradeId" value={form.gradeId} onChange={handleChange}>
                <option value="">—</option>
                {gradesList.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'block' }}>Documents administratifs</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {[
                  { id: 'ARRETE_STATUT', label: 'Arrêté sous statut' },
                  { id: 'ARRETE_PROMOTION', label: 'Arrêté de promotion' },
                  { id: 'DECRET', label: 'Décret' },
                  { id: 'ORDONNANCE', label: 'Ordonnance présidentielle' },
                  { id: 'NOTIFICATION_RETRAITE', label: 'Notification Mise à la retraite' },
                  { id: 'COMPOSITION_FAMILIALE', label: 'Composition familiale' },
                  { id: 'CERTIFICAT_DECES', label: 'Certificat de décès' },
                  { id: 'ATTESTATION_VEUVAGE', label: 'Attestation de veuvage' },
                  { id: 'PERMIS_INHUMATION', label: 'Permis d’inhumation' },
                  { id: 'MARIAGE_CELIBAT', label: 'Acte de mariage/Attestation de célibat' },
                  { id: 'PV_CONSEIL_FAMILLE', label: 'PV conseil de famille' },
                  { id: 'ATTESTATION_RESIDENCE', label: 'Attestation de résidence' },
                  { id: 'PIECE_IDENTITE', label: 'Pièce d\'identité' },
                  { id: 'ACTE_NAISSANCE', label: 'Acte de naissance' },
                  { id: 'ATTESTATION_SCOLAIRE', label: 'Attestation de fréquentation scolaire /Académique' }
                ].map((doc) => {
                  const k = fileInputKeys[doc.id] ?? 0;
                  const hasExisting = Boolean(existingDocuments[doc.id]);
                  const isLocked = isEdit && hasExisting;
                  return (
                    <div key={doc.id} className="form-group">
                      <label style={{ fontSize: '0.85rem' }}>
                        {doc.label}{' '}
                        {isLocked && <span style={{ color: '#16a34a', fontWeight: 700 }}>• Déjà importé ✓</span>}
                      </label>

                      <input
                        key={`pc-${doc.id}-${k}`}
                        id={`admin-doc-pc-${doc.id}`}
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleAdministrativeDocFile(doc.id, e)}
                        disabled={isLocked}
                      />

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.6rem',
                          marginTop: '0.35rem',
                          alignItems: 'center',
                        }}
                      >
                        <label
                          htmlFor={`admin-doc-pc-${doc.id}`}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.6rem',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            margin: 0,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 42,
                            height: 38,
                            opacity: isLocked ? 0.55 : 1,
                            pointerEvents: isLocked ? 'none' : 'auto',
                          }}
                          title="Ordinateur"
                          aria-label="Ordinateur"
                        >
                          💻
                        </label>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.6rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 42,
                            height: 38,
                            opacity: isLocked ? 0.55 : 1,
                          }}
                          onClick={() => handleStartScan(doc.id)}
                          title="Scanner USB (service local SIRER sur PC)"
                          aria-label="Scanner USB"
                          disabled={isLocked}
                        >
                          🖨️
                        </button>
                        {isLocked && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleRemoveExistingDoc(doc.id)}
                            style={{
                              fontSize: '0.85rem',
                              padding: '0.4rem 0.7rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#fff5f5',
                              borderColor: '#fecaca',
                              color: '#b91c1c',
                              fontWeight: 700,
                            }}
                            title="Supprimer le document pour pouvoir en importer un autre"
                          >
                            ✕ Supprimer
                          </button>
                        )}
                      </div>

                      {form.documents[doc.id] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                          <span style={{ color: 'green', fontSize: '0.8rem' }}>Chargé ✓</span>
                          <button
                            type="button"
                            title="Supprimer ce document"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'red',
                              cursor: 'pointer',
                              fontSize: '1.1rem',
                              padding: 0,
                              lineHeight: 1,
                            }}
                            onClick={() => {
                              setFileInputKeys((prev) => ({ ...prev, [doc.id]: (prev[doc.id] ?? 0) + 1 }));
                              setForm((f) => {
                                const newDocs = { ...f.documents };
                                delete newDocs[doc.id];
                                return { ...f, documents: newDocs };
                              });
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Adresse</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Banque</label>
              <input name="bank" value={form.bank} onChange={handleChange} />
            </div>

            {/* PAYMENT SECTION */}
            <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ margin: 0, fontWeight: '700', color: 'var(--navy-deep)' }}>PAYER :</label>
                  <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isPaid: true }))}
                      style={{
                        padding: '0.5rem 1.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', transition: 'all 0.2s',
                        background: form.isPaid ? 'var(--color-success)' : 'transparent',
                        color: form.isPaid ? 'white' : '#64748b'
                      }}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isPaid: false, paymentAmount: '' }))}
                      style={{
                        padding: '0.5rem 1.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', transition: 'all 0.2s',
                        background: !form.isPaid ? '#94a3b8' : 'transparent',
                        color: !form.isPaid ? 'white' : '#64748b'
                      }}
                    >
                      Non
                    </button>
                  </div>
                </div>

                {form.isPaid && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', animation: 'fadeIn 0.3s ease-out' }}>
                    <label style={{ margin: 0, fontWeight: '700', color: 'var(--navy-deep)' }}>MONTANT (FC) :</label>
                    <input
                      type="number"
                      name="paymentAmount"
                      value={form.paymentAmount}
                      onChange={handleChange}
                      placeholder="Ex: 50000"
                      style={{
                        width: '200px', padding: '0.6rem 1rem', borderRadius: '8px',
                        border: '2px solid var(--color-success)', background: '#fff',
                        fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-success)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Photo du bénéficiaire</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={handlePhotoCapture}>
                  Prendre une photo (caméra)
                </button>
                {form.photoData && (
                  <>
                    <img src={form.photoData} alt="Photo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                    <button type="button" className="btn btn-secondary" onClick={() => setForm((f) => ({ ...f, photoData: '' }))}>Retirer</button>
                  </>
                )}
              </div>
            </div>
            {/* Empreinte digitale removed per user request */}
            {showCamera && (
              <div className="camera-modal-overlay" role="dialog" aria-label="Prise de photo">
                <div className="camera-modal">
                  <h3 style={{ margin: '0 0 0.75rem' }}>Prendre une photo</h3>
                  {cameraError ? (
                    <p className="login-error">{cameraError}</p>
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    {!cameraError && (
                      <button type="button" className="btn btn-primary" onClick={handleCaptureFrame}>
                        Capturer
                      </button>
                    )}
                    <button type="button" className="btn btn-secondary" onClick={handleCloseCamera}>
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
            {form.type === 'RENTIER' && form.ayantDroitSubType === 'ORPHELIN' && (
              <>
                <div className="form-group">
                  <label>Poursuit études</label>
                  <select name="poursuitEtudes" value={form.poursuitEtudes === null ? '' : String(form.poursuitEtudes)} onChange={handleChange}>
                    <option value="">—</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fin validité attestation études</label>
                  <input name="attestationExpiresAt" type="date" value={form.attestationExpiresAt} onChange={handleChange} />
                </div>
              </>
            )}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
          </div>
        </form>
      </div>

      {/* ===== Scanner Modal ===== */}
      {scannerState && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => scannerState.status !== 'scanning' && setScannerState(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, maxWidth: 480, width: '90%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.3)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>🖨️ Numérisation via scanner</h3>
              {scannerState.status !== 'scanning' && (
                <button type="button" onClick={() => setScannerState(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#666' }}>✕</button>
              )}
            </div>

            {/* Scanning animation */}
            {scannerState.status === 'scanning' && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem', animation: 'pulse 1s infinite' }}>🖨️</div>
                <p style={{ color: '#555' }}>{scannerState.message}</p>
              </div>
            )}

            {/* Error state */}
            {scannerState.status === 'error' && (
              <div>
                <div style={{ background: '#fff3f3', border: '1px solid #f5c6c6', borderRadius: 8, padding: '1rem', color: '#c00', whiteSpace: 'pre-line', fontSize: '0.9rem' }}>
                  {scannerState.message}
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#777', background: '#f9f9f9', borderRadius: 6, padding: '0.75rem' }}>
                  <strong>Comment activer le service scanner ?</strong><br />
                  1. Téléchargez et installez le pilote de votre scanner.<br />
                  2. Lancez le service d’assistance SIRER Scanner sur votre ordinateur.<br />
                  3. Assurez-vous que le scanner est branché et allumé.<br />
                  4. Utilisez l’option <strong>Ordinateur</strong> pour importer un fichier déjà scanné.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setScannerState(null)}>Fermer</button>
                  <label
                    htmlFor={`admin-doc-pc-${scannerState.docId}`}
                    className="btn btn-secondary"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setScannerState(null)}
                  >
                    📁 Choisir un fichier
                  </label>
                  <button type="button" className="btn btn-primary"
                    onClick={() => handleStartScan(scannerState.docId)}>
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Success state */}
            {scannerState.status === 'success' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'green', fontWeight: 'bold' }}>✅ {scannerState.message}</p>
                {scannerState.imageData && scannerState.imageData.startsWith('data:image/') && (
                  <img src={scannerState.imageData} alt="Scanned document" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 6, border: '1px solid #eee', marginTop: '0.5rem' }} />
                )}
                <div style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setScannerState(null)}>Fermer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
