import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { users as api } from '../api';

export default function SuperAdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        setLoading(true);
        api.list()
            .then(setUsers)
            .catch((err) => setMessage({ type: 'danger', text: 'Erreur chargement utilisateurs' }))
            .finally(() => setLoading(false));
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            alert('Le mot de passe doit faire au moins 6 caractères');
            return;
        }
        try {
            await api.resetPasswordSuper(editingUser.id, newPassword);
            setMessage({ type: 'success', text: `Mot de passe de ${editingUser.fullName} réinitialisé avec succès` });
            setEditingUser(null);
            setNewPassword('');
        } catch (err) {
            setMessage({ type: 'danger', text: 'Erreur lors de la réinitialisation' });
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="app-main">
            <header className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
                <div className="dashboard-header-main">
                    <div className="badge badge-actif" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                        Accès Prioritaire
                    </div>
                    <h1>Tableau de bord / {user?.fullName}</h1>
                    <p>Gestion critique des accès et sécurité du système SIRER</p>
                </div>
                <div className="dashboard-header-pills" style={{ alignItems: 'center' }}>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}
                        title="Déconnexion sécurisée"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span style={{ fontWeight: 700 }}>Déconnexion</span>
                    </button>
                </div>
            </header>

            {message.text && (
                <div className={`badge badge-${message.type === 'success' ? 'actif' : 'radie'}`} style={{ marginBottom: '1rem', padding: '1rem', width: '100%', borderRadius: '8px' }}>
                    {message.text}
                </div>
            )}

            {editingUser ? (
                <div className="card">
                    <h2>Réinitialiser le mot de passe pour {editingUser.fullName}</h2>
                    <form onSubmit={handleResetPassword}>
                        <div className="form-group">
                            <label>Nouveau mot de passe</label>
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Entrez le nouveau mot de passe"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary">Enregistrer le nouveau mot de passe</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Annuler</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="card">
                    <h2>Liste des utilisateurs du système</h2>
                    {loading ? (
                        <p>Chargement…</p>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nom Complet</th>
                                        <th>Email</th>
                                        <th>Rôle</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td>{u.fullName}</td>
                                            <td>{u.email}</td>
                                            <td>{u.role}</td>
                                            <td>
                                                <span className={`badge badge-${u.isActive ? 'actif' : 'radie'}`}>
                                                    {u.isActive ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-accent btn-sm"
                                                    onClick={() => setEditingUser(u)}
                                                    disabled={u.role === 'SUPER_ADMIN'}
                                                >
                                                    Changer mot de passe
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
