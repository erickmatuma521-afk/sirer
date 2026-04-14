import React, { useState, useEffect } from 'react';
import { reports as api, provinces } from '../api';
import { useAuth } from '../AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';

const TYPE_LABELS = { RETRAITE: 'Retraité', RENTIER: 'Rentier' };
const STATUS_LABELS = { ACTIF: 'Actif', SUSPENDU: 'Suspendu', INACTIF: 'Bloqué', RADIE: 'Radié', EN_ATTENTE: 'En attente' };

export default function Reports() {
  const { user } = useAuth();
  const [groupBy, setGroupBy] = useState('province');
  const [provinceId, setProvinceId] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [data, setData] = useState([]);
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provincesList, setProvincesList] = useState([]);

  useEffect(() => {
    provinces.list().then(setProvincesList).catch(() => { });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { groupBy };
    if (provinceId) params.provinceId = provinceId;
    if (groupBy === 'type' && typeFilter) params.type = typeFilter;
    if (groupBy === 'status' && statusFilter) params.status = statusFilter;
    api.statistics(params)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [groupBy, provinceId, typeFilter, statusFilter]);

  const handleExport = () => {
    const params = { limit: 5000 };
    if (provinceId) params.provinceId = provinceId;
    if (groupBy === 'type' && typeFilter) params.type = typeFilter;
    if (groupBy === 'status' && statusFilter) params.status = statusFilter;
    api.beneficiariesExport(params).then((res) => {
      const beneficiaries = res.data || [];
      if (beneficiaries.length === 0) {
        alert('Aucune donnée à exporter');
        return;
      }

      const doc = new jsPDF();
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR');
      const timeStr = now.toLocaleTimeString('fr-FR');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header: Logo Centered with Correct Aspect Ratio
      // The original logo has a ratio around 3.5:1 (e.g. 520x150)
      const logoWidth = 70;
      const logoHeight = 20; // 70 / 3.5 = 20
      doc.addImage(logo, 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight);

      const titleY = 10 + logoHeight + 10;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95); // navy-primary
      doc.text('RAPPORT ET STATISTIQUES DES BÉNÉFICIAIRES', pageWidth / 2, titleY, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Date d'exportation: ${dateStr} ${timeStr}`, pageWidth / 2, titleY + 8, { align: 'center' });
      doc.text(`Exporté par: ${user?.fullName || 'Utilisateur inconnu'}`, pageWidth / 2, titleY + 13, { align: 'center' });

      const tableData = beneficiaries.map(b => [
        b.type || '',
        b.gender || '',
        b.province || '',
        b.matricule || '',
        b.firstName || '',
        b.lastName || '',
        b.status || '',
        b.createdAt ? b.createdAt.slice(0, 10) : ''
      ]);

      autoTable(doc, {
        startY: titleY + 23,
        head: [['Type', 'Sexe', 'Province', 'Matricule', 'Prénom', 'Nom', 'Statut', 'Créé le']],
        body: tableData,
        headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8, cellPadding: 2 },
        didDrawPage: (data) => {
          // Footer
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

          doc.setDrawColor(200, 200, 200);
          doc.line(10, pageHeight - 15, pageSize.width - 10, pageHeight - 15);

          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('SIRER - Système Intégré de Recensement des Retraités et Rentiers', 10, pageHeight - 10);
          doc.text(`Page ${data.pageNumber}`, pageSize.width - 25, pageHeight - 10);
        }
      });

      doc.save(`sirer_report_${now.toISOString().slice(0, 10)}.pdf`);
      setExportData(res);
    }).catch(err => {
      console.error('Export error:', err);
      alert(`Erreur export: ${err.message || 'Problème de connexion ou de permissions'}`);
    });
  };

  const labels = { province: 'Par province', type: 'Par type', status: 'Par statut' };

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Rapports et statistiques</h1>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Regrouper par</label>
            <select value={groupBy} onChange={(e) => { setGroupBy(e.target.value); setTypeFilter(''); setStatusFilter(''); }}>
              {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {groupBy === 'type' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Tout</option>
                <option value="RETRAITE">Retraités</option>
                <option value="RENTIER">Rentiers</option>
              </select>
            </div>
          )}
          {groupBy === 'status' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Statut</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tout</option>
                <option value="ACTIF">Actif</option>
                <option value="SUSPENDU">Suspendu</option>
                <option value="INACTIF">Bloqué</option>
              </select>
            </div>
          )}
          {provincesList.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Province (filtre)</label>
              <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
                <option value="">Toutes</option>
                {provincesList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={handleExport}>Exporter liste bénéficiaires</button>
        </div>
      </div>
      <div className="card">
        <h2>{labels[groupBy]}</h2>
        {loading ? (
          <p>Chargement…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {groupBy === 'province' && <th>Province</th>}
                  {(groupBy === 'type' || groupBy === 'status') && <th>Valeur</th>}
                  <th>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    {groupBy === 'province' && <td>{row.name || row.provinceId}</td>}
                    {(groupBy === 'type' || groupBy === 'status') && (
                      <td>{groupBy === 'type' ? (TYPE_LABELS[row.type] || row.type) : (STATUS_LABELS[row.status] || row.status)}</td>
                    )}
                    <td>{row.total ?? row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {exportData && (
        <div className="card">
          <h2>Export ({exportData.data?.length || 0} enregistrements)</h2>
          <p>Données chargées. Un fichier CSV a été téléchargé. Vous pouvez aussi consulter les données dans la console (F12) via <code>window.sirerExport</code></p>
          <button type="button" className="btn btn-secondary" onClick={() => setExportData(null)}>Fermer</button>
        </div>
      )}
    </>
  );
}
