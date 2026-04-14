import React, { useState, useEffect } from 'react';
import { audit as api } from '../api';

export default function Audit() {
  const [data, setData] = useState({ data: [], total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 50 };
    if (entity) params.entity = entity;
    if (action) params.action = action;
    if (date) params.date = date;
    api.list(params)
      .then(setData)
      .catch(() => setData({ data: [], total: 0, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [page, entity, action, date]);

  const handleClear = () => {
    if (!window.confirm('Voulez-vous vraiment vider tout le journal d\'audit ? Cette action est irréversible.')) return;
    setLoading(true);
    api.clear()
      .then(() => {
        setData({ data: [], total: 0, totalPages: 0 });
        setPage(1);
      })
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Journal d&apos;audit</h1>
        <button type="button" className="btn btn-radie" onClick={handleClear}>
          🗑️ Vider le journal
        </button>
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Entité</label>
            <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
              <option value="">Toutes</option>
              <option value="User">User</option>
              <option value="Beneficiary">Beneficiary</option>
              <option value="Alert">Alert</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Action</label>
            <input type="text" placeholder="ex: LOGIN, CREATE" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
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
                    <th>Date</th>
                    <th>Utilisateur</th>
                    <th>Action</th>
                    <th>Entité</th>
                    <th>ID entité</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((log) => (
                    <tr key={log.id}>
                      <td>{log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : '—'}</td>
                      <td>{log.user ? `${log.user.fullName} (${log.user.role})` : '—'}</td>
                      <td>{log.action}</td>
                      <td>{log.entity}</td>
                      <td>{log.entityId || '—'}</td>
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
