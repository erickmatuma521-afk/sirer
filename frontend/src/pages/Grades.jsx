import React, { useEffect, useMemo, useState } from 'react';
import { grades as gradesApi } from '../api';

export default function Grades() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', grossSalary: '' });
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ name: '', grossSalary: '' });

  const refresh = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await gradesApi.list();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Impossible de charger la grille.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => {
    return [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
  }, [list]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await gradesApi.create({ name: form.name.trim(), grossSalary: Number(form.grossSalary) });
      setForm({ name: '', grossSalary: '' });
      await refresh();
    } catch (e2) {
      setError(e2.message || 'Erreur création');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (g) => {
    setEditingId(g.id);
    setEdit({ name: g.name || '', grossSalary: g.grossSalary ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit({ name: '', grossSalary: '' });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      await gradesApi.update(editingId, { name: edit.name.trim(), grossSalary: Number(edit.grossSalary) });
      cancelEdit();
      await refresh();
    } catch (e2) {
      setError(e2.message || 'Erreur modification');
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`Supprimer le grade "${g.name}" ?`)) return;
    setError('');
    try {
      await gradesApi.delete(g.id);
      await refresh();
    } catch (e2) {
      setError(e2.message || 'Erreur suppression');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Grille</h1>
        <span className="pill" style={{ background: 'var(--color-bg-alt)', color: 'var(--navy-primary)', fontWeight: 700 }}>
          {sorted.length} grade{sorted.length > 1 ? 's' : ''}
        </span>
      </div>

      {error && <div className="login-error" style={{ marginTop: '1rem' }}>{error}</div>}

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Créer un grade</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Grade</label>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: A1, B2, Directeur…" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Salaire Brut (FC)</label>
            <input type="number" min="0" value={form.grossSalary} onChange={(e) => setForm(f => ({ ...f, grossSalary: e.target.value }))} placeholder="Ex: 500000" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? 'Création…' : 'Ajouter'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Grades & montants</h2>
        {loading ? (
          <div>Chargement…</div>
        ) : sorted.length === 0 ? (
          <div>Aucun grade.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Salaire Brut (FC)</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((g) => (
                  <tr key={g.id}>
                    <td>
                      {editingId === g.id ? (
                        <input value={edit.name} onChange={(e) => setEdit(s => ({ ...s, name: e.target.value }))} />
                      ) : (
                        <strong>{g.name}</strong>
                      )}
                    </td>
                    <td>
                      {editingId === g.id ? (
                        <input type="number" min="0" value={edit.grossSalary} onChange={(e) => setEdit(s => ({ ...s, grossSalary: e.target.value }))} />
                      ) : (
                        <span>{g.grossSalary}</span>
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {editingId === g.id ? (
                        <>
                          <form onSubmit={submitEdit} style={{ display: 'contents' }}>
                            <button type="submit" className="btn btn-primary btn-sm">Enregistrer</button>
                          </form>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>Annuler</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(g)}>Modifier</button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(g)}>Supprimer</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

