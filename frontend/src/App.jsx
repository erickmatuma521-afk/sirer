import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Beneficiaries from './pages/Beneficiaries';
import BeneficiaryForm from './pages/BeneficiaryForm';
import BeneficiaryDetail from './pages/BeneficiaryDetail';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Users from './pages/Users';
import Grades from './pages/Grades';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Verification from './pages/Verification';
import BeneficiaryPortal from './pages/BeneficiaryPortal';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="main">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  // Redirect SuperAdmin away from regular layout if they shouldn't be here
  if (user.role === 'SUPER_ADMIN' && !roles?.includes('SUPER_ADMIN') && window.location.pathname !== '/super-admin') {
    return <Navigate to="/super-admin" replace />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/super-admin"
        element={
          <PrivateRoute roles={['SUPER_ADMIN']}>
            <SuperAdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={user?.role === 'SUPER_ADMIN' ? <Navigate to="/super-admin" replace /> : <Dashboard />} />
        <Route path="beneficiaries" element={<Beneficiaries />} />
        <Route path="beneficiaries/new" element={<BeneficiaryForm />} />
        <Route path="beneficiaries/:id" element={<BeneficiaryDetail />} />
        <Route path="beneficiaries/:id/edit" element={<BeneficiaryForm />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<PrivateRoute roles={['ADMIN_CENTRAL']}><Audit /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute roles={['ADMIN_CENTRAL']}><Users /></PrivateRoute>} />
        <Route path="grades" element={<PrivateRoute roles={['ADMIN_CENTRAL']}><Grades /></PrivateRoute>} />
      </Route>
      <Route path="/verification" element={<Verification />} />
      <Route path="/v/:matricule" element={<BeneficiaryPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
