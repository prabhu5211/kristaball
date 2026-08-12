import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Purchases   from './pages/Purchases';
import Transfers   from './pages/Transfers';
import Assignments from './pages/Assignments';
import AuditLogs   from './pages/AuditLogs';
import Admin       from './pages/Admin';

// Protect routes — redirect to /login if not authenticated
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />

      <Route path="/purchases" element={
        <PrivateRoute>
          <Purchases />
        </PrivateRoute>
      } />

      <Route path="/transfers" element={
        <PrivateRoute>
          <Transfers />
        </PrivateRoute>
      } />

      <Route path="/assignments" element={
        <PrivateRoute allowedRoles={['ADMIN', 'BASE_COMMANDER']}>
          <Assignments />
        </PrivateRoute>
      } />

      <Route path="/audit" element={
        <PrivateRoute allowedRoles={['ADMIN']}>
          <AuditLogs />
        </PrivateRoute>
      } />

      <Route path="/admin" element={
        <PrivateRoute allowedRoles={['ADMIN']}>
          <Admin />
        </PrivateRoute>
      } />

      {/* Catch-all */}
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
