import React, { useState, useEffect } from 'react';
import { api, provinces } from '../api';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [provincesList, setProvincesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'AGENT_RECENSEMENT',
        provinceId: '',
        isActive: true
    });

    useEffect(() => {
        fetchUsers();
        provinces.list().then(setProvincesList).catch(() => { });
    }, []);

    const fetchUsers = () => {
        setLoading(true);
        api(`/users?t=${Date.now()}`).then(data => {
            console.log('[DEBUG] Users received:', data);
            setUsers(data);
        }).catch(e => setError(e.message)).finally(() => setLoading(false));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const method = editingUser ? 'PATCH' : 'POST';
        const url = editingUser ? `/users/${editingUser.id}` : '/users';
        const body = { ...form };
        if (editingUser && !body.password) delete body.password;
        if (body.role === 'ADMIN_CENTRAL') delete body.provinceId;

        api(url, { method, body: JSON.stringify(body) })
            .then(() => {
                setShowModal(false);
                fetchUsers();
            })
            .catch(e => alert(e.message));
    };

    const handleEdit = (u) => {
        setEditingUser(u);
        setForm({
            email: u.email,
            password: '',
            fullName: u.fullName,
            role: u.role,
            provinceId: u.provinceId || '',
            isActive: u.isActive
        });
        setShowModal(true);
    };

    const handleToggleProvinces = (u) => {
        api(`/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ canAccessAllProvinces: !u.canAccessAllProvinces }) })
            .then(fetchUsers)
            .catch(e => alert(e.message));
    };

    const handleToggleActive = (u) => {
        api(`/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !u.isActive }) })
            .then(fetchUsers)
            .catch(e => alert(e.message));
    };

    const handleDelete = (u) => {
        if (!window.confirm(`Supprimer l'utilisateur "${u.fullName}" ? Cette action est irréversible.`)) return;
        api(`/users/${u.id}`, { method: 'DELETE' })
            .then(() => setUsers(prev => prev.filter(x => x.id !== u.id)))
            .catch(e => alert(e.message));
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Gestion des utilisateurs</h1>
                <button type="button" className="btn btn-primary" onClick={() => { setEditingUser(null); setForm({ email: '', password: '', fullName: '', role: 'AGENT_RECENSEMENT', provinceId: '', isActive: true }); setShowModal(true); }}>
                    Nouvel utilisateur
                </button>
            </div>

            {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div className="card">
                {loading ? <p>Chargement...</p> : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nom complet</th>
                                    <th>Email</th>
                                    <th>Rôle</th>
                                    <th>Province</th>
                                    <th>Accès Provinces</th>
                                    <th>Statut</th>
                                    <th>Bénéficiaires</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.fullName}</td>
                                        <td>{u.email}</td>
                                        <td>{u.role}</td>
                                        <td>{u.province?.name || '—'}</td>
                                        <td>
                                            {u.role === 'ADMIN_CENTRAL' ? 'Toutes' : (
                                                <span className={`badge badge-${u.canAccessAllProvinces ? 'actif' : 'suspendu'}`}>
                                                    {u.canAccessAllProvinces ? 'Toutes' : 'Restreint'}
                                                </span>
                                            )}
                                        </td>
                                        <td><span className={`badge badge-${u.isActive ? 'actif' : 'suspendu'}`}>{u.isActive ? 'Actif' : 'Inactif'}</span></td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{u.beneficiariesCount || 0}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <button type="button" className="btn-icon btn-icon-edit" onClick={() => handleEdit(u)} title="Modifier">✏️</button>
                                                {u.role !== 'ADMIN_CENTRAL' && (
                                                    <button type="button" className="btn-icon btn-icon-toggle" onClick={() => handleToggleProvinces(u)} title={u.canAccessAllProvinces ? 'Restreindre l\'accès' : 'Accès toutes provinces'}>
                                                        🌍
                                                    </button>
                                                )}
                                                <button type="button" className={`btn-icon ${u.isActive ? 'btn-icon-status-on' : 'btn-icon-status-off'}`} onClick={() => handleToggleActive(u)} title={u.isActive ? 'Désactiver' : 'Activer'}>
                                                    {u.isActive ? '✅' : '🚫'}
                                                </button>
                                                <button type="button" className="btn-icon btn-icon-delete" onClick={() => handleDelete(u)} title="Supprimer">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="camera-modal-overlay">
                    <div className="camera-modal" style={{ width: '400px' }}>
                        <h2>{editingUser ? 'Modifier' : 'Nouveau'} utilisateur</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required disabled={!!editingUser} />
                            </div>
                            <div className="form-group">
                                <label>Nom complet</label>
                                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label>Mot de passe {editingUser && '(laisser vide pour ne pas changer)'}</label>
                                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editingUser} />
                            </div>
                            <div className="form-group">
                                <label>Rôle</label>
                                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                                    <option value="ADMIN_CENTRAL">Admin Central</option>
                                    <option value="AGENT_PROVINCIAL">Agent Provincial</option>
                                    <option value="AGENT_RECENSEMENT">Agent Recensement</option>
                                </select>
                            </div>
                            {form.role !== 'ADMIN_CENTRAL' && (
                                <div className="form-group">
                                    <label>Province</label>
                                    <select value={form.provinceId} onChange={e => setForm(f => ({ ...f, provinceId: e.target.value }))} required>
                                        <option value="">— Choisir —</option>
                                        {provincesList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                                <button type="submit" className="btn btn-primary">Enregistrer</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
